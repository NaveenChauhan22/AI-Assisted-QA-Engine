import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  type DiscoveredPage,
  type DiscoveredPagesReport,
  type ManualTestCase,
  type ManualTestSuite,
  type PageType,
  type TestCategory,
  type TestPriority
} from "../types/contracts";

const projectRoot = path.resolve(__dirname, "..");
const discoveredPagesPath = path.join(projectRoot, "reports", "discovered-pages.json");
const manualTestsPath = path.join(projectRoot, "tests", "manual", "manual-testcases.json");
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

interface LlmGeneratedTestCase {
  title: string;
  category: TestCategory;
  priority: TestPriority;
  steps: string[];
  expectedResult: string;
  automationCandidate: boolean;
}

async function readDiscoveredPages(): Promise<DiscoveredPagesReport> {
  const content = await readFile(discoveredPagesPath, "utf-8");
  const parsed = JSON.parse(content) as DiscoveredPagesReport;

  if (!parsed.seedUrl || !Array.isArray(parsed.pages)) {
    throw new Error(`Invalid discovered pages JSON in ${discoveredPagesPath}`);
  }

  return parsed;
}

async function readExistingManualSuite(): Promise<ManualTestSuite | null> {
  try {
    const content = await readFile(manualTestsPath, "utf-8");
    const parsed = JSON.parse(content) as ManualTestSuite;

    if (!parsed.seedUrl || !Array.isArray(parsed.tests)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function sanitizeSlug(urlString: string): string {
  const url = new URL(urlString);
  const slug = url.pathname === "/" ? "home" : url.pathname.split("/").filter(Boolean).join("-");
  return slug.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "page";
}

function pagePrefix(pageType: PageType): string {
  switch (pageType) {
    case "homepage":
      return "HOM";
    case "category":
      return "CAT";
    case "product":
      return "PDP";
    default:
      return "GEN";
  }
}

function buildTestId(page: DiscoveredPage, index: number): string {
  return `TC-${pagePrefix(page.pageType)}-${sanitizeSlug(page.url).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
}

function templateTestsForPage(page: DiscoveredPage): LlmGeneratedTestCase[] {
  if (page.pageType === "homepage") {
    return [
      {
        title: "Homepage loads key navigation elements",
        category: "smoke",
        priority: "high",
        steps: [
          "Open the homepage URL",
          "Wait for the main page content to render",
          "Observe the global header and top navigation"
        ],
        expectedResult: "The homepage loads successfully and the primary navigation is visible.",
        automationCandidate: true
      },
      {
        title: "Homepage highlights major shopping entry points",
        category: "sanity",
        priority: "medium",
        steps: [
          "Open the homepage URL",
          "Scan the first visible content blocks",
          "Inspect category or promotional entry points"
        ],
        expectedResult: "At least one prominent category or promotional navigation path is visible and clickable.",
        automationCandidate: true
      },
      {
        title: "Homepage supports basic browsing transition",
        category: "functional",
        priority: "high",
        steps: [
          "Open the homepage URL",
          "Click a visible category or collection link",
          "Observe the destination page"
        ],
        expectedResult: "The selected link opens a browseable listing or collection page without errors.",
        automationCandidate: true
      }
    ];
  }

  if (page.pageType === "category") {
    return [
      {
        title: "Category page loads product listing content",
        category: "smoke",
        priority: "high",
        steps: [
          "Open the category page URL",
          "Wait for the listing content to render",
          "Inspect the visible product grid or list area"
        ],
        expectedResult: "The category page loads successfully and product listing content is visible.",
        automationCandidate: true
      },
      {
        title: "Category page supports product discovery controls",
        category: "functional",
        priority: "medium",
        steps: [
          "Open the category page URL",
          "Inspect for sorting, filtering, or breadcrumb controls",
          "Interact with one available browsing control if present"
        ],
        expectedResult: "Browsing controls are visible and at least one control responds without breaking the page.",
        automationCandidate: true
      },
      {
        title: "Category page allows navigation to a product detail page",
        category: "regression",
        priority: "high",
        steps: [
          "Open the category page URL",
          "Click a visible product card or image",
          "Observe the destination page"
        ],
        expectedResult: "Clicking a product listing opens a product detail page or an equivalent product experience.",
        automationCandidate: true
      }
    ];
  }

  if (page.pageType === "product") {
    return [
      {
        title: "Product page shows essential product details",
        category: "smoke",
        priority: "high",
        steps: [
          "Open the product page URL",
          "Wait for the product detail content to load",
          "Inspect the product title, price, and imagery"
        ],
        expectedResult: "The product page shows the core product details such as title, price, and image content.",
        automationCandidate: true
      },
      {
        title: "Product page supports selection before purchase action",
        category: "functional",
        priority: "high",
        steps: [
          "Open the product page URL",
          "Inspect any selectable product options such as size or variant",
          "Try to prepare the page for a purchase action"
        ],
        expectedResult: "Required selection controls are visible and the page guides the user toward a valid purchase action.",
        automationCandidate: true
      },
      {
        title: "Product page maintains stable media and detail interactions",
        category: "regression",
        priority: "medium",
        steps: [
          "Open the product page URL",
          "Interact with product media or detail sections",
          "Observe whether the content remains stable and visible"
        ],
        expectedResult: "Product media and detail sections respond correctly without layout breakage or missing content.",
        automationCandidate: true
      }
    ];
  }

  return [
    {
      title: "Page loads without major UI failures",
      category: "smoke",
      priority: "high",
      steps: [
        "Open the page URL",
        "Wait for the initial content to render",
        "Observe the primary visible content"
      ],
      expectedResult: "The page loads successfully without a visible crash or blank state.",
      automationCandidate: true
    }
  ];
}

function buildPrompt(page: DiscoveredPage): string {
  return [
    "Generate manual UI test cases for a single ecommerce webpage.",
    "Return ONLY valid JSON.",
    "Return an array with 2 to 4 test case objects.",
    "Each object must contain these keys exactly:",
    'title, category, priority, steps, expectedResult, automationCandidate',
    'Allowed category values: "smoke", "sanity", "functional", "regression".',
    'Allowed priority values: "high", "medium", "low".',
    "Steps must be concise human-readable actions.",
    "Use the page type to make the tests context-aware.",
    "Do not mention the website brand in the output.",
    "",
    `Page URL: ${page.url}`,
    `Page Type: ${page.pageType}`
  ].join("\n");
}

function normalizeAiTestCase(candidate: LlmGeneratedTestCase): LlmGeneratedTestCase {
  const categoryValues: TestCategory[] = ["smoke", "sanity", "functional", "regression"];
  const priorityValues: TestPriority[] = ["high", "medium", "low"];

  return {
    title: String(candidate.title ?? "").trim(),
    category: categoryValues.includes(candidate.category) ? candidate.category : "functional",
    priority: priorityValues.includes(candidate.priority) ? candidate.priority : "medium",
    steps: Array.isArray(candidate.steps) ? candidate.steps.map((step) => String(step).trim()).filter(Boolean) : [],
    expectedResult: String(candidate.expectedResult ?? "").trim(),
    automationCandidate: Boolean(candidate.automationCandidate)
  };
}

async function generateTestsWithOpenAi(page: DiscoveredPage): Promise<LlmGeneratedTestCase[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You generate concise manual UI test cases and always return valid JSON."
        },
        {
          role: "user",
          content: buildPrompt(page)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response did not include message content.");
  }

  const parsed = JSON.parse(content) as LlmGeneratedTestCase[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("OpenAI response did not return a test case array.");
  }

  return parsed.map(normalizeAiTestCase).filter((test) => test.title && test.steps.length > 0 && test.expectedResult);
}

async function generateTestsForPage(page: DiscoveredPage): Promise<{ mode: "ai" | "template"; tests: LlmGeneratedTestCase[] }> {
  try {
    const tests = await generateTestsWithOpenAi(page);
    if (tests.length > 0) {
      return { mode: "ai", tests };
    }
  } catch {
    // Fall back to deterministic templates to keep the pipeline usable without API access.
  }

  return { mode: "template", tests: templateTestsForPage(page) };
}

function materializeManualTests(page: DiscoveredPage, generatedTests: LlmGeneratedTestCase[], source: "ai" | "template"): ManualTestCase[] {
  return generatedTests.map((test, index) => ({
    id: buildTestId(page, index),
    pageUrl: page.url,
    pageType: page.pageType,
    title: test.title,
    category: test.category,
    priority: test.priority,
    steps: test.steps,
    expectedResult: test.expectedResult,
    automationCandidate: test.automationCandidate,
    status: "draft",
    source
  }));
}

async function writeManualTests(suite: ManualTestSuite): Promise<void> {
  await mkdir(path.dirname(manualTestsPath), { recursive: true });
  await writeFile(manualTestsPath, `${JSON.stringify(suite, null, 2)}\n`, "utf-8");
}

async function main(): Promise<void> {
  const discoveredPages = await readDiscoveredPages();
  const existingSuite = await readExistingManualSuite();
  const existingTestsById = new Map((existingSuite?.tests ?? []).map((test) => [test.id, test]));
  const newlyGeneratedTests: ManualTestCase[] = [];
  let generationMode: "ai" | "template" = "template";

  for (const page of discoveredPages.pages) {
    const result = await generateTestsForPage(page);

    if (result.mode === "ai") {
      generationMode = "ai";
    }

    for (const test of materializeManualTests(page, result.tests, result.mode)) {
      if (!existingTestsById.has(test.id)) {
        newlyGeneratedTests.push(test);
      }
    }
  }

  const mergedTests = [
    ...(existingSuite?.tests ?? []),
    ...newlyGeneratedTests
  ];

  const suite: ManualTestSuite = {
    seedUrl: existingSuite?.seedUrl || discoveredPages.seedUrl,
    generatedAt: existingSuite?.generatedAt || new Date().toISOString(),
    generationMode: existingSuite?.generationMode === "ai" || generationMode === "ai" ? "ai" : "template",
    total: mergedTests.length,
    tests: mergedTests
  };

  await writeManualTests(suite);

  console.log(JSON.stringify({
    seedUrl: suite.seedUrl,
    generationMode: suite.generationMode,
    addedTests: newlyGeneratedTests.length,
    totalTests: suite.total,
    output: path.relative(projectRoot, manualTestsPath)
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown test case generation error";
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exitCode = 1;
});
