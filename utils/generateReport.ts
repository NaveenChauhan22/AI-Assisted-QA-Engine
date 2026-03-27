import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { type ParsedResults } from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const resultsPath = path.join(projectRoot, "reports", "results.json");
const reportPath = path.join(projectRoot, "reports", "summary.md");

async function readResults(): Promise<ParsedResults> {
  const content = await readFile(resultsPath, "utf-8");
  return JSON.parse(content) as ParsedResults;
}

function buildSummary(results: ParsedResults): string {
  const passRate = results.total === 0 ? 0 : Math.round((results.passed / results.total) * 100);
  const lines = [
    "# Execution Summary",
    "",
    `- Total tests: ${results.total}`,
    `- Passed: ${results.passed}`,
    `- Failed: ${results.failed}`,
    `- Pass rate: ${passRate}%`,
    ""
  ];

  if (results.failures.length === 0) {
    lines.push("## Failures", "", "No failures were detected.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("## Failures", "");

  for (const failure of results.failures) {
    lines.push(`- ${failure.test}`);
    lines.push(`  Reason: ${failure.reason}`);
  }

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const results = await readResults();
  const content = buildSummary(results);

  await writeFile(reportPath, content, "utf-8");

  console.log(JSON.stringify({
    output: path.relative(projectRoot, reportPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown report generation error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
