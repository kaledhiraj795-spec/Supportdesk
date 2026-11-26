import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { AI_SAFETY_SETTINGS } from "./safety";
import { getGeminiClient } from "./client";
import {
  createEvaluationDatasetSchema,
  evaluateTickets,
  formatEvaluationReport
} from "./evaluation";
import { ticketAiSuggestionSchema } from "./ai.schemas";
import { buildUserContext, SYSTEM_INSTRUCTIONS } from "./prompts/auto-categorise.v1";

const usage = "Usage: npm run ai:evaluate -- <20-labelled-tickets.json> [--report <path>]";

const getReportPath = (args: string[]): string => {
  const reportOption = args.indexOf("--report");
  if (reportOption === -1) {
    return path.resolve(process.cwd(), "../../docs/day-17-evaluation-report.md");
  }
  const reportPath = args[reportOption + 1];
  if (!reportPath || reportPath.startsWith("--")) {
    throw new Error("--report requires a file path.");
  }
  return path.resolve(reportPath);
};

async function main(): Promise<void> {
  const [datasetPath, ...args] = process.argv.slice(2);
  if (!datasetPath || datasetPath.startsWith("--")) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }

  const reportPath = getReportPath(args);
  const rawDataset: unknown = JSON.parse(await readFile(path.resolve(datasetPath), "utf8"));
  const validation = createEvaluationDatasetSchema(
    env.AI_TICKET_DESCRIPTION_MAX_LENGTH
  ).safeParse(rawDataset);
  if (!validation.success) {
    console.error("Dataset must contain exactly 20 unique labelled tickets with valid fields.");
    console.error(validation.error.issues.map((issue) =>
      `${issue.path.join(".")}: ${issue.message}`
    ).join("\n"));
    process.exitCode = 2;
    return;
  }

  const client = getGeminiClient();
  const results = await evaluateTickets(
    validation.data,
    async (ticket) => {
      const response = await client.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: buildUserContext({
          title: ticket.title,
          description: ticket.description,
          status: "",
          priority: "",
          category: ""
        }),
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          responseMimeType: "application/json",
          temperature: 0,
          safetySettings: AI_SAFETY_SETTINGS
        }
      });
      return ticketAiSuggestionSchema.parse(JSON.parse(response.text ?? ""));
    }
  );
  const report = formatEvaluationReport(results, new Date());
  await writeFile(reportPath, report, "utf8");
  console.log(`Evaluation report written to ${reportPath}`);
  const failures = results.filter((result) => result.predicted === null).length;
  if (failures > 0) {
    console.error(`${failures} evaluation request(s) failed or returned invalid output.`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "AI evaluation failed.");
  process.exitCode = 1;
});
