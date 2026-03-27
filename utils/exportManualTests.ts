import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import { type ManualTestCase, type ManualTestSuite } from "../types/contracts";
import { normalizeManualTest } from "./manualTestUtils";

const projectRoot = path.resolve(__dirname, "..");
const manualTestsJsonPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");
const manualTestsExcelPath = path.join(projectRoot, "tests", "manual", "manual-testcases.xlsx");

async function readManualTestSuite(): Promise<ManualTestSuite> {
  const content = await readFile(manualTestsJsonPath, "utf-8");
  const parsed = JSON.parse(content) as ManualTestSuite;

  if (!parsed.seedUrl || !Array.isArray(parsed.tests)) {
    throw new Error(`Invalid manual test suite JSON in ${manualTestsJsonPath}`);
  }

  return {
    ...parsed,
    total: parsed.tests.length,
    tests: parsed.tests.map((test) => normalizeManualTest(test))
  };
}

function formatSteps(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

function buildTestRows(tests: ManualTestCase[]): Array<Record<string, string | boolean>> {
  return tests.map((test) => ({
    id: test.id,
    pageUrl: test.pageUrl,
    pageType: test.pageType,
    feature: test.feature,
    title: test.title,
    category: test.category,
    priority: test.priority,
    steps: formatSteps(test.steps),
    expectedResult: test.expectedResult,
    automationCandidate: test.automationCandidate,
    status: test.status,
    source: test.source
  }));
}

function buildMetadataRows(suite: ManualTestSuite): Array<Record<string, string | number>> {
  return [
    { field: "seedUrl", value: suite.seedUrl },
    { field: "generatedAt", value: suite.generatedAt },
    { field: "generationMode", value: suite.generationMode },
    { field: "total", value: suite.total }
  ];
}

function populateWorksheet(
  worksheet: ExcelJS.Worksheet,
  rows: Array<Record<string, string | boolean | number>>,
  columnWidths: number[]
): void {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  worksheet.addRow(headers);

  for (const row of rows) {
    worksheet.addRow(headers.map((header) => row[header]));
  }

  worksheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: columnWidths[index] ?? 20
  }));

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function main(): Promise<void> {
  const suite = await readManualTestSuite();
  await mkdir(path.dirname(manualTestsExcelPath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  const testsWorksheet = workbook.addWorksheet("ManualTests");
  const metadataWorksheet = workbook.addWorksheet("Metadata");

  populateWorksheet(
    testsWorksheet,
    buildTestRows(suite.tests),
    [24, 42, 14, 24, 44, 14, 12, 72, 60, 20, 14, 14]
  );
  populateWorksheet(
    metadataWorksheet,
    buildMetadataRows(suite),
    [20, 40]
  );

  await workbook.xlsx.writeFile(manualTestsExcelPath);

  console.log(JSON.stringify({
    seedUrl: suite.seedUrl,
    totalTests: suite.total,
    output: path.relative(projectRoot, manualTestsExcelPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown manual test export error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
