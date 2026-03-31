import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type DiscoveredPage,
  type DiscoveredPagesReport,
  type PageType,
  type SeedInput,
  type UrlInput
} from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const seedInputPath = path.join(projectRoot, "input", "seed.json");
const urlsOutputPath = path.join(projectRoot, "input", "urls.json");
const discoveredPagesOutputPath = path.join(projectRoot, "reports", "discovered-pages.json");
const DEFAULT_MAX_URLS = 15;
const DEFAULT_EXCLUDE_KEYWORDS = [
  "login",
  "signin",
  "signup",
  "cart",
  "checkout",
  "order",
  "orders",
  "account",
  "profile",
  "wishlist",
  "help",
  "contact",
  "support",
  "faq",
  "privacy",
  "terms",
  "policy",
  "giftcard"
];
const NAVIGATION_TIMEOUT_MS = 45_000;

type BrowserMode = "headless" | "headed";

async function readSeedInput(): Promise<SeedInput> {
  const content = await readFile(seedInputPath, "utf-8");
  const parsed = JSON.parse(content) as SeedInput;

  if (!parsed.seedUrl) {
    throw new Error(`Missing "seedUrl" in ${seedInputPath}`);
  }

  return parsed;
}

async function readExistingUrls(): Promise<UrlInput> {
  try {
    const content = await readFile(urlsOutputPath, "utf-8");
    const parsed = JSON.parse(content) as UrlInput;

    if (parsed.mode !== "urls" || !Array.isArray(parsed.urls)) {
      return { mode: "urls", urls: [] };
    }

    return parsed;
  } catch {
    return { mode: "urls", urls: [] };
  }
}

function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

function isSameSite(candidate: URL, seed: URL): boolean {
  return candidate.hostname === seed.hostname || candidate.hostname.endsWith(`.${seed.hostname}`);
}

function shouldExclude(url: URL, excludeKeywords: string[]): boolean {
  const pathname = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  const haystack = `${pathname}${search}`;

  if (pathname === "/" || pathname === "") {
    return false;
  }

  if (url.searchParams.has("redirect") || url.searchParams.has("callback")) {
    return true;
  }

  return excludeKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function classifyPage(urlString: string, seed: URL): PageType {
  const url = new URL(urlString);
  const pathname = url.pathname.toLowerCase();
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "";
  const searchableText = `${pathname}${url.search}`.toLowerCase();

  if (url.origin === seed.origin && (pathname === "/" || pathname === "")) {
    return "homepage";
  }

  if (
    pathname.includes("/product") ||
    pathname.includes("/products") ||
    pathname.includes("/item") ||
    pathname.includes("/p/") ||
    pathname.includes("/buy/") ||
    /\/[^/]+\/buy\b/.test(pathname) ||
    /\bpid=/.test(searchableText) ||
    /\bsku=/.test(searchableText)
  ) {
    return "product";
  }

  if (
    pathname.includes("/category") ||
    pathname.includes("/categories") ||
    pathname.includes("/collection") ||
    pathname.includes("/collections") ||
    pathname.includes("/shop") ||
    pathname.includes("/c/") ||
    pathname.includes("/search") ||
    pathname.includes("/catalog") ||
    pathname.includes("/men-") ||
    pathname.includes("/women-") ||
    pathname.includes("/kids-") ||
    pathname.includes("/home-") ||
    pathname.includes("/beauty-")
  ) {
    return "category";
  }

  if (segments.length === 1 && lastSegment.includes("-")) {
    return "category";
  }

  return "unknown";
}

function sortPages(pages: DiscoveredPage[]): DiscoveredPage[] {
  const pageTypePriority: Record<PageType, number> = {
    homepage: 0,
    category: 1,
    product: 2,
    unknown: 3
  };

  return [...pages].sort((left, right) => {
    const typeDifference = pageTypePriority[left.pageType] - pageTypePriority[right.pageType];
    if (typeDifference !== 0) {
      return typeDifference;
    }

    return left.url.localeCompare(right.url);
  });
}

function resolveBrowserModes(browserMode: SeedInput["browserMode"]): BrowserMode[] {
  switch (browserMode) {
    case "headless":
      return ["headless"];
    case "headed":
      return ["headed"];
    case "auto":
    default:
      return ["headless", "headed"];
  }
}

function isRetryableNavigationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("err_http2_protocol_error") ||
    message.includes("net::err_connection_reset") ||
    message.includes("net::err_connection_closed")
  );
}

