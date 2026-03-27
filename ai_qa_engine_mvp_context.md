# AI-Assisted QA Engine (MVP) – Build Context

## Objective
Build an AI-assisted test automation system that:
1. Generates test cases from a URL or feature description using an LLM
2. Converts those test cases into Playwright (TypeScript) scripts
3. Executes them using Playwright
4. Produces structured JSON reports

This is Phase 1 (MVP). Phase 2 (Release Decision Engine) will be added later.

---

## Core Principles
- Deterministic execution (AI only used for generation, not runtime decisions)
- Structured JSON contracts between all layers
- CLI-driven workflow (no UI needed for MVP)
- Simple, extensible architecture

---

## Tech Stack
- Node.js (v18+)
- TypeScript
- Playwright Test
- OpenAI or Claude API (LLM)
- File-based JSON storage

---

## Folder Structure

ai-qa-engine/
│
├── input/
│   └── test-prompt.json
│
├── ai/
│   ├── generateTestCases.ts
│   ├── generatePlaywrightCode.ts
│
├── tests/
│   └── generated/
│
├── runner/
│   └── runTests.ts
│
├── reports/
│   ├── results.json
│   └── screenshots/
│
├── utils/
│   └── parser.ts
│
├── package.json
├── tsconfig.json
└── README.md

---

## Input Contract (input/test-prompt.json)

{
  "url": "https://example.com",
  "goal": "Test login and checkout flow"
}

---

## Step 1: AI Test Case Generation

File: ai/generateTestCases.ts

Responsibilities:
- Read input JSON
- Call LLM API
- Generate structured test cases
- Save output to: reports/testcases.json

Expected Output Format:

[
  {
    "name": "Valid login",
    "steps": [
      "Open login page",
      "Enter username",
      "Enter password",
      "Click login"
    ],
    "expected": "User is redirected to dashboard"
  }
]

LLM Prompt (IMPORTANT):

"Generate detailed UI test cases for the following web application.
Return ONLY valid JSON.
Include test name, steps, and expected result.
Do not include explanations.

URL: {url}
Goal: {goal}"

---

## Step 2: Convert Test Cases to Playwright Code

File: ai/generatePlaywrightCode.ts

Responsibilities:
- Read testcases.json
- Convert each test into Playwright test
- Save files into tests/generated/

Example Output:

import { test, expect } from '@playwright/test';

test('Valid login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#username', 'test');
  await page.fill('#password', 'password');
  await page.click('#login');
  await expect(page).toHaveURL(/dashboard/);
});

LLM Prompt:

"Convert the following test case into Playwright TypeScript test code.
Use best practices.
Return only code.

Test case:
{testcase_json}"

---

## Step 3: Test Execution

File: runner/runTests.ts

Responsibilities:
- Execute Playwright tests via CLI
- Capture results
- Store structured output

Command:

npx playwright test --reporter=json > reports/results.json

---

## Step 4: Result Parsing

File: utils/parser.ts

Responsibilities:
- Parse Playwright JSON output
- Extract:
  - total tests
  - passed
  - failed
  - failure reasons

Final Output Format (reports/results.json):

{
  "total": 10,
  "passed": 8,
  "failed": 2,
  "failures": [
    {
      "test": "Checkout flow",
      "reason": "Button not clickable"
    }
  ]
}

---

## CLI Workflow (End-to-End)

1. node ai/generateTestCases.ts
2. node ai/generatePlaywrightCode.ts
3. node runner/runTests.ts

---

## Environment Variables

Create .env file:

OPENAI_API_KEY=your_key_here

---

## MVP Scope (Strict)

Include ONLY:
- Test generation (AI)
- Code generation (AI)
- Playwright execution
- JSON reporting

DO NOT include:
- UI
- Database
- CI/CD integration
- Authentication handling (keep simple)

---

## Constraints / Guidelines

- All AI outputs must be validated JSON
- Fail gracefully if AI output is malformed
- Keep prompts deterministic
- Avoid dynamic selectors (use stable ones)

---

## README Requirements

Include:
- Problem statement
- Architecture overview
- How to run
- Sample output
- Business value

---

## Future Phase (DO NOT BUILD NOW)

Release Decision Engine:
- Input: results.json
- Output: GO / NO-GO decision
- Risk classification
- Executive summary

---

## Success Criteria

- User provides URL + goal
- System generates test cases
- Converts to Playwright
- Executes successfully
- Produces readable JSON report

---

## Notes for Codex Agent

- Keep implementation simple and modular
- Prefer clarity over abstraction
- Ensure all file paths are correct
- Ensure Playwright config works out of the box
- Use async/await properly

---

## Target Website (MVP Demo)

Primary target: Myntra (https://www.myntra.com)

Scope:
- Public pages only (no login required)
- Focus areas:
  - Homepage
  - Category pages
  - Product listing pages
  - Product detail pages

Out of Scope:
- Login / Signup
- Cart / Checkout
- Wishlist
- Payment flows

Goal:
Demonstrate AI-assisted test generation and execution on a real-world e-commerce platform.

---

## Input Modes

The system must support 2 input modes:

1. Manual URL List
2. Auto-discovery via crawler

### Mode 1: URL List

Input file: input/urls.json

Example:
[
  "https://www.myntra.com/",
  "https://www.myntra.com/men-tshirts",
  "https://www.myntra.com/shoes"
]

### Mode 2: Seed URL (Crawler)

Input:
{
  "seed_url": "https://www.myntra.com",
  "depth": 1
}

Output:
- Extract all anchor links
- Filter only Myntra domain
- Remove login/cart/checkout URLs
- Save to input/urls.json

---

## Crawler Utility

File: crawler/crawler.ts

Responsibilities:
- Open seed URL using Playwright
- Extract all <a href> links
- Normalize URLs
- Filter:
  - Same domain only (myntra.com)
  - Remove:
    - /login
    - /signup
    - /checkout
    - /cart
- Remove duplicates
- Limit depth to 1 (MVP)
- Save output to input/urls.json

---

## Page Classification (Basic)

Before generating test cases, classify pages:

Rules (simple for MVP):

if URL contains:
- "men" / "women" / "kids" → category page
- "p/" → product page
- otherwise → homepage/static

Output:
{
  "url": "...",
  "type": "category" | "product" | "homepage"
}

---

## Myntra-Specific Constraints

- Avoid aggressive crawling (rate limiting risk)
- Add delay between requests (1–2 seconds)
- Limit URLs to max 10–15 for MVP
- Do not test login/cart flows
- Prefer stable selectors (avoid dynamic classes)

---

End of Context

