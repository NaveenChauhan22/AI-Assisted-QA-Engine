# AI-Assisted QA Engine

CLI-first MVP for AI-assisted website QA using crawling, manual test generation, Excel review, Playwright automation, and structured reporting.

## Why This Exists

UI QA usually breaks into disconnected steps: discover pages, write manual tests, review them, automate a subset, then stitch together execution results. This project is an experiment in tightening that loop.

The MVP takes a target website through a practical workflow:

- crawl a bounded page set
- generate draft manual test cases
- export those cases to Excel for human review
- sync reviewed edits back into JSON
- generate Playwright specs for approved cases
- execute the suite and produce structured reports

The goal is not to replace QA engineering. The goal is to accelerate the path from product discovery to reviewable tests and executable automation while keeping humans in control.

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Playwright browser binaries

### Install

```bash
npm install
npx playwright install
```

### Run the MVP

```bash
npm run crawl
npm run testcases
npm run export
npm run sync
npm run codegen
npm run execute
```

### Verify the Project

```bash
npm run verify
```

This runs:

- `npm run typecheck`
- `npm run build`

### Optional AI-backed Generation

If you want AI-backed manual test generation, create a local `.env` file and set:

```bash
OPENAI_API_KEY=your_api_key_here
```

Without that key, the project falls back to deterministic template-based manual test generation.

## Architecture Summary

The workflow is intentionally file-driven and reviewable:

```text
input/seed.json
  -> crawler
reports/discovered-pages.json
  -> manual test generation
tests/manual/manual-testcases.json
  -> Excel export and review
tests/manual/manual-testcases.xlsx
  -> sync back to JSON
tests/manual/manual-testcases.json
  -> Playwright code generation
tests/automated/specs/*.spec.ts
  -> execution
reports/results.json + reports/summary.html
```

Key design choices:

- AI helps draft tests, but a human review layer stays in the middle
- Excel is used as the review surface because it is familiar and editable
- reviewed and committed specs under `tests/automated/specs/` become the execution source of truth
- execution results are produced in both machine-readable and presentation-friendly formats
- empty runs are explicitly marked as `no-tests-found` so they do not look like healthy passing executions

## Main Workflow

### 1. Crawl

`npm run crawl` opens the seed URL from `input/seed.json`, discovers same-site links, applies exclusions, classifies pages at a basic level, and stores the discovered scope.

### 2. Generate Manual Tests

`npm run testcases` creates draft manual test cases for the discovered pages.

### 3. Review in Excel

`npm run export` creates `tests/manual/manual-testcases.xlsx`, where a human can refine:

- titles
- features
- priorities
- categories
- review status
- structured assertions

### 4. Sync Reviewed Edits

`npm run sync` pulls workbook edits back into `tests/manual/manual-testcases.json`.

### 5. Generate Playwright Specs

`npm run codegen` selects approved automation-candidate cases and generates specs grouped by feature.

### 6. Execute and Report

`npm run execute` runs the generated Playwright suite and refreshes:

- `reports/results.json`
- `reports/summary.html`

## Repository Guide

Important files and directories:

```text
docs/USAGE.md
input/seed.json
input/urls.json
reports/discovered-pages.json
tests/manual/manual-testcases.json
tests/manual/manual-testcases.xlsx
tests/automated/specs/*.spec.ts
reports/results.json
reports/summary.html
```

Documentation:

- Full usage guide: [`docs/USAGE.md`](docs/USAGE.md)
- Launch prep tracker: [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md)

## Execution Options

- default browser coverage is Chromium
- default worker count is `1`
- set `PLAYWRIGHT_BROWSERS=chromium,firefox,webkit` for cross-browser execution
- set `PLAYWRIGHT_WORKERS=2` or another positive integer for parallel execution

Examples:

```bash
PLAYWRIGHT_WORKERS=2 npm run execute
PLAYWRIGHT_BROWSERS=chromium,firefox npm run execute
PLAYWRIGHT_BROWSERS=chromium,firefox,webkit PLAYWRIGHT_WORKERS=2 npm run execute
```

## CI

The GitHub Actions workflow:

- runs on pushes to `main`, pull requests to `main`, and manual dispatch
- runs `npm run typecheck`
- runs `npm run build`
- verifies that committed generated specs exist under `tests/automated/specs/`
- validates committed automation artifacts, not local code generation or live-site behavior

Important limitation:

- CI does not run live Myntra execution on GitHub-hosted runners because the target site serves an error page in that environment

## Limitations

This is still an MVP, and some tradeoffs are deliberate:

- page classification is basic
- crawler coverage is intentionally limited per run
- generated selectors are heuristic, not site-tailored
- action/page abstractions are lightweight
- some generated tests will need refinement for long-term robustness
- build output under `dist/` is not the source of truth for automation maintenance

## Roadmap

Near-term improvements that would make this stronger:

- richer page classification and crawl heuristics
- better selector generation and stabilization patterns
- stronger shared automation layers for reusable flows
- sample screenshots or visual workflow assets for public documentation
- broader CI validation strategies for target environments that behave differently under hosted runners
- better packaging for reusing the workflow against other sites

## Public Repo Notes

- `.env` files are local-only and should not be committed
- `.env.example` contains placeholders only
- generated test artifacts in this repo are sample project data, not credentials
- maintain and debug generated automation under `tests/automated/`, not `dist/`

## Contributing

Small improvements, doc fixes, and workflow ideas are welcome. Please start with [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).
