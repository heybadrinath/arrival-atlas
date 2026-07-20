# Contributing

Arrival Atlas welcomes focused fixes to metric correctness, data quality, accessibility,
documentation, and the traveler-facing experience.

## Ways to help

- Report a reproducible bug or confusing product flow
- Improve keyboard, screen-reader, mobile, or reduced-motion behavior
- Clarify documentation, methodology, metric definitions, or limitations
- Add a focused test for an uncovered edge case
- Improve pipeline validation without changing published metric meaning

## Before opening a change

1. Search [existing issues](https://github.com/heybadrinath/arrival-atlas/issues) before opening a
   new one. Open an issue first for a material metric, schema, or architecture change.
2. Keep source-of-truth boundaries intact: raw and cleaned flight records are local pipeline
   artifacts; only application-ready aggregates are published.
3. Do not add predictive claims, arbitrary composite scores, or generative features.
4. Do not commit credentials, `.env.local`, raw BTS ZIPs, cleaned flight rows, build output,
   caches, or downloaded test artifacts.

For web-only work, follow the [local setup](README.md#local-web-setup). Pipeline changes also need
Python 3.12 and `uv`.

## Local checks

```bash
pnpm install --frozen-lockfile
uv sync --frozen --dev
pnpm check
pnpm build
```

Run `pnpm test:e2e` after a current aggregate snapshot is available in `public/data` or after
setting `NEXT_PUBLIC_DATA_BASE_URL` to the public dataset resolver.

## Data changes

Data-pipeline changes need tests that prove row-count reconciliation and denominator behavior.
Run a one-month fixture or official partition before attempting the full refresh:

```bash
uv run arrival-data download --start 2026-05 --through 2026-05
uv run arrival-data transform --start 2026-05 --through 2026-05
uv run arrival-data aggregate --through 2026-05
uv run arrival-data validate --through 2026-05
```

## Pull requests

Fork the repository, create a focused branch, and keep unrelated changes out of the pull request.
Explain the user problem, scope, verification performed, and any changed limitation. Include a
screenshot for visible UI work and exact failing/passing cases for data-quality changes.

Small, reviewable changes are easier to validate and merge. A maintainer may ask for a design or
metric discussion before accepting changes that alter the product's interpretation of the data.
