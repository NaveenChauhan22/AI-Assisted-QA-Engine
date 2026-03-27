import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { type ManualTestCase, type ManualTestSuite } from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const manualTestsJsonPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");
const automatedSpecPath = path.join(projectRoot, "tests", "automated", "approved.spec.ts");

async function readManualTestSuite(): Promise<ManualTestSuite> {
  const content = await readFile(manualTestsJsonPath, "utf-8");
  const parsed = JSON.parse(content) as ManualTestSuite;

  if (!parsed.seedUrl || !Array.isArray(parsed.tests)) {
    throw new Error(`Invalid manual test suite JSON in ${manualTestsJsonPath}`);
  }

  return parsed;
}

function escapeTemplateString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function toSafeTestTitle(test: ManualTestCase): string {
  return `${test.id} ${test.title}`;
}

function buildTestBody(test: ManualTestCase): string {
  const pageUrl = escapeTemplateString(test.pageUrl);
  const title = escapeTemplateString(toSafeTestTitle(test));

  if (test.pageType === "homepage") {
    if (test.id.endsWith("-001")) {
      return `
test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  await expect(page).toHaveURL(/myntra\\.com/);
  await expectAnyVisible(page, [
    "header",
    "nav",
    '[data-testid*="header"]',
    '[class*="header"]',
    '[class*="nav"]'
  ]);
});`;
    }

    if (test.id.endsWith("-002")) {
      return `
test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  const visibleLinks = await page.locator('a:visible').count();
  expect(visibleLinks).toBeGreaterThan(5);
  await expectAnyVisible(page, [
    'a[href*="/shop/"]',
    'a[href*="men-"]',
    'a[href*="women-"]',
    'a[href*="kids-"]',
    'img'
  ]);
});`;
    }

    return `
test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  const destination = await clickFirstVisibleLink(page, [
    'a[href*="/shop/"]',
    'a[href*="men-"]',
    'a[href*="women-"]',
    'nav a',
    'header a'
  ]);
  await expect(page).not.toHaveURL(\`${pageUrl}\`);
  expect(destination).not.toBe("");
});`;
  }

  if (test.pageType === "category") {
    if (test.id.endsWith("-001")) {
      return `
test(${JSON.stringify(title)}, async ({ page }) => {
  const categoryPage = new CategoryPage(page, \`${pageUrl}\`);
  await categoryPage.open();
  const listingCount = await categoryPage.countProductListings();
  expect(listingCount).toBeGreaterThan(0);
});`;
    }

    if (test.id.endsWith("-002")) {
      return `
test(${JSON.stringify(title)}, async ({ page }) => {
  const categoryPage = new CategoryPage(page, \`${pageUrl}\`);
  await categoryPage.open();
  await categoryPage.expectDiscoveryControls();
});`;
    }

    return `
test(${JSON.stringify(title)}, async ({ page }) => {
  const categoryPage = new CategoryPage(page, \`${pageUrl}\`);
  await categoryPage.open();
  await categoryPage.openFirstProductDetail();
});`;
  }

  return `
test(${JSON.stringify(title)}, async ({ page }) => {
  await openPage(page, \`${pageUrl}\`);
  await expect(page.locator("body")).toContainText(/.+/);
});`;
}

function buildSpecContent(approvedTests: ManualTestCase[]): string {
  const testBlocks = approvedTests.map((test) => buildTestBody(test)).join("\n\n");

  return `import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "./actions/navigationActions";
import { CategoryPage } from "./pages/CategoryPage";

test.describe("Approved automated tests", () => {${testBlocks}
});
`;
}

async function main(): Promise<void> {
  const suite = await readManualTestSuite();
  const approvedTests = suite.tests.filter((test) => test.status === "approved" && test.automationCandidate);

  if (approvedTests.length === 0) {
    throw new Error("No approved automation-candidate tests found in manual-testcases.json");
  }

  const content = buildSpecContent(approvedTests);

  await mkdir(path.dirname(automatedSpecPath), { recursive: true });
  await writeFile(automatedSpecPath, content, "utf-8");

  console.log(JSON.stringify({
    approvedTests: approvedTests.length,
    output: path.relative(projectRoot, automatedSpecPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Playwright code generation error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
