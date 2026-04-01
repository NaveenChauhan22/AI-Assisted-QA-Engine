import { expect, test } from "@playwright/test";

import { clickFirstVisibleLink, expectAnyVisible, openPage } from "../actions/navigationActions";
import { CategoryPage } from "../pages/CategoryPage";

test.describe("Approved automated tests for Product Detail Navigation", () => {
  // Feature: Product Detail Navigation
  // Page URL: https://www.myntra.com/shop/men
  // Test ID: TC-CAT-SHOP-MEN-003
  // Category: regression | Priority: high | Status: approved
  // Mapped Steps:
  // 1. Open the category page URL
  // 2. Click a visible product card or image
  // 3. Observe the destination page
  // Structured Assertion: none
  test("TC-CAT-SHOP-MEN-003 Category page allows navigation to a product detail page", async ({ page }) => {
    const categoryPage = new CategoryPage(page, `https://www.myntra.com/shop/men`);
    await categoryPage.open();
    await categoryPage.openFirstProductDetailCustom('img.image-image.undefined.image-hand[src*="assets"]');
  });
});
