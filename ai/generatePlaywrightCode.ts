import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { type ManualTestCase, type ManualTestSuite } from "../types/contracts";
import { normalizeManualTest, slugifyLabel } from "../utils/manualTestUtils";

const projectRoot = path.resolve(__dirname, "..");
const manualTestsJsonPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");
const automatedTestsDir = path.join(projectRoot, "tests", "automated");
const automatedSpecsDir = path.join(automatedTestsDir, "specs");

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

function escapeTemplateString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function toSafeTestTitle(test: ManualTestCase): string {
  return `${test.id} ${test.title}`;
}

function toSpecFileName(feature: string): string {
  return `${slugifyLabel(feature)}.spec.ts`;
}

function indentBlock(content: string, spaces: number): string {
  const indent = " ".repeat(spaces);
  return content
    .split("\n")
    .map((line) => (line.length > 0 ? `${indent}${line}` : line))
    .join("\n");
}

function buildStructuredAssertionLine(test: ManualTestCase): string | null {
  const assertion = test.assertion;

  if (!assertion) {
    return null;
  }

  if (assertion.type === "visible") {
    const locator = `page.locator(${JSON.stringify(assertion.selector ?? "")})`;
    return `await expect(${locator}).toBeVisible();`;
  }

  if (assertion.type === "textVisible") {
    const locator = `page.locator(${JSON.stringify(assertion.selector ?? "")})`;
    return `await expect(${locator}).toContainText(${JSON.stringify(assertion.text ?? "")});`;
  }

  if (assertion.type === "exactText") {
    const locator = `page.locator(${JSON.stringify(assertion.selector ?? "")})`;
    return `await expect(${locator}).toHaveText(${JSON.stringify(assertion.text ?? "")});`;
  }

  if (assertion.type === "enabled") {
    const locator = `page.locator(${JSON.stringify(assertion.selector ?? "")})`;
    return `await expect(${locator}).toBeEnabled();`;
  }

  if (assertion.type === "urlContains") {
    return `await expect(page).toHaveURL(new RegExp(${JSON.stringify(assertion.text ?? "")}, "i"));`;
  }

  if (assertion.type === "countAtLeast") {
    const locator = `page.locator(${JSON.stringify(assertion.selector ?? "")})`;
    return `expect(await ${locator}.count()).toBeGreaterThanOrEqual(${assertion.value ?? 1});`;
  }

  return null;
}

function buildMappedStepsComment(test: ManualTestCase): string {
  if (!test.steps.length) {
    return "// Mapped Steps: none";
  }

  return [
    "// Mapped Steps:",
    ...test.steps.map((step, index) => `// ${index + 1}. ${step}`)
  ].join("\n");
}

function buildTestBody(test: ManualTestCase): string {
  const pageUrl = escapeTemplateString(test.pageUrl);
  const title = escapeTemplateString(toSafeTestTitle(test));
  const structuredAssertion = buildStructuredAssertionLine(test);
  const pageOrigin = escapeTemplateString(new URL(test.pageUrl).origin);

  if (test.pageType === "homepage") {
    if (test.id.endsWith("-001")) {
      return `test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  await expect(page).toHaveURL(new RegExp(${JSON.stringify(pageOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))}, "i"));
  await expectAnyVisible(page, [
    "header",
    "nav",
    '[data-testid*="header"]',
    '[class*="header"]',
    '[class*="nav"]'
  ]);
${structuredAssertion ? `  ${structuredAssertion}` : ""}
});`;
    }

    if (test.id.endsWith("-002")) {
      return `test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  const visibleLinks = await page.locator('a:visible').count();
  expect(visibleLinks).toBeGreaterThan(2);
  await expectAnyVisible(page, [
    'main a',
    'nav a',
    'header a',
    '[role="navigation"] a',
    'img'
  ]);
${structuredAssertion ? `  ${structuredAssertion}` : ""}
});`;
    }

    return `test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  const destination = await clickFirstVisibleLink(page, [
    'main a',
    'nav a',
    'header a',
    'a[href]'
  ]);
  await expect(page).not.toHaveURL(\`${pageUrl}\`);
  expect(destination).not.toBe("");
${structuredAssertion ? `  ${structuredAssertion}` : ""}
});`;
  }

  if (test.pageType === "category") {
    if (test.id.endsWith("-001")) {
      return `test(${JSON.stringify(title)}, async ({ page }) => {
  const categoryPage = new CategoryPage(page, \`${pageUrl}\`);
  await categoryPage.open();
  const listingCount = await categoryPage.countProductListings();
  expect(listingCount).toBeGreaterThan(0);
${structuredAssertion ? `  ${structuredAssertion}` : ""}
});`;
    }

    if (test.id.endsWith("-002")) {
      return `test(${JSON.stringify(title)}, async ({ page }) => {
  const categoryPage = new CategoryPage(page, \`${pageUrl}\`);
  await categoryPage.open();
  await categoryPage.expectDiscoveryControls();
${structuredAssertion ? `  ${structuredAssertion}` : ""}
});`;
    }

    return `test(${JSON.stringify(title)}, async ({ page }) => {
  const categoryPage = new CategoryPage(page, \`${pageUrl}\`);
  await categoryPage.open();
  await categoryPage.openFirstProductDetail();
${structuredAssertion ? `  ${structuredAssertion}` : ""}
});`;
  }

  return `test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
${structuredAssertion ? `  ${structuredAssertion}` : `  await expect(page.locator("body")).toContainText(/.+/);`}
});`;
}

