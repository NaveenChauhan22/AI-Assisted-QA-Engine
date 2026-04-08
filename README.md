# AI-Assisted QA Engine

CLI-first MVP for AI-assisted website QA using crawling, manual test generation, Excel review, Playwright automation, and structured reporting.

## What This MVP Supports

- crawl a target website from `input/seed.json`
- retain and merge discovered URLs into `input/urls.json`
- generate manual test cases into JSON
- export manual test cases to Excel for human review
- sync Excel edits back into JSON
- support optional structured assertion fields in manual tests for deterministic code generation
- generate Playwright tests for approved manual cases
- execute automated tests
- produce JSON and HTML reports
- record run metadata such as timestamp, run mode, browser list, and worker count in execution results
- keep automation maintenance focused on `tests/automated`, not `dist/`
- use a human-editable `feature` field to group generated specs

## Main Workflow

```bash
npm install
npx playwright install
npm run crawl
npm run testcases
npm run export
npm run sync
npm run codegen
npm run execute
```

## Documentation

- Full setup and usage guide: [`docs/USAGE.md`](docs/USAGE.md)

## CI

- GitHub Actions workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- runs on pushes to `main`, pull requests to `main`, and manual dispatch
- runs `npm run typecheck`
- runs `npm run build`
- verifies that committed generated specs exist under `tests/automated/specs/`
- does not run live Myntra execution on GitHub-hosted runners because the target site serves an error page in that environment
- validates the committed automation artifacts, not local code generation or live-site behavior

## Execution Options

- default execution uses Chromium with `1` worker
- set `PLAYWRIGHT_WORKERS` to opt into parallel execution
- set `PLAYWRIGHT_BROWSERS` to a comma-separated list such as `chromium,firefox,webkit` for cross-browser runs

Examples:

```bash
PLAYWRIGHT_WORKERS=2 npm run execute
PLAYWRIGHT_BROWSERS=chromium,firefox,webkit npm run execute
PLAYWRIGHT_BROWSERS=chromium,firefox PLAYWRIGHT_WORKERS=2 npm run execute
```

## MVP Expectation

- Excel review and structured assertion updates improve the generated automation baseline
- generated Playwright tests are meant to accelerate automation, not replace test engineering
- expect to refine selectors, shared page/actions code, and some generated tests for stable long-term automation
- after local review and fixes, committed specs under `tests/automated/specs/` are the execution source of truth

## Key Artifacts

```text
input/seed.json
input/urls.json
reports/discovered-pages.json
tests/manual/manual-testcases.json
tests/manual/manual-testcases.xlsx
tests/automated/specs/*.spec.ts
reports/results.json
reports/summary.html
```

## Persistence Model

- repeated crawls merge new URLs into `input/urls.json`
- repeated test generation appends only genuinely new manual test cases
- Excel sync updates the JSON suite based on workbook contents
- `npm run reset` clears the working state for a fresh start

## Debugging Note

- edit and debug generated automation under `tests/automated/`
- generated specs live under `tests/automated/specs/`
- ignore `dist/` during automation maintenance because it is build output only
- `npm run build` intentionally does not emit Playwright test sources into `dist/`
- `npm run execute` now executes tests and refreshes both `reports/results.json` and `reports/summary.html`
- `reports/results.json` will explicitly mark `no-tests-found` runs so empty or blocked executions do not look like healthy releases
