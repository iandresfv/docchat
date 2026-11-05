# ADR-0017 — Versioning, releases and CHANGELOG

- **Status:** Accepted
- **Date:** 2026-10-11

## When a version is cut

At each roadmap milestone, where a milestone groups one backend stage with the client stages it
unblocks. A `0.y.0` minor for every milestone that adds a user-visible capability; a `0.y.z`
patch for fixes merged between milestones, cut only when a fix is worth deploying on its own.

`v1.0.0` means: the full feature set absorbed, the client complete, CI gates, evaluations, the
production overlay and the runbook all present. After 1.0, minor for features, patch for fixes,
and major only for breaking changes to `/api/v1` — which would become `/api/v2` instead, so in
practice never.

## Automation

Hybrid, deliberately. The version is cut by hand in one pull request
(`chore(release): prepare v0.4.0`) that renames `[Unreleased]` to `[0.4.0] - <date>` and bumps
`api/pyproject.toml` and `client/package.json`. After the squash merge, `git tag -a v0.4.0` on
`main` and push the tag.

`release.yml` then validates that the tag has a CHANGELOG section, extracts it as the release
body and creates the GitHub Release; `images.yml` publishes
`ghcr.io/<owner>/docchat-{api,client}:0.4.0`, `:0.4` and `:latest`.

**Rejected:** release-please and git-cliff. Both generate the changelog from commit subjects,
which yields one-line engineering entries instead of user-facing prose, and release-please's own
release-PR style collides with the squash-title rule.

## CHANGELOG granularity

One bullet per pull request, written in that pull request under `[Unreleased]` in the right
Keep a Changelog category. The release PR only renames the heading. `Infrastructure` is used as
a custom category alongside the standard Added / Changed / Deprecated / Removed / Fixed /
Security.

## Squash-only history

Squash merging loses the intra-branch steps. That is acceptable because every roadmap line is
sized as one pull request of at most ~400 changed lines, so `git bisect` at PR granularity still
lands on a reviewable diff. A branch that grows past that is split, not merged bigger.

## Pull request hygiene

`main` is protected: pull requests required, linear history, no force-push, stale approvals
dismissed, and the required checks `ci / api`, `ci / client` and `ci / changelog` — the last one
failing if `CHANGELOG.md` is untouched and the PR does not carry the `skip-changelog` label.
Dependabot runs weekly for `uv`, `npm` and `github-actions`, grouped.