function buildTestSection(test: ManualTestCase): string {
  const metadata = [
    `// Feature: ${test.feature}`,
    `// Page URL: ${test.pageUrl}`,
    `// Test ID: ${test.id}`,
    `// Category: ${test.category} | Priority: ${test.priority} | Status: ${test.status}`,
    buildMappedStepsComment(test),
    test.assertion
      ? `// Structured Assertion: ${[
          test.assertion.type,
          test.assertion.selector,
          test.assertion.text,
          test.assertion.value
        ]
          .filter((value) => value !== undefined && value !== "")
          .join(" | ")}`
      : "// Structured Assertion: none"
  ].join("\n");

  return `${metadata}
${buildTestBody(test)}`;
}

function buildSpecContent(feature: string, approvedTests: ManualTestCase[]): string {
  const testSections = approvedTests
    .sort((left, right) => left.pageUrl.localeCompare(right.pageUrl) || left.id.localeCompare(right.id))
    .map((test) => indentBlock(buildTestSection(test), 2))
    .join("\n\n");

  return `import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "../actions/navigationActions";
import { CategoryPage } from "../pages/CategoryPage";

test.describe(${JSON.stringify(`Approved automated tests for ${feature}`)}, () => {
${testSections}
});
`;
}

async function cleanGeneratedSpecFiles(): Promise<void> {
  await mkdir(automatedSpecsDir, { recursive: true });
  const rootEntries = await readdir(automatedTestsDir, { withFileTypes: true });
  const specEntries = await readdir(automatedSpecsDir, { withFileTypes: true }).catch(() => []);

  await Promise.all(
    [
      ...rootEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts"))
        .map((entry) => unlink(path.join(automatedTestsDir, entry.name))),
      ...specEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts"))
        .map((entry) => unlink(path.join(automatedSpecsDir, entry.name)))
    ]
  );
}

function groupTestsByFeature(tests: ManualTestCase[]): Map<string, ManualTestCase[]> {
  const groupedTests = new Map<string, ManualTestCase[]>();

  for (const test of tests) {
    const existingGroup = groupedTests.get(test.feature) ?? [];
    existingGroup.push(test);
    groupedTests.set(test.feature, existingGroup);
  }

  return new Map(
    [...groupedTests.entries()].sort(([leftFeature], [rightFeature]) => leftFeature.localeCompare(rightFeature))
  );
}

async function main(): Promise<void> {
  const suite = await readManualTestSuite();
  const approvedTests = suite.tests.filter((test) => test.status === "approved" && test.automationCandidate);

  if (approvedTests.length === 0) {
    throw new Error("No approved automation-candidate tests found in manual-testcases.json");
  }

  const groupedTests = groupTestsByFeature(approvedTests);
  await cleanGeneratedSpecFiles();

  const outputs: string[] = [];

  for (const [feature, featureTests] of groupedTests) {
    const specPath = path.join(automatedSpecsDir, toSpecFileName(feature));
    const content = buildSpecContent(feature, featureTests);

    await writeFile(specPath, content, "utf-8");
    outputs.push(path.relative(projectRoot, specPath));
  }

  console.log(
    JSON.stringify(
      {
        approvedTests: approvedTests.length,
        generatedSpecFiles: outputs.length,
        outputs
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Playwright code generation error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
