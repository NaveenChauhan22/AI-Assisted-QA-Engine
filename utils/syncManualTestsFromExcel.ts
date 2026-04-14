import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import {
  type ManualTestCase,
  type ManualTestStatus,
  type ManualTestSource,
  type ManualTestSuite,
  type PageType,
  type StructuredAssertionType,
  type TestCategory,
  type TestPriority
} from "../types/contracts";
import { normalizeManualTest, normalizeStructuredAssertion, resolveFeature } from "./manualTestUtils";

const projectRoot = path.resolve(__dirname, "..");
const manualTestsJsonPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");
const manualTestsExcelPath = path.join(projectRoot, "tests", "manual", "manual-testcases.xlsx");

const allowedStatuses: ManualTestStatus[] = ["draft", "reviewed", "approved"];
const allowedCategories: TestCategory[] = ["smoke", "sanity", "functional", "regression"];
const allowedPriorities: TestPriority[] = ["high", "medium", "low"];
const allowedPageTypes: PageType[] = ["homepage", "category", "product", "unknown"];
const allowedSources: ManualTestSource[] = ["ai", "template", "manual"];
const allowedAssertionTypes: StructuredAssertionType[] = [
  "visible",
  "textVisible",
  "exactText",
  "urlContains",
  "countAtLeast",
  "enabled"
];

type RowRecord = Record<string, string>;

async function readExistingSuite(): Promise<ManualTestSuite> {
  const content = await readFile(manualTestsJsonPath, "utf-8");
  const parsed = JSON.parse(content) as ManualTestSuite;

  if (!parsed.seedUrl || !Array.isArray(parsed.tests)) {
    throw new Error(`Invalid manual test suite JSON in ${manualTestsJsonPath}`);
  }

  return parsed;
}

function normalizeCellValue(value: ExcelJS.CellValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value && value.result !== undefined && value.result !== null) {
      return String(value.result);
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }

  return String(value).trim();
}

function worksheetToRecords(worksheet: ExcelJS.Worksheet): RowRecord[] {
  const rows = worksheet.getSheetValues().slice(1);
  const headersRow = rows[0];

  if (!Array.isArray(headersRow)) {
    throw new Error(`Worksheet "${worksheet.name}" is missing a header row.`);
  }

  const headers = headersRow
    .slice(1)
    .map((value) => normalizeCellValue(value as ExcelJS.CellValue))
    .filter(Boolean);

  const records: RowRecord[] = [];

  for (const rawRow of rows.slice(1)) {
    if (!Array.isArray(rawRow)) {
      continue;
    }

    const values = rawRow.slice(1).map((value) => normalizeCellValue(value as ExcelJS.CellValue));
    const hasContent = values.some((value) => value !== "");

    if (!hasContent) {
      continue;
    }

    const record: RowRecord = {};

    for (const [index, header] of headers.entries()) {
      record[header] = values[index] ?? "";
    }

    records.push(record);
  }

  return records;
}

