import {
  type ManualTestCase,
  type PageType,
  type TestCategory
} from "../types/contracts";

type ManualTestInput = Omit<ManualTestCase, "feature"> & { feature?: string };

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeFeatureLabel(value: string): string {
  const normalized = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? toTitleCase(normalized) : "";
}

export function inferFeature(pageType: PageType, title: string, category?: TestCategory): string {
  const normalizedTitle = title.toLowerCase();

  if (pageType === "homepage") {
    if (normalizedTitle.includes("navigation")) {
      return "Homepage Navigation";
    }

    if (normalizedTitle.includes("entry point") || normalizedTitle.includes("browsing transition")) {
      return "Homepage Discovery";
    }

    return "Homepage Experience";
  }

  if (pageType === "category") {
    if (normalizedTitle.includes("listing")) {
      return "Category Listing";
    }

    if (normalizedTitle.includes("discovery control") || category === "functional") {
      return "Category Discovery";
    }

    if (normalizedTitle.includes("product detail") || normalizedTitle.includes("navigation")) {
      return "Product Detail Navigation";
    }

    return "Category Browsing";
  }

  if (pageType === "product") {
    if (normalizedTitle.includes("selection") || normalizedTitle.includes("purchase")) {
      return "Purchase Readiness";
    }

    if (normalizedTitle.includes("media") || normalizedTitle.includes("detail")) {
      return "Product Media";
    }

    return "Product Details";
  }

  return "General UI";
}

export function resolveFeature(
  feature: string | undefined,
  pageType: PageType,
  title: string,
  category?: TestCategory
): string {
  return normalizeFeatureLabel(feature ?? "") || inferFeature(pageType, title, category);
}

export function normalizeManualTest(test: ManualTestInput): ManualTestCase {
  return {
    ...test,
    feature: resolveFeature(test.feature, test.pageType, test.title, test.category)
  };
}

export function slugifyLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";
}
