# Changelog

All notable user-visible changes to Arrival Atlas are recorded here. The project follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-20

### Added

- Route reliability search by origin, destination, calendar month, and scheduled departure band
- Like-for-like airline comparisons with observation counts, on-time and cancellation rates,
  exact delay percentiles, and severe-delay rates
- Historical route trends, delay distributions, time-band comparisons, reported delay causes,
  route volume, and carrier coverage
- Airport-level reliability trends and route drill-downs
- Searchable airport selectors, route swapping, recent-route shortcuts, and shareable route links
- Deterministic metric summaries, sample-size rules, methodology, data lineage, and limitations
- Responsive and keyboard-friendly desktop and mobile interfaces
- Reproducible BTS data pipeline, validation suite, monthly refresh workflow, and public aggregate
  dataset
- GitHub Actions quality and browser checks with Vercel production deployment status

### Fixed

- Public catalog and Parquet requests now use a same-origin `/data` rewrite, avoiding
  browser-specific cross-origin restrictions while retaining the public GitHub dataset

[Unreleased]: https://github.com/heybadrinath/arrival-atlas/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/heybadrinath/arrival-atlas/releases/tag/v0.1.0
