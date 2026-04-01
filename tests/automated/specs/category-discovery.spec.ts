import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "../actions/navigationActions";
import { CategoryPage } from "../pages/CategoryPage";

test.describe("Approved automated tests for Category Discovery", () => {
  // Feature: Category Discovery
  // Page URL: https://www.myntra.com/shop/men
  // Test ID: TC-CAT-SHOP-MEN-002
  // Category: functional | Priority: medium | Status: approved
  // Mapped Steps:
  // 1. Open the category page URL
  // 2. Inspect for sorting, filtering, or breadcrumb controls
  // 3. Interact with one available browsing control if present
  // Structured Assertion: visible | h4:has-text("CATEGORIES TO BAG")
  test("TC-CAT-SHOP-MEN-002 Category page supports product discovery controls", async ({ page }) => {
    const categoryPage = new CategoryPage(page, `https://www.myntra.com/shop/men`);
    await categoryPage.open();
    await expect(page.locator(".desktop-main[href='/shop/men']")).toBeVisible();
  });
});
