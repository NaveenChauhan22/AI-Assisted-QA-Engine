import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "../actions/navigationActions";
import { CategoryPage } from "../pages/CategoryPage";

test.describe("Approved automated tests for Category Listing", () => {
  // Feature: Category Listing
  // Page URL: https://www.myntra.com/men-topwear
  // Test ID: TC-CAT-MEN-TOPWEAR-001
  // Category: smoke | Priority: high | Status: approved
  // Mapped Steps:
  // 1. Open the category page URL
  // 2. Wait for the listing content to render
  // 3. Inspect the visible product grid or list area
  // Structured Assertion: visible | a[href*="/buy"]
  test("TC-CAT-MEN-TOPWEAR-001 Category page loads product listing content", async ({ page }) => {
    const categoryPage = new CategoryPage(page, `https://www.myntra.com/men-topwear`);
    await categoryPage.open();
    const listingCount = await categoryPage.countProductListings();
    expect(listingCount).toBeGreaterThan(0);
  });

  // Feature: Category Listing
  // Page URL: https://www.myntra.com/shop/men
  // Test ID: TC-CAT-SHOP-MEN-001
  // Category: smoke | Priority: high | Status: approved
  // Mapped Steps:
  // 1. Open the category page URL
  // 2. Wait for the listing content to render
  // 3. Inspect the visible product grid or list area
  // Structured Assertion: visible | h4:has-text("BIGGEST DEALS ON TOP BRANDS")
  test("TC-CAT-SHOP-MEN-001 Category page loads product listing content", async ({ page }) => {
    const categoryPage = new CategoryPage(page, `https://www.myntra.com/shop/men`);
    await categoryPage.open();
    const listingCount = await categoryPage.countProductListings();
    expect(listingCount).toBeGreaterThan(0);
  });
});