function parseSteps(stepsText: string): string[] {
  return stepsText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function normalizeBoolean(value: string, fallback: boolean): boolean {
  const normalized = value.trim().toLowerCase();

  if (["true", "yes", "y", "1"].includes(normalized)) {
    return true;
  }

  if (["false", "no", "n", "0"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeEnumValue<T extends string>(value: string, allowed: T[], fallback: T): T {
  const normalized = value.trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function assertionFromRecord(record: RowRecord, existing?: ManualTestCase["assertion"]): ManualTestCase["assertion"] {
  const hasAssertionColumns = ["assertionType", "assertionSelector", "assertionText", "assertionValue"].some(
    (field) => field in record
  );

  if (!hasAssertionColumns) {
    return existing;
  }

  const typeValue = record.assertionType?.trim() ?? "";
  const selectorValue = record.assertionSelector?.trim() ?? "";
  const textValue = record.assertionText?.trim() ?? "";
  const valueText = record.assertionValue?.trim() ?? "";

  if (!typeValue && !selectorValue && !textValue && !valueText) {
    return undefined;
  }

  const assertionType = normalizeEnumValue(typeValue, allowedAssertionTypes, "visible");

  return normalizeStructuredAssertion({
    type: assertionType,
    selector: selectorValue,
    text: textValue,
    value: valueText === "" ? undefined : Number(valueText)
  });
}

function mergeRowIntoTest(record: RowRecord, existing: ManualTestCase): ManualTestCase {
  return normalizeManualTest({
    id: record.id?.trim() || existing.id,
    pageUrl: record.pageUrl?.trim() || existing.pageUrl,
    pageType: normalizeEnumValue(record.pageType ?? "", allowedPageTypes, existing.pageType),
    feature: record.feature?.trim() || existing.feature,
    title: record.title?.trim() || existing.title,
    category: normalizeEnumValue(record.category ?? "", allowedCategories, existing.category),
    priority: normalizeEnumValue(record.priority ?? "", allowedPriorities, existing.priority),
    steps: record.steps ? parseSteps(record.steps) : existing.steps,
    expectedResult: record.expectedResult?.trim() || existing.expectedResult,
    assertion: assertionFromRecord(record, existing.assertion),
    automationCandidate: normalizeBoolean(record.automationCandidate ?? "", existing.automationCandidate),
    status: normalizeEnumValue(record.status ?? "", allowedStatuses, existing.status),
    source: normalizeEnumValue(record.source ?? "", allowedSources, existing.source)
  });
}

function createManualTestFromRow(record: RowRecord): ManualTestCase {
  const id = record.id?.trim();
  const pageUrl = record.pageUrl?.trim();
  const title = record.title?.trim();
  const expectedResult = record.expectedResult?.trim();
  const steps = parseSteps(record.steps ?? "");

  if (!id || !pageUrl || !title || !expectedResult || steps.length === 0) {
    throw new Error(`New workbook row "${id || "<missing id>"}" is missing required values.`);
  }

  const pageType = normalizeEnumValue(record.pageType ?? "", allowedPageTypes, "unknown");
  const category = normalizeEnumValue(record.category ?? "", allowedCategories, "functional");

  return normalizeManualTest({
    id,
    pageUrl,
    pageType,
    feature: resolveFeature(record.feature?.trim(), pageType, title, category),
    title,
    category,
    priority: normalizeEnumValue(record.priority ?? "", allowedPriorities, "medium"),
    steps,
    expectedResult,
    assertion: assertionFromRecord(record),
    automationCandidate: normalizeBoolean(record.automationCandidate ?? "", true),
    status: normalizeEnumValue(record.status ?? "", allowedStatuses, "draft"),
    source: normalizeEnumValue(record.source ?? "", allowedSources, "manual")
  });
}

async function readWorkbookRecords(): Promise<{ metadata: RowRecord[]; tests: RowRecord[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(manualTestsExcelPath);

  const testsSheet = workbook.getWorksheet("ManualTests");
  if (!testsSheet) {
    throw new Error(`Worksheet "ManualTests" not found in ${manualTestsExcelPath}`);
  }

  const metadataSheet = workbook.getWorksheet("Metadata");

  return {
    tests: worksheetToRecords(testsSheet),
    metadata: metadataSheet ? worksheetToRecords(metadataSheet) : []
  };
}

function metadataValue(rows: RowRecord[], fieldName: string, fallback: string): string {
  return rows.find((row) => row.field === fieldName)?.value?.trim() || fallback;
}

async function writeSuite(suite: ManualTestSuite): Promise<void> {
  await writeFile(manualTestsJsonPath, `${JSON.stringify(suite, null, 2)}\n`, "utf-8");
}

async function main(): Promise<void> {
  const existingSuite = await readExistingSuite();
  existingSuite.tests = existingSuite.tests.map((test) => normalizeManualTest(test));
  const workbookData = await readWorkbookRecords();
  const existingTestsById = new Map(existingSuite.tests.map((test) => [test.id, test]));

  const syncedTests = workbookData.tests.map((record) => {
    const id = record.id?.trim();
    if (!id) {
      throw new Error("Encountered a ManualTests row without an id value.");
    }

    const existingTest = existingTestsById.get(id);
    if (!existingTest) {
      return createManualTestFromRow(record);
    }

    return mergeRowIntoTest(record, existingTest);
  });

  const syncedSuite: ManualTestSuite = {
    seedUrl: metadataValue(workbookData.metadata, "seedUrl", existingSuite.seedUrl),
    generatedAt: metadataValue(workbookData.metadata, "generatedAt", existingSuite.generatedAt),
    generationMode: metadataValue(workbookData.metadata, "generationMode", existingSuite.generationMode) === "ai" ? "ai" : "template",
    total: syncedTests.length,
    tests: syncedTests
  };

  await writeSuite(syncedSuite);

  const reviewedCount = syncedTests.filter((test) => test.status === "reviewed").length;
  const approvedCount = syncedTests.filter((test) => test.status === "approved").length;

  console.log(JSON.stringify({
    seedUrl: syncedSuite.seedUrl,
    totalTests: syncedSuite.total,
    reviewed: reviewedCount,
    approved: approvedCount,
    output: path.relative(projectRoot, manualTestsJsonPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown sync error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
