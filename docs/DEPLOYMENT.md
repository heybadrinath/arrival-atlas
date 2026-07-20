# Deployment and recurring cost

The launch architecture has a recurring cost of **$0** and creates no paid infrastructure.

## Services

- **Vercel Hobby:** non-commercial Next.js frontend and CDN.
- **GitHub public dataset repository:** versioned aggregate Parquet and dataset card.
- **GitHub public repositories and Actions:** source, data, tests, and monthly refresh workflow.

The architecture keeps generated deployment source under Vercel Hobby's 100 MB CLI source-upload
limit. As of July 20, 2026, the official limits page also lists 100 GB monthly fast data transfer,
one million invocations, and a 45-minute build cap for Hobby. The application is read-only and
does not need function invocations for normal data exploration.

Vercel Hobby permits personal, non-commercial use. If the product becomes commercial, move to an
eligible paid plan before that use begins. See [Vercel limits](https://vercel.com/docs/limits) and
[Vercel terms](https://vercel.com/legal/terms).

GitHub recommends keeping repositories below 1 GB and enforces a 100 MiB limit on individual
regular Git objects. The current repository is roughly 125 MiB and every origin partition is far
below the individual-file limit. The application uses GitHub's HTTPS raw-file surface, which was
verified for byte ranges and cross-origin access. See [GitHub repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits)
and [large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

Each versioned snapshot also increases Git history. Check repository size after every refresh and
migrate to a free or paid object store before history approaches the recommended 1 GB ceiling;
the application can move by changing only `NEXT_PUBLIC_DATA_BASE_URL`.

## First production deployment

1. Publish the dataset and verify its manifest.
2. Add these Vercel environment variables for Production, Preview, and Development:

   ```text
   NEXT_PUBLIC_DATA_BASE_URL=https://raw.githubusercontent.com/heybadrinath/arrival-atlas-data/main
   NEXT_PUBLIC_SITE_URL=https://arrival-atlas.vercel.app
   ```

3. Deploy from the linked project:

   ```bash
   pnpm dlx vercel@latest --prod --yes
   ```

4. Verify the exact production URL at desktop and mobile widths, including a clean load, route
   filters, charts, tooltips, empty/invalid states, source links, network requests, console, and
   page metadata.

The local machine may have an older global Vercel CLI. Using `pnpm dlx vercel@latest` avoids a
global change and ensures support for `vercel.ts`.

## Scheduled refresh

`.github/workflows/data-refresh.yml` runs on the fifth day of each month and can be dispatched
manually. Configure this repository secret:

```text
DATA_REPO_DEPLOY_KEY = private half of a write-enabled deploy key scoped to arrival-atlas-data
```

The job:

1. discovers the latest official complete month;
2. restores prior raw and cleaned partitions from the Actions cache;
3. downloads only missing or changed official ZIPs;
4. validates and transforms only changed checksums;
5. runs data-quality and unit tests;
6. builds versioned origin-partitioned aggregates;
7. publishes one atomic dataset commit and verifies the public raw manifest;
8. commits `public/data-version.json` to `main` when freshness changes.

The final small source commit triggers the connected Vercel project. Because the web application
resolves the current dataset catalog at runtime, users can also see the new version without a
large frontend artifact.

## Rollback

- **Dataset:** revert the public data repository to a prior commit, or point the application data
  URL at a pinned raw GitHub revision.
- **Frontend:** use Vercel Instant Rollback to promote the previous verified deployment.
- **Source:** revert the narrow offending commit; never rewrite published data history.

Rollback remains free and does not delete the failed dataset version, preserving auditability.
