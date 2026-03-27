import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/automated",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "reports/playwright-raw.json" }]
  ],
  use: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  }
});
