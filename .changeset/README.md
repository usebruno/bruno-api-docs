# Changesets

Every PR that changes published behavior adds a **changeset** — a short note that
becomes the release's CHANGELOG entry and decides the version bump.

## Add one

```
npm run changeset
```

Select the package, pick a bump level, write a one-line summary. It creates a
`.md` file here (the random filename is fine — these files are consumed and
deleted at release). Commit it with your PR.

You can also write the file by hand if you prefer:

```md
---
"@opencollection/docs": patch
---

Short, user-facing summary of what changed.
```

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
