# MVP Usage Guide

This guide explains how to use the AI-Assisted QA Engine MVP from setup through execution and reporting.

## 1. Prerequisites

- Node.js 18+
- npm
- Playwright browser binaries

Install dependencies:

```bash
npm install
npx playwright install
```

Optional:

- add `OPENAI_API_KEY` to `.env` if you want AI-backed manual test generation
- without that key, the framework uses deterministic template generation

## 2. Core Files

Input and working files:

- [`input/seed.json`](../input/seed.json): crawler input and crawl configuration
- [`input/urls.json`](../input/urls.json): persistent merged URL scope
- [`reports/discovered-pages.json`](../reports/discovered-pages.json): latest crawl snapshot
- [`tests/manual/manual-testcases.json`](../tests/manual/manual-testcases.json): machine-readable manual test repository
- [`tests/manual/manual-testcases.xlsx`](../tests/manual/manual-testcases.xlsx): human-editable manual test workbook
- `tests/automated/specs/*.spec.ts`: generated Playwright tests grouped by feature
- [`reports/results.json`](../reports/results.json): parsed execution summary
- [`reports/summary.html`](../reports/summary.html): presentation-friendly HTML report

Important debugging rule:

- use `tests/automated/` as the source of truth for generated automation
- generated spec files live under `tests/automated/specs/`
- ignore `dist/` when debugging or maintaining Playwright tests because it is compiled build output
- `npm run build` intentionally excludes Playwright test sources, so `dist/tests/` should not be part of the workflow

## 3. Reset the Framework

Use reset when you want to start fresh for a different website or clear the current working state.

Command:

```bash
npm run reset
```

This resets:

- `input/seed.json`
- `input/urls.json`
- `reports/discovered-pages.json`
- `reports/results.json`
- `tests/manual/manual-testcases.json`
- generated Excel workbook
- generated automated specs under `tests/automated/`

## 4. Set the Seed URL

Edit [`input/seed.json`](../input/seed.json).

Example:

```json
{
  "seedUrl": "https://example.com/",
  "browserMode": "auto",
  "maxUrls": 15,
  "excludePathKeywords": [
    "login",
    "signin",
    "signup",
    "cart",
    "checkout"
  ]
}
```

Field meanings:

- `seedUrl`: starting page for crawl
- `browserMode`: `auto`, `headless`, or `headed`
- `maxUrls`: max number of URLs discovered during a crawl run
- `excludePathKeywords`: paths or terms to exclude

Detailed parameter behavior:

- `seedUrl`
  The starting URL for a crawl run. This is typically a homepage, section landing page, or another entry point you want the crawler to explore.

- `browserMode`
  Controls how Playwright launches the browser during crawling.
  `auto`: tries headless first and falls back to headed when needed.
  `headless`: runs without opening a visible browser window.
  `headed`: runs with a visible browser window and is often more reliable for sites that resist headless navigation.

- `maxUrls`
  Limits how many URLs are collected in one crawl run. This keeps the MVP focused and prevents a single crawl from creating too much noise.

- `excludePathKeywords`
  A list of substrings used to filter unwanted URLs. If a discovered URL path or query contains one of these values, that URL is excluded.
  This is useful for removing pages like login, cart, account, checkout, support, or other utility flows that are not part of the current crawl scope.

## 5. Run the Crawler

Command:

```bash
npm run crawl
```

What it does:

- opens the seed URL with Playwright
- extracts same-site links
- applies exclusion filters
- classifies pages into basic types
- writes latest crawl snapshot to [`reports/discovered-pages.json`](../reports/discovered-pages.json)
- merges new URLs into [`input/urls.json`](../input/urls.json)

Important behavior:

- repeated crawls do not clear existing `urls.json`
- newly discovered URLs are merged into the existing list

## 6. Update `urls.json` Manually

Users can edit [`input/urls.json`](../input/urls.json) directly.

This is useful when:

- you want to add deep links not found by the crawler
- you want to remove noisy pages
- you want to curate the website scope manually

Recommended format:

```json
{
  "mode": "urls",
  "urls": [
    "https://example.com/",
    "https://example.com/category-a",
    "https://example.com/product-x"
  ]
}
```

Field meanings:

- `mode`
  Currently fixed as `urls`. It indicates that this file is the explicit URL list used as the persistent scoped set of pages.

- `urls`
  The merged and user-curated list of URLs for the target website. Users can add, remove, or reorder entries here.

Recommended usage:

- let the crawler populate this file initially
- manually remove noisy URLs you do not want in scope
- manually add important URLs the crawler missed
- treat this file as the persistent URL inventory for the website

## 7. Generate Manual Test Cases

Command:

```bash
npm run testcases
```

What it does:

- reads the latest discovered pages
- generates multiple manual test cases per page
- saves them into [`tests/manual/manual-testcases.json`](../tests/manual/manual-testcases.json)

Important behavior:

- existing manual test cases are preserved
- only genuinely new test cases are appended
- rerunning generation does not blindly duplicate old test cases

## 8. Export Manual Test Cases to Excel

Command:

```bash
npm run export
```

Output:

- [`tests/manual/manual-testcases.xlsx`](../tests/manual/manual-testcases.xlsx)

This workbook is the human review layer.

## 9. Review and Edit Manual Test Cases in Excel

Open [`tests/manual/manual-testcases.xlsx`](../tests/manual/manual-testcases.xlsx) in Excel or another spreadsheet tool.

Users can:

