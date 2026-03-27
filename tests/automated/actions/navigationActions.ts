import { expect, type Locator, type Page } from "@playwright/test";

export async function openPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

export async function firstVisibleLocator(page: Page, selectors: string[]): Promise<Locator | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }
  }

  return null;
}

export async function expectAnyVisible(page: Page, selectors: string[]): Promise<void> {
  const locator = await firstVisibleLocator(page, selectors);
  expect(locator, `Expected at least one visible selector from: ${selectors.join(", ")}`).not.toBeNull();
}

export async function clickFirstVisibleLink(page: Page, selectors: string[]): Promise<string> {
  const locator = await firstVisibleLocator(page, selectors);
  expect(locator, `Expected a clickable element from: ${selectors.join(", ")}`).not.toBeNull();

  const href = await locator!.getAttribute("href");
  await locator!.click();
  await page.waitForLoadState("domcontentloaded");
  return href ?? "";
}
