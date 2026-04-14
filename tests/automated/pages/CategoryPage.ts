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
      '[aria-label*="sort" i]',
      '[aria-label*="filter" i]',
      '[class*="sort"]',
      '[class*="filter"]',
      '[role="navigation"]',
      'select',
      'button'
    ]);
  }

  async openFirstProductDetail(): Promise<void> {
    const productLink = await this.firstProductDetailLink();
    await this.openProductDetailFromLink(productLink);
  }

  async openFirstProductDetailCustom(selector: string): Promise<void> {
    const productLink = await this.firstVisibleLinkForSelector(selector);
    if (!productLink) {
      throw new Error(`Could not find a visible product-detail link for selector "${selector}" on ${this.url}`);
    }

    await this.openProductDetailFromLink(productLink);
  }

  private async firstProductDetailLink(): Promise<Locator> {
    for (const selector of this.productDetailLinkSelectors()) {
      const locator = await this.firstVisibleLinkForSelector(selector);
      if (locator) {
        return locator;
      }
    }

    throw new Error(`Could not find a visible product-detail link on ${this.url}`);
  }

  private async firstVisibleLinkForSelector(selector: string): Promise<Locator | null> {
    const candidates = this.page.locator(selector);
    const count = await candidates.count();

    for (let index = 0; index < count; index += 1) {
      const locator = candidates.nth(index);
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }

    return null;
  }

  private async openProductDetailFromLink(productLink: Locator): Promise<void> {
    const candidateUrl = await this.resolveNavigableUrl(productLink);
    expect(candidateUrl, "Expected a product detail href or src on the category page").toBeTruthy();

    const popupPromise = this.page.waitForEvent("popup", { timeout: 15_000 }).catch(() => null);
    const sameTabPromise = this.page
      .waitForURL((url) => url.toString() !== this.url, { timeout: 15_000 })
      .then(() => this.page)
      .catch(() => null);

    await productLink.click();

    const navigatedPage = await Promise.race([
      popupPromise.then(async (popupPage) => {
        if (!popupPage) {
          return null;
        }

        await popupPage.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
        return popupPage;
      }),
      sameTabPromise
    ]);

    expect(navigatedPage, `Expected product click to open a PDP from ${this.url}`).not.toBeNull();
    await expect(navigatedPage!).not.toHaveURL(this.url);
  }

  private async resolveNavigableUrl(locator: Locator): Promise<string | null> {
    const href = await locator.getAttribute("href").catch(() => null);
    if (href) {
      return href;
    }

    const src = await locator.getAttribute("src").catch(() => null);
    if (src) {
      return src;
    }

    return locator.evaluate((element) => {
      const closestLink = element.closest("a");
      return closestLink?.getAttribute("href") ?? null;
    }).catch(() => null);
  }

  private productListingSelectors(): string[] {
    return [
      'a[href*="/p/"]',
      'a[href*="/product"]',
      'a[href*="/products"]',
      'article',
      '[data-testid*="product"]',
      '[class*="product"]',
      '[class*="item"]',
      'main li',
      'a[href]:has(img)'
    ];
  }

  private productDetailLinkSelectors(): string[] {
    return [
      'main a[href*="/p/"]:has(img)',
      'main a[href*="/product"]:has(img)',
      'main a[href*="/products"]:has(img)',
      'main a:has(img)',
      'article a[href]',
      'a[href]:has(img)',
      'a[href]'
    ];
  }
}
