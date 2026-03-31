export type PageType = "homepage" | "category" | "product" | "unknown";

export interface UrlInput {
  mode: "urls";
  urls: string[];
}

export interface SeedInput {
  seedUrl: string;
  maxUrls?: number;
  excludePathKeywords?: string[];
  browserMode?: "headless" | "headed" | "auto";
}

export interface TargetConfig {
  baseUrl: string;
}

export interface DiscoveredPage {
  url: string;
  pageType: PageType;
}

export interface DiscoveredPagesReport {
  seedUrl: string;
  total: number;
  pages: DiscoveredPage[];
}

export type TestCategory = "smoke" | "sanity" | "functional" | "regression";
export type TestPriority = "high" | "medium" | "low";
export type ManualTestStatus = "draft" | "reviewed" | "approved";
export type ManualTestSource = "ai" | "template" | "manual";
export type StructuredAssertionType = "visible" | "textVisible" | "exactText";

export interface StructuredAssertion {
  type: StructuredAssertionType;
  selector: string;
  text?: string;
}

export interface ManualTestCase {
  id: string;
  pageUrl: string;
  pageType: PageType;
  feature: string;
  title: string;
  category: TestCategory;
  priority: TestPriority;
  steps: string[];
  expectedResult: string;
  assertion?: StructuredAssertion;
  automationCandidate: boolean;
  status: ManualTestStatus;
  source: ManualTestSource;
}

export interface ManualTestSuite {
  seedUrl: string;
  generatedAt: string;
  generationMode: "ai" | "template";
  total: number;
  tests: ManualTestCase[];
}

export interface PlaywrightExecutionFailure {
  test: string;
  reason: string;
  priority?: TestPriority;
  file?: string;
  line?: number;
  column?: number;
}

export interface ParsedResults {
  total: number;
  passed: number;
  failed: number;
  highPriorityTotal: number;
  highPriorityPassed: number;
  highPriorityFailed: number;
  releaseDecision: "GO" | "NO-GO";
  releaseDecisionReason: string;
  failures: PlaywrightExecutionFailure[];
}
