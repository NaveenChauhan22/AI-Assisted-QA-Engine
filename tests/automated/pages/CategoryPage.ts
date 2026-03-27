import { expect, type Locator, type Page } from "@playwright/test";

import { expectAnyVisible, openPage } from "../actions/navigationActions";

export class CategoryPage {
  constructor(private readonly page: Page, private readonly url: string) {}

  async open(): Promise<void> {
    await openPage(this.page, this.url);
  }

  async countProductListings(): Promise<number> {
    for (const selector of this.productListingSelectors()) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        return count;
      }
    }

    return 0;
  }

  async expectDiscoveryControls(): Promise<void> {
    await expectAnyVisible(this.page, [
      'text=/sort/i',
      'text=/filter/i',
      'text=/breadcrumb/i',
      '[class*="sort"]',
      '[class*="filter"]',
      'select'
    ]);
  }

  async openFirstProductDetail(): Promise<void> {
    const productLink = await this.firstProductDetailLink();
    const href = await productLink.getAttribute("href");
    expect(href, "Expected a product detail href on the category page").toBeTruthy();

    await Promise.all([
      this.page.waitForURL((url) => url.toString() !== this.url, { timeout: 15_000 }),
      productLink.click()
    ]);
  }

  private async firstProductDetailLink(): Promise<Locator> {
    for (const selector of this.productDetailLinkSelectors()) {
      const locator = this.page.locator(selector).first();
      if (await locator.count()) {
        await locator.scrollIntoViewIfNeeded().catch(() => undefined);
        if (await locator.isVisible().catch(() => false)) {
          return locator;
        }
      }
    }

    throw new Error(`Could not find a visible product-detail link on ${this.url}`);
  }

  private productListingSelectors(): string[] {
    return [
      'a[href*="/buy"]',
      'a[href*="/p/"]',
      '[class*="product"]',
      '[class*="item"]'
    ];
  }

  private productDetailLinkSelectors(): string[] {
    return [
      'main a[href*="/buy"]:has(img)',
      'main a[href*="/buy"]',
      'a[href*="/buy"]:has(img)',
      'a[href*="/buy"]'
    ];
  }
}
