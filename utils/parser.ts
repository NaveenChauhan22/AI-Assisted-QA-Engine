import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type ManualTestSuite,
  type ParsedResults,
  type PlaywrightExecutionFailure,
  type TestPriority
} from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const rawResultsPath = path.join(projectRoot, "reports", "playwright-raw.json");
const parsedResultsPath = path.join(projectRoot, "reports", "results.json");
const manualTestsPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");

interface PlaywrightJsonSpec {
  title?: string;
  file?: string;
  line?: number;
  column?: number;
  tests?: Array<{
    results?: Array<{
      status?: string;
      error?: {
        location?: {
          file?: string;
          line?: number;
          column?: number;
        };
      };
      errorLocation?: {
        file?: string;
        line?: number;
        column?: number;
      };
      errors?: Array<{
        message?: string;
        location?: {
          file?: string;
          line?: number;
          column?: number;
        };
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

type RunMode = "headless" | "headed";

async function readRawReport(): Promise<PlaywrightJsonReport> {
  const content = await readFile(rawResultsPath, "utf-8");
  return JSON.parse(content) as PlaywrightJsonReport;
}

async function readManualSuite(): Promise<ManualTestSuite> {
  const content = await readFile(manualTestsPath, "utf-8");
  return JSON.parse(content) as ManualTestSuite;
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

function normalizeFailureFile(file: string | undefined): string | undefined {
  if (!file) {
    return undefined;
  }

  return file.startsWith(projectRoot) ? path.relative(projectRoot, file) : file;
}

function readRunMode(): RunMode | undefined {
  return process.env.PARSER_RUN_MODE === "headless" || process.env.PARSER_RUN_MODE === "headed"
    ? process.env.PARSER_RUN_MODE
    : undefined;
}

function readBrowsers(): string[] | undefined {
  const browsers = (process.env.PARSER_BROWSERS ?? "")
    .split(",")
    .map((browser) => browser.trim())
    .filter(Boolean);

  return browsers.length > 0 ? browsers : undefined;
}

function readWorkers(): number | undefined {
  const parsed = Number.parseInt(process.env.PARSER_WORKERS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseResults(report: PlaywrightJsonReport, manualSuite: ManualTestSuite): ParsedResults {
  const specs = flattenSpecs(report.suites);
  const failures: PlaywrightExecutionFailure[] = [];
  let passed = 0;
  let failed = 0;
  let highPriorityPassed = 0;
  let highPriorityFailed = 0;
  const manualTestsByTitle = new Map(
    manualSuite.tests.map((test) => [`${test.id} ${test.title}`, test])
  );
  const approvedAutomationTests = manualSuite.tests.filter(
    (test) => test.status === "approved" && test.automationCandidate
  );
  const highPriorityTotal = approvedAutomationTests.filter((test) => test.priority === "high").length;

  for (const spec of specs) {
    const result = spec.tests?.[0]?.results?.[0];
    if (!result) {
      continue;
    }
    const testTitle = spec.title ?? "Unknown test";
    const matchedManualTest = manualTestsByTitle.get(testTitle);
    const priority = matchedManualTest?.priority;

    if (result.status === "passed") {
      passed += 1;
      if (priority === "high") {
        highPriorityPassed += 1;
      }
      continue;
    }

    failed += 1;
    if (priority === "high") {
      highPriorityFailed += 1;
    }
    const firstError = result.errors?.[0];
    const errorLocation = firstError?.location ?? result.error?.location ?? result.errorLocation;

    failures.push({
      test: testTitle,
      reason: normalizeFailureMessage(firstError?.message),
      priority,
      file: normalizeFailureFile(errorLocation?.file ?? spec.file),
      line: errorLocation?.line ?? spec.line,
      column: errorLocation?.column ?? spec.column
    });
  }

  const total = passed + failed;
  const executionStatus = total === 0 ? "no-tests-found" : "completed";
  const releaseDecision = total === 0 || highPriorityFailed > 0 ? "NO-GO" : "GO";
  const releaseDecisionReason = total === 0
    ? "No automated tests were executed. Verify committed specs, filters, and target-site access before trusting this run."
    : highPriorityFailed > 0
      ? `${highPriorityFailed} high-priority test${highPriorityFailed === 1 ? "" : "s"} failed.`
      : "No high-priority failures were detected.";

  return {
    generatedAt: new Date().toISOString(),
    executionStatus,
    runMode: readRunMode(),
    browsers: readBrowsers(),
    workers: readWorkers(),
    total,
    passed,
    failed,
    highPriorityTotal,
    highPriorityPassed,
    highPriorityFailed,
    releaseDecision,
    releaseDecisionReason,
    failures
  };
}

async function main(): Promise<void> {
  const rawReport = await readRawReport();
  const manualSuite = await readManualSuite();
  const parsedResults = parseResults(rawReport, manualSuite);

  await writeFile(parsedResultsPath, `${JSON.stringify(parsedResults, null, 2)}\n`, "utf-8");

  console.log(JSON.stringify({
    generatedAt: parsedResults.generatedAt,
    executionStatus: parsedResults.executionStatus,
    total: parsedResults.total,
    passed: parsedResults.passed,
    failed: parsedResults.failed,
    releaseDecision: parsedResults.releaseDecision,
    output: path.relative(projectRoot, parsedResultsPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown parser error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
