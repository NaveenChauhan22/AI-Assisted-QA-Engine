# Public Launch Checklist

Use this tracker for the final 3 days before sharing the repo widely.

## Day 3: Repo Readiness

- [ ] Re-read [`README.md`](../README.md) from the perspective of a first-time visitor
- [ ] Confirm [`docs/USAGE.md`](./USAGE.md) matches the current CLI behavior
- [ ] Confirm [`LICENSE`](../LICENSE) is present and correct
- [ ] Confirm [`CONTRIBUTING.md`](../CONTRIBUTING.md) is present and still accurate
- [ ] Verify the public repo description and topics on GitHub are set
- [ ] Confirm `.env` files are not tracked and `.env.example` contains placeholders only
- [ ] Run a repo-wide search for credentials, tokens, and private keys
- [ ] Check that sample files do not contain personal data or accidental local paths

## Day 2: Workflow Confidence

- [ ] Run `npm run verify`
- [ ] Run the core workflow once end to end on a clean local state
- [ ] Confirm `tests/automated/specs/` contains the intended reviewed specs
- [ ] Confirm `reports/results.json` and `reports/summary.html` are ignored as intended
- [ ] Verify that `no-tests-found` handling still behaves as expected
- [ ] Re-check GitHub Actions status on the latest default branch commit
- [ ] Confirm the repo still works without an `OPENAI_API_KEY` via deterministic fallback generation

## Day 1: Public Story and Sharing

- [ ] Finalize the LinkedIn article context in [`docs/LINKEDIN_ARTICLE_CONTEXT.md`](./LINKEDIN_ARTICLE_CONTEXT.md)
- [ ] Finalize the LinkedIn prompt in [`docs/LINKEDIN_ARTICLE_PROMPT.md`](./LINKEDIN_ARTICLE_PROMPT.md)
- [ ] Prepare at least one architecture or workflow visual for the article
- [ ] Confirm the GitHub repo URL in public-facing copy is correct
- [ ] Review the article for hype, unsupported claims, and missing limitations
- [ ] Make the repository public only after the final safety and docs pass

## Final Go/No-Go

- [ ] README is clear in under 2 minutes
- [ ] New users can identify the main workflow quickly
- [ ] No sensitive data is present in the repo or recent history
- [ ] The public story matches the actual MVP behavior
- [ ] The default branch is in a clean, shareable state
