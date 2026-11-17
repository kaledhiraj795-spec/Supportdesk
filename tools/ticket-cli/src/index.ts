import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { convertCsvToTickets } from "./csv-to-json";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] ?? "data/tickets.json";

  if (!inputPath) {
    throw new Error(
      "Usage: npm start -- <input.csv> [output.json]"
    );
  }

  let csvContent: string;

  try {
    csvContent = await readFile(inputPath, "utf8");
  } catch (error: unknown) {
    const details =
      error instanceof Error ? error.message : "Unknown error";

    throw new Error(`Cannot read input file "${inputPath}": ${details}`);
  }

  const tickets = convertCsvToTickets(csvContent);
  const absoluteOutputPath = path.resolve(outputPath);

  try {
    await writeFile(
      absoluteOutputPath,
      `${JSON.stringify(tickets, null, 2)}\n`,
      "utf8"
    );
  } catch (error: unknown) {
    const details =
      error instanceof Error ? error.message : "Unknown error";

    throw new Error(
      `Cannot write output file "${absoluteOutputPath}": ${details}`
    );
  }

  console.log(
    `Converted ${tickets.length} ticket(s). JSON saved to: ${absoluteOutputPath}`
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown error";

  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
