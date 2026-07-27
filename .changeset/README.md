# Changesets

Every PR that changes published behavior adds a **changeset** — a short note that
becomes the release's CHANGELOG entry and decides the version bump.

## Add one

Create a `.md` file in this folder with a short, descriptive name
(e.g. `header-auth-fix.md`) and this shape:

```md
---
"@opencollection/docs": patch
---

Short, user-facing summary of what changed.
```

Writing the file by hand keeps the name meaningful. (`npx changeset` also works,
but it generates a random filename you'd have to rename.)

## Bump levels

- **patch** — fixes, docs, internal/tooling (no API change)
- **minor** — new capability, backwards compatible
- **major** — breaking change to the component's props/API

Tooling / CI / repo-infra PRs that don't affect the published package use an
**empty changeset** — a file with just empty frontmatter (`---` on two lines).
It records the PR without bumping the version or adding a CHANGELOG line.

Releasing (turning these notes into `CHANGELOG.md` + a version bump) happens later
at release time, not in your PR.

Full docs: https://github.com/changesets/changesets