- update `feature` values to regroup automation output
- update test titles
- change categories and priorities
- change `status`
- delete rows
- add new rows manually

Recommended `status` workflow:

- `draft`: generated, not reviewed
- `reviewed`: checked by a human
- `approved`: ready for automation/code generation

Recommended `source` values:

- `template`
- `ai`
- `manual`

Recommended use:

- keep `reviewed` for validated manual tests
- use `approved` only for tests you want automated

Field meanings in the workbook:

- `id`
  Stable identifier for a test case. This is the primary key used during Excel -> JSON sync. Do not duplicate it across rows.

- `pageUrl`
  The page under test. Multiple test cases can share the same `pageUrl`.

- `pageType`
  Basic page classification used by the framework.
  Current values:
  `homepage`, `category`, `product`, `unknown`

- `title`
  Human-readable test case title.

- `feature`
  Human-editable grouping label used to organize generated automation.
  The framework fills this initially, and reviewers can refine it in Excel.
  Examples:
  `Homepage Navigation`, `Category Discovery`, `Product Detail Navigation`

- `category`
  The testing intent of the case.
  Current values:
  `smoke`, `sanity`, `functional`, `regression`

- `priority`
  Execution or review priority.
  Current values:
  `high`, `medium`, `low`

- `steps`
  Manual test steps. In Excel, keep them readable and line-separated.

- `expectedResult`
  The expected behavior of the test case.

- `automationCandidate`
  Boolean flag that tells the framework whether the case should be considered for automation.
  Use `true` for automation-ready or automation-intended tests.
  Use `false` for manual-only tests.

- `status`
  Review and automation readiness state.
  `draft`: generated but not yet reviewed.
  `reviewed`: validated by a human but not yet selected for automation.
  `approved`: explicitly selected for downstream automation/code generation.

- `source`
  Where the row originally came from.
  `template`: created by deterministic fallback generation.
  `ai`: created by AI generation.
  `manual`: manually added by a human.

## 10. Sync Excel Back to JSON

Command:

```bash
npm run sync
```

What it does:

- reads the `ManualTests` sheet from Excel
- updates [`tests/manual/manual-testcases.json`](../tests/manual/manual-testcases.json)
- preserves edited values
- removes JSON rows that were removed from the workbook
- accepts new workbook rows if they contain a valid `id`

Important rule:

- `id` is the stable key for updates and deletions

Sync behavior:

- if a workbook row matches an existing `id`, that JSON test case is updated
- if a workbook row is removed, that test case is removed from the JSON suite on sync
- if a brand-new row is added with a new valid `id`, it is added to the JSON suite

## 11. Generate Automated Playwright Tests

Command:

```bash
npm run codegen
```

What it does:

- reads [`tests/manual/manual-testcases.json`](../tests/manual/manual-testcases.json)
- selects tests where `status = approved`
- groups approved tests by `feature`
- writes generated Playwright specs under `tests/automated/specs/`

Generated spec behavior:

- each spec groups tests that share the same feature label
- tests inside a feature spec can still cover multiple page URLs
- each generated test section includes a clear comment header with feature, page URL, and manual test ID
- this keeps specs readable while giving reviewers control over how automation is grouped

Current automation architecture:

- lightweight action layer in [`tests/automated/actions/navigationActions.ts`](../tests/automated/actions/navigationActions.ts)
- lightweight category page layer in [`tests/automated/pages/CategoryPage.ts`](../tests/automated/pages/CategoryPage.ts)

## 12. Execute Automated Tests

Command:

```bash
npm run execute
```

What it does:

- runs the generated Playwright suite from `tests/automated/`
- writes raw Playwright JSON to [`reports/playwright-raw.json`](../reports/playwright-raw.json)
- automatically refreshes [`reports/results.json`](../reports/results.json)
- automatically refreshes [`reports/summary.html`](../reports/summary.html)
- writes traces/screenshots under `test-results/` when failures occur

Run mode:

- default runner behavior uses headed execution
- this is intentional for sites where headless navigation is less reliable

## 13. Utility: Parse Results Manually

Command:

```bash
npm run parse
```

Output:

- [`reports/results.json`](../reports/results.json)

This file contains:

- total
- passed
- failed
- concise failure reasons

Use this only when you want to regenerate the parsed JSON without rerunning Playwright.

## 14. Utility: Regenerate the HTML Report

Command:

```bash
npm run report
```

Output:

- [`reports/summary.html`](../reports/summary.html)

Use this only when you want to rebuild the presentation report from an existing [`reports/results.json`](../reports/results.json) file.

## 15. Full End-to-End Flow

Typical sequence:

```bash
npm run reset
npm run crawl
npm run testcases
npm run export
```

Then:

1. review the Excel workbook
2. mark automation-ready tests as `approved`
3. save the workbook

Then continue:

```bash
npm run sync
npm run codegen
npm run execute
```

At this point:

- [`reports/results.json`](../reports/results.json) has already been refreshed
- [`reports/summary.html`](../reports/summary.html) has already been refreshed

## 16. Known MVP Limitations

- page classification is still basic
- generated Playwright selectors are heuristic, not site-tailored
- crawler coverage is intentionally limited per run
- action/page layer is lightweight and not a full POM system
- some flows may need later hardening based on real execution feedback

## 17. Command Reference

```bash
npm run crawl
npm run testcases
npm run export
npm run sync
npm run codegen
npm run execute
npm run parse
npm run report
npm run reset
```
