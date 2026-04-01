import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "../actions/navigationActions";
import { CategoryPage } from "../pages/CategoryPage";

test.describe("Approved automated tests for Homepage Discovery", () => {
  // Feature: Homepage Discovery
  // Page URL: https://www.myntra.com/
  // Test ID: TC-HOM-HOME-002
  // Category: sanity | Priority: medium | Status: approved
  // Mapped Steps:
  // 1. Open the homepage URL
  // 2. Scan the first visible content blocks
  // 3. Inspect category or promotional entry points
  // Structured Assertion: visible | a[href*="/shop/"]
  test("TC-HOM-HOME-002 Homepage highlights major shopping entry points", async ({ page }) => {
    await openPage(page, `https://www.myntra.com/`);
    const visibleLinks = await page.locator('a:visible').count();
    expect(visibleLinks).toBeGreaterThan(5);
    await expectAnyVisible(page, [
      'a[href*="/shop/"]',
      'a[href*="men-"]',
      'a[href*="women-"]',
      'a[href*="kids-"]',
      'img'
    ]);
  });

  // Feature: Homepage Discovery
  // Page URL: https://www.myntra.com/
  // Test ID: TC-HOM-HOME-003
  // Category: functional | Priority: high | Status: approved
  // Mapped Steps:
  // 1. Open the homepage URL
  // 2. Click a visible category or collection link
  // 3. Observe the destination page
  // Structured Assertion: none
  test("TC-HOM-HOME-003 Homepage supports basic browsing transition", async ({ page }) => {
    await openPage(page, `https://www.myntra.com/`);
    const destination = await clickFirstVisibleLink(page, [
      'a[href*="/shop/"]',
      'a[href*="men-"]',
      'a[href*="women-"]',
      'nav a',
      'header a'
    ]);
    await expect(page).not.toHaveURL(`https://www.myntra.com/`);
    expect(destination).not.toBe("");
  });
});
