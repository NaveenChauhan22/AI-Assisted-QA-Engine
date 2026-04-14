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

function buildTestRows(tests: ManualTestCase[]): Array<Record<string, string | boolean | number>> {
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
    assertionType: test.assertion?.type ?? "",
    assertionSelector: test.assertion?.selector ?? "",
    assertionText: test.assertion?.text ?? "",
    assertionValue: test.assertion?.value ?? "",
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

function applyAssertionTypeValidation(worksheet: ExcelJS.Worksheet): void {
  applyListValidation(
    worksheet,
    "assertionType",
    ['"visible,textVisible,exactText,urlContains,countAtLeast,enabled"'],
    "Invalid Assertion Type",
    "Select one of: visible, textVisible, exactText, urlContains, countAtLeast, enabled."
  );
}

function applyStatusValidation(worksheet: ExcelJS.Worksheet): void {
  applyListValidation(
    worksheet,
    "status",
    ['"draft,reviewed,approved"'],
    "Invalid Status",
    "Select one of: draft, reviewed, approved."
  );
}

function applyCategoryValidation(worksheet: ExcelJS.Worksheet): void {
  applyListValidation(
    worksheet,
    "category",
    ['"smoke,sanity,functional,regression"'],
    "Invalid Category",
    "Select one of: smoke, sanity, functional, regression."
  );
}

function applyPriorityValidation(worksheet: ExcelJS.Worksheet): void {
  applyListValidation(
    worksheet,
    "priority",
    ['"high,medium,low"'],
    "Invalid Priority",
    "Select one of: high, medium, low."
  );
}

function applySourceValidation(worksheet: ExcelJS.Worksheet): void {
  applyListValidation(
    worksheet,
    "source",
    ['"template,ai,manual"'],
    "Invalid Source",
    "Select one of: template, ai, manual."
  );
}

function applyAutomationCandidateValidation(worksheet: ExcelJS.Worksheet): void {
  applyListValidation(
    worksheet,
    "automationCandidate",
    ['"TRUE,FALSE"'],
    "Invalid Automation Candidate",
    "Select either TRUE or FALSE."
  );
}

function applyListValidation(
  worksheet: ExcelJS.Worksheet,
  columnKey: string,
  formulae: string[],
  errorTitle: string,
  error: string
): void {
  const column = worksheet.getColumn(columnKey);
  const columnLetter = column?.letter;

  if (!column || !columnLetter || worksheet.rowCount < 2) {
    return;
  }

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    worksheet.getCell(`${columnLetter}${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae,
      showErrorMessage: true,
      errorTitle,
      error
    };
  }
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
    [24, 42, 14, 24, 44, 14, 12, 72, 60, 16, 42, 28, 14, 20, 14, 14]
  );
  applyAssertionTypeValidation(testsWorksheet);
  applyStatusValidation(testsWorksheet);
  applyCategoryValidation(testsWorksheet);
  applyPriorityValidation(testsWorksheet);
  applySourceValidation(testsWorksheet);
  applyAutomationCandidateValidation(testsWorksheet);
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
