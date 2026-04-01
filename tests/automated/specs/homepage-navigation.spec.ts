import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "../actions/navigationActions";
import { CategoryPage } from "../pages/CategoryPage";

test.describe("Approved automated tests for Homepage Navigation", () => {
  // Feature: Homepage Navigation
  // Page URL: https://www.myntra.com/
  // Test ID: TC-HOM-HOME-001
  // Category: smoke | Priority: high | Status: approved
  // Mapped Steps:
  // 1. Open the homepage URL
  // 2. Wait for the main page content to render
  // 3. Observe the global header and top navigation
  // Structured Assertion: visible | p.FreeShippingBanner-sidebar-content | UPTO ₹300 OFF
  test("TC-HOM-HOME-001 Homepage loads key navigation elements", async ({ page }) => {
    await openPage(page, `https://www.myntra.com/`);
    await expect(page).toHaveURL(/myntra\.com/);
    await expectAnyVisible(page, [
      "header",
      "nav",
      '[data-testid*="header"]',
      '[class*="header"]',
      '[class*="nav"]'
    ]);
    await expect(page.locator("p.FreeShippingBanner-sidebar-content")).toBeVisible();
    await expect(page.locator("p.FreeShippingBanner-sidebar-content")).toHaveText(/UPTO ₹300 OFF/i);
  });
});
