# Releases

Arrival Atlas keeps releases and deployments related but distinct:

- A **GitHub release** names and documents a verified source milestone.
- A **Vercel deployment** is the built artifact serving the application.
- A release never implies that unverified code was deployed, and a routine deployment does not
  require a new version tag.

## Versioning

Release tags use Semantic Versioning in the form `vMAJOR.MINOR.PATCH`. Before `1.0.0`:

- increment `MINOR` for a meaningful product, data-contract, or workflow addition;
- increment `PATCH` for compatible fixes and smaller refinements;
- reserve `MAJOR` for an intentionally stable public contract.

The tag without its leading `v` must exactly match the version in `package.json`. Each tag also
requires a checked-in notes file at `docs/releases/<tag>.md`.

## Release process

1. Update `package.json`, [`CHANGELOG.md`](../CHANGELOG.md), and
   `docs/releases/<tag>.md` in one focused change.
2. Push the change to `main` and wait for both jobs in
   [CI](https://github.com/heybadrinath/arrival-atlas/actions/workflows/ci.yml) to pass.
3. Confirm Vercel reports success on the matching
   [GitHub commit](https://github.com/heybadrinath/arrival-atlas/commits/main) and verify the
   [production application](https://arrival-atlas.vercel.app).
4. Create and push an annotated tag:

   ```bash
   git tag -a v0.1.0 -m "Arrival Atlas v0.1.0"
   git push origin v0.1.0
   ```

5. The [release workflow](../.github/workflows/release.yml) verifies the tag, package version,
   notes file, and `main` commit before publishing the GitHub release.
6. Confirm the release page shows the intended notes and source archives.

Use the next version number in place of `v0.1.0`. Published tags are immutable; fix a released
problem with a new patch release instead of moving or reusing a tag.

## Deployment process

Vercel Git integration deploys `main`. It owns build logs, production aliases, and rollback
history. GitHub Actions owns tests and GitHub Release publication. Keeping those responsibilities
separate avoids duplicate deployments and long-lived Vercel credentials in GitHub.

For manual deployment, rollback, environment variables, and dataset-refresh behavior, see
[Deployment and recurring cost](DEPLOYMENT.md).

## Failure handling

- **Release workflow failure:** fix the release metadata on `main`, create the next patch version,
  and publish a new tag. Do not force-push a published tag.
- **Deployment failure before tagging:** do not release. Fix or revert `main` and wait for a green
  deployment.
- **Production regression after release:** use Vercel Instant Rollback, document the incident in
  `CHANGELOG.md`, and publish a patch release once the correction is verified.