async function extractLinksWithMode(
  seed: URL,
  mode: BrowserMode,
  maxUrls: number,
  excludeKeywords: string[]
): Promise<DiscoveredPage[]> {
  const browser = await chromium.launch({ headless: mode === "headless" });

  try {
    const page = await browser.newPage();
    await page.goto(seed.toString(), { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors
        .map((anchor) => anchor.getAttribute("href"))
        .filter((href): href is string => Boolean(href))
    );

    const normalizedSeedUrl = normalizeUrl(seed.toString());
    const retainedPages = new Map<string, DiscoveredPage>([
      [normalizedSeedUrl, { url: normalizedSeedUrl, pageType: "homepage" }]
    ]);
    const seenUrls = new Set<string>([normalizedSeedUrl]);

    for (const href of hrefs) {
      try {
        const candidate = new URL(href, seed);

        if (!["http:", "https:"].includes(candidate.protocol)) {
          continue;
        }

        if (!isSameSite(candidate, seed)) {
          continue;
        }

        const normalizedCandidate = normalizeUrl(candidate.toString());
        if (seenUrls.has(normalizedCandidate)) {
          continue;
        }

        seenUrls.add(normalizedCandidate);
        const normalizedUrl = new URL(normalizedCandidate);

        if (shouldExclude(normalizedUrl, excludeKeywords)) {
          continue;
        }

        const pageType = classifyPage(normalizedCandidate, seed);
        if (pageType === "unknown") {
          continue;
        }

        retainedPages.set(normalizedCandidate, {
          url: normalizedCandidate,
          pageType
        });

        if (retainedPages.size >= maxUrls) {
          break;
        }
      } catch {
        continue;
      }
    }

    return sortPages(Array.from(retainedPages.values())).slice(0, maxUrls);
  } finally {
    await browser.close();
  }
}

async function collectLinks(
  seedUrl: string,
  maxUrls: number,
  excludeKeywords: string[],
  browserMode: SeedInput["browserMode"]
): Promise<{ modeUsed: BrowserMode; pages: DiscoveredPage[] }> {
  const seed = new URL(seedUrl);
  const modes = resolveBrowserModes(browserMode);
  let lastError: unknown;

  for (const mode of modes) {
    try {
      const pages = await extractLinksWithMode(seed, mode, maxUrls, excludeKeywords);
      return { modeUsed: mode, pages };
    } catch (error: unknown) {
      lastError = error;

      if (!isRetryableNavigationError(error) || mode === modes[modes.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Crawler failed without a specific error.");
}

async function writeOutputs(seedUrl: string, pages: DiscoveredPage[]): Promise<{ mergedUrlCount: number }> {
  await mkdir(path.dirname(urlsOutputPath), { recursive: true });
  await mkdir(path.dirname(discoveredPagesOutputPath), { recursive: true });

  const existingUrls = await readExistingUrls();
  const mergedUrls = Array.from(new Set([
    ...existingUrls.urls,
    ...pages.map((page) => page.url)
  ]));

  const urlsPayload: UrlInput = {
    mode: "urls",
    urls: mergedUrls
  };

  const discoveredPagesPayload: DiscoveredPagesReport = {
    seedUrl,
    total: pages.length,
    pages
  };

  await writeFile(urlsOutputPath, `${JSON.stringify(urlsPayload, null, 2)}\n`, "utf-8");
  await writeFile(discoveredPagesOutputPath, `${JSON.stringify(discoveredPagesPayload, null, 2)}\n`, "utf-8");

  return { mergedUrlCount: mergedUrls.length };
}

async function main(): Promise<void> {
  const seedInput = await readSeedInput();
  const maxUrls = seedInput.maxUrls ?? DEFAULT_MAX_URLS;
  const excludeKeywords = seedInput.excludePathKeywords ?? DEFAULT_EXCLUDE_KEYWORDS;
  const result = await collectLinks(
    seedInput.seedUrl,
    maxUrls,
    excludeKeywords,
    seedInput.browserMode
  );

  const outputSummary = await writeOutputs(seedInput.seedUrl, result.pages);

  console.log(JSON.stringify({
    seedUrl: seedInput.seedUrl,
    browserModeUsed: result.modeUsed,
    discovered: result.pages.length,
    mergedUrls: outputSummary.mergedUrlCount,
    outputs: {
      urls: path.relative(projectRoot, urlsOutputPath),
      discoveredPages: path.relative(projectRoot, discoveredPagesOutputPath)
    }
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown crawler error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
