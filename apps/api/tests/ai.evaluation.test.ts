import { describe, expect, it, vi } from "vitest";
import {
  calculateEvaluationMetrics,
  createEvaluationDatasetSchema,
  evaluateTickets,
  formatEvaluationReport,
  type EvaluationResult,
  type EvaluationTicket
} from "../src/ai/evaluation";

const expected = { category: "Account" as const, priority: "P2" as const };

describe("AI evaluation utilities", () => {
  it("requires exactly 20 unique labelled rows (synthetic schema fixture only)", () => {
    const schema = createEvaluationDatasetSchema(4000);
    const fixtureRows = Array.from({ length: 20 }, (_, index) => ({
      id: `fixture-${index + 1}`,
      title: "Synthetic test fixture",
      description: "Not lead-provided evaluation data.",
      expected
    }));

    expect(schema.safeParse(fixtureRows).success).toBe(true);
    expect(schema.safeParse(fixtureRows.slice(1)).success).toBe(false);
    expect(schema.safeParse([
      ...fixtureRows.slice(0, 19),
      { ...fixtureRows[19], id: fixtureRows[0].id }
    ]).success).toBe(false);
  });

  it("calculates category, priority, and exact-match accuracy separately", () => {
    const results: EvaluationResult[] = [
      { id: "fixture-1", expected, predicted: expected },
      {
        id: "fixture-2",
        expected,
        predicted: { category: "Account", priority: "P1" }
      }
    ];

    expect(calculateEvaluationMetrics(results)).toEqual({
      total: 2,
      categoryCorrect: 2,
      priorityCorrect: 1,
      exactMatchCorrect: 1,
      categoryAccuracyPercent: 100,
      priorityAccuracyPercent: 50,
      exactMatchAccuracyPercent: 50
    });
  });

  it("attempts every evaluation ticket and counts provider failures as invalid predictions", async () => {
    const tickets: EvaluationTicket[] = ["fixture-a", "fixture-b", "fixture-c"].map((id) => ({
      id,
      title: "Synthetic test fixture",
      description: "Not lead-provided evaluation data.",
      expected
    }));
    const predict = vi.fn(async (ticket: EvaluationTicket) => {
      if (ticket.id === "fixture-b") throw new Error("provider unavailable");
      return expected;
    });

    const results = await evaluateTickets(tickets, predict);

    expect(predict).toHaveBeenCalledTimes(3);
    expect(results.map(({ predicted }) => predicted)).toEqual([
      expected,
      null,
      expected
    ]);
  });

  it("prints a reproducible metric formula and excludes ticket text", () => {
    const report = formatEvaluationReport([{
      id: "fixture-1",
      expected,
      predicted: expected
    }], new Date("2026-11-26T00:00:00.000Z"));

    expect(report).toContain("correct predictions / evaluated tickets × 100");
    expect(report).toContain("fixture-1");
    expect(report).not.toContain("Synthetic test fixture");
  });
});
