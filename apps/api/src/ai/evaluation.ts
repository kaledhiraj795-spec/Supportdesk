import { z } from "zod";
import {
  AI_TICKET_CATEGORIES,
  AI_TICKET_PRIORITIES,
  ticketAiSuggestionSchema,
  type TicketAiSuggestion
} from "./ai.schemas";

const expectedLabelSchema = z.object({
  category: z.enum(AI_TICKET_CATEGORIES),
  priority: z.enum(AI_TICKET_PRIORITIES)
}).strict();

export const createEvaluationDatasetSchema = (descriptionLimit: number) =>
  z.array(z.object({
    id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,100}$/),
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(descriptionLimit),
    expected: expectedLabelSchema
  }).strict()).length(20).superRefine((tickets, context) => {
    const ids = new Set<string>();
    tickets.forEach((ticket, index) => {
      if (ids.has(ticket.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Evaluation ticket IDs must be unique."
        });
      }
      ids.add(ticket.id);
    });
  });

export type EvaluationTicket = {
  id: string;
  title: string;
  description: string;
  expected: TicketAiSuggestion;
};

export type EvaluationResult = {
  id: string;
  expected: TicketAiSuggestion;
  predicted: TicketAiSuggestion | null;
};

export type EvaluationMetrics = {
  total: number;
  categoryCorrect: number;
  priorityCorrect: number;
  exactMatchCorrect: number;
  categoryAccuracyPercent: number;
  priorityAccuracyPercent: number;
  exactMatchAccuracyPercent: number;
};

const accuracyPercent = (correct: number, total: number): number =>
  total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));

export function calculateEvaluationMetrics(
  results: readonly EvaluationResult[]
): EvaluationMetrics {
  const categoryCorrect = results.filter(
    ({ expected, predicted }) => predicted?.category === expected.category
  ).length;
  const priorityCorrect = results.filter(
    ({ expected, predicted }) => predicted?.priority === expected.priority
  ).length;
  const exactMatchCorrect = results.filter(
    ({ expected, predicted }) =>
      predicted?.category === expected.category &&
      predicted.priority === expected.priority
  ).length;

  return {
    total: results.length,
    categoryCorrect,
    priorityCorrect,
    exactMatchCorrect,
    categoryAccuracyPercent: accuracyPercent(categoryCorrect, results.length),
    priorityAccuracyPercent: accuracyPercent(priorityCorrect, results.length),
    exactMatchAccuracyPercent: accuracyPercent(exactMatchCorrect, results.length)
  };
}

export async function evaluateTickets(
  tickets: readonly EvaluationTicket[],
  predict: (ticket: EvaluationTicket) => Promise<TicketAiSuggestion>
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  for (const ticket of tickets) {
    try {
      const prediction = ticketAiSuggestionSchema.parse(await predict(ticket));
      results.push({ id: ticket.id, expected: ticket.expected, predicted: prediction });
    } catch {
      results.push({ id: ticket.id, expected: ticket.expected, predicted: null });
    }
  }
  return results;
}

export function formatEvaluationReport(
  results: readonly EvaluationResult[],
  evaluatedAt: Date
): string {
  const metrics = calculateEvaluationMetrics(results);
  const lines = [
    "# Day 17 AI Evaluation Report",
    "",
    `- Evaluated at: ${evaluatedAt.toISOString()}`,
    `- Dataset size: ${metrics.total}`,
    "- Dataset: lead-provided labelled tickets (input file is not copied into this report)",
    "",
    "## Accuracy",
    "",
    "| Measure | Correct | Total | Accuracy |",
    "|---|---:|---:|---:|",
    `| Category | ${metrics.categoryCorrect} | ${metrics.total} | ${metrics.categoryAccuracyPercent}% |`,
    `| Priority | ${metrics.priorityCorrect} | ${metrics.total} | ${metrics.priorityAccuracyPercent}% |`,
    `| Exact category + priority | ${metrics.exactMatchCorrect} | ${metrics.total} | ${metrics.exactMatchAccuracyPercent}% |`,
    "",
    "Accuracy = correct predictions / evaluated tickets × 100. Failed or invalid predictions count as incorrect.",
    "",
    "## Per-ticket results",
    "",
    "| Ticket ID | Expected category | Expected priority | Predicted category | Predicted priority | Result |",
    "|---|---|---|---|---|---|",
    ...results.map(({ id, expected, predicted }) =>
      `| ${id} | ${expected.category} | ${expected.priority} | ${predicted?.category ?? "FAILED"} | ${predicted?.priority ?? "FAILED"} | ${predicted?.category === expected.category && predicted.priority === expected.priority ? "PASS" : "FAIL"} |`
    ),
    "",
    "Ticket content and provider error details are intentionally excluded from this report.",
    ""
  ];
  return lines.join("\n");
}
