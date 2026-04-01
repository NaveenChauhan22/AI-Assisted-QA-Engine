import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

type SupportedBrowser = "chromium" | "firefox" | "webkit";

function parseWorkers(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseBrowsers(value: string | undefined): SupportedBrowser[] {
  const allowedBrowsers: SupportedBrowser[] = ["chromium", "firefox", "webkit"];
  const requestedBrowsers = (value ?? "chromium")
    .split(",")
    .map((browser) => browser.trim().toLowerCase())
    .filter((browser): browser is SupportedBrowser => allowedBrowsers.includes(browser as SupportedBrowser));

  return requestedBrowsers.length > 0 ? [...new Set(requestedBrowsers)] : ["chromium"];
}

function buildProjects(browsers: SupportedBrowser[]): NonNullable<PlaywrightTestConfig["projects"]> {
  return browsers.map((browserName) => ({
    name: browserName,
    use: {
      ...devices["Desktop Chrome"],
      browserName
    }
  }));
}

const configuredBrowsers = parseBrowsers(process.env.PLAYWRIGHT_BROWSERS);
const configuredWorkers = parseWorkers(process.env.PLAYWRIGHT_WORKERS);

export default defineConfig({
  testDir: "./tests/automated",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: configuredWorkers,
  reporter: [
    ["list"],
    ["json", { outputFile: "reports/playwright-raw.json" }]
  ],
  projects: buildProjects(configuredBrowsers),
  use: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  }
});
