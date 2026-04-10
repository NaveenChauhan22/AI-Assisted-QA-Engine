# Contributing

Thanks for taking a look at this MVP.

## Before You Start

- read [`README.md`](README.md) for the project overview
- use [`docs/USAGE.md`](docs/USAGE.md) for the full workflow
- keep changes focused and easy to review

## Local Setup

```bash
npm install
npx playwright install
npm run verify
```

If you want AI-backed test generation, create a local `.env` file with:

```bash
OPENAI_API_KEY=your_api_key_here
```

Do not commit `.env` files or local secrets.

## Contribution Guidelines

- prefer small pull requests with a clear purpose
- update docs when behavior changes
- keep generated automation maintenance focused on `tests/automated/`
- do not treat `dist/` as the source of truth for test debugging
- avoid committing local artifacts such as secrets, temporary files, or personal environment metadata

## Validation

Before opening a pull request, run:

```bash
npm run verify
```

If your change affects the workflow, also run the relevant commands from [`docs/USAGE.md`](docs/USAGE.md).

## Pull Requests

Helpful pull requests usually include:

- a short description of the problem
- a concise explanation of the change
- notes about any tradeoffs or known limitations
- updates to docs when the public workflow changes
