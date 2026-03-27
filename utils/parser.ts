import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { type ParsedResults, type PlaywrightExecutionFailure } from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const rawResultsPath = path.join(projectRoot, "reports", "playwright-raw.json");
const parsedResultsPath = path.join(projectRoot, "reports", "results.json");

interface PlaywrightJsonSpec {
  title?: string;
  tests?: Array<{
    results?: Array<{
      status?: string;
      errors?: Array<{
        message?: string;
      }>;
    }>;
  }>;
}

interface PlaywrightJsonSuite {
  title?: string;
  specs?: PlaywrightJsonSpec[];
  suites?: PlaywrightJsonSuite[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightJsonSuite[];
}

async function readRawReport(): Promise<PlaywrightJsonReport> {
  const content = await readFile(rawResultsPath, "utf-8");
  return JSON.parse(content) as PlaywrightJsonReport;
}

function flattenSpecs(suites: PlaywrightJsonSuite[] = []): PlaywrightJsonSpec[] {
  const specs: PlaywrightJsonSpec[] = [];

  for (const suite of suites) {
    if (suite.specs) {
      specs.push(...suite.specs);
    }

    if (suite.suites) {
      specs.push(...flattenSpecs(suite.suites));
    }
  }

  return specs;
}

function normalizeFailureMessage(message: string | undefined): string {
  if (!message) {
    return "Unknown failure";
  }

  const cleaned = message.replace(/\u001b\[[0-9;]*m/g, "");
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const interestingLine = lines.find((line) =>
    !line.startsWith("Call log:") &&
    !line.startsWith("- ") &&
    !line.startsWith("at ")
  );

  return interestingLine ?? "Unknown failure";
}

function parseResults(report: PlaywrightJsonReport): ParsedResults {
  const specs = flattenSpecs(report.suites);
  const failures: PlaywrightExecutionFailure[] = [];
  let passed = 0;
  let failed = 0;

  for (const spec of specs) {
    const result = spec.tests?.[0]?.results?.[0];
    if (!result) {
      continue;
    }

    if (result.status === "passed") {
      passed += 1;
      continue;
    }

    failed += 1;
    failures.push({
      test: spec.title ?? "Unknown test",
      reason: normalizeFailureMessage(result.errors?.[0]?.message)
    });
  }

  return {
    total: passed + failed,
    passed,
    failed,
    failures
  };
}

async function main(): Promise<void> {
  const rawReport = await readRawReport();
  const parsedResults = parseResults(rawReport);

  await writeFile(parsedResultsPath, `${JSON.stringify(parsedResults, null, 2)}\n`, "utf-8");

  console.log(JSON.stringify({
    total: parsedResults.total,
    passed: parsedResults.passed,
    failed: parsedResults.failed,
    output: path.relative(projectRoot, parsedResultsPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown parser error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
