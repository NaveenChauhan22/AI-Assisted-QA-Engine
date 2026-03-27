# AI-Assisted QA Engine

CLI-first MVP for AI-assisted website QA using crawling, manual test generation, Excel review, Playwright automation, and structured reporting.

## What This MVP Supports

- crawl a target website from `input/seed.json`
- retain and merge discovered URLs into `input/urls.json`
- generate manual test cases into JSON
- export manual test cases to Excel for human review
- sync Excel edits back into JSON
- generate Playwright tests for approved manual cases
- execute automated tests
- produce JSON and HTML reports

## Main Workflow

```bash
npm install
npx playwright install
npm run phase2:crawl
npm run phase3:testcases
npm run phase4:export
npm run phase5:sync
npm run phase6:codegen
npm run phase7:run
npm run phase8:parse
npm run report:summary
```

## Documentation

- Full setup and usage guide: [`docs/USAGE.md`](docs/USAGE.md)

## Key Artifacts

```text
input/seed.json
input/urls.json
reports/discovered-pages.json
tests/manual/manual-testcases.json
tests/manual/manual-testcases.xlsx
tests/automated/approved.spec.ts
reports/results.json
reports/summary.html
```

## Persistence Model

- repeated crawls merge new URLs into `input/urls.json`
- repeated test generation appends only genuinely new manual test cases
- Excel sync updates the JSON suite based on workbook contents
- `npm run reset` clears the working state for a fresh start
