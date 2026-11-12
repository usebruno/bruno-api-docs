# AGENTS.md

`@usebruno/api-docs` renders a Bruno OpenCollection as API docs with a playground that sends
real requests. It ships as a CDN bundle (`Bruno.apiDocs(target, { content })`), not on npm.
The package lives in `packages/bruno-api-docs`; the repo root holds lint, changesets and CI.

**Read `ARCHITECTURE.md` before changing code. Follow `CODING_STANDARDS.md`.** Its core rule:
the simplest code that works, abstractions only when required.

## Commands

From `packages/bruno-api-docs`:

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Unit tests | `npm run test:run` |
| E2E, main + standalone | `npm run test:e2e` |
| E2E, standalone only | `npm run test:e2e:standalone` |
| One e2e spec | `npx playwright test e2e/tests/<area>/<name>.spec.ts` |
| Build | `npm run build`, `npm run build:standalone` |

From the repo root: `npm run lint` (changed lines only), `npm run changeset`.

## Rules agents break most

1. No new abstraction (interface, factory, wrapper, option, helper) without a second real use.
2. PRs target the active `release/vX.Y.0` branch, never `main`.
3. A change to the package needs a changeset (`npm run changeset` at the root).
4. Locally run only the e2e specs your change touches. CI runs the full suite.
5. Never rename storage keys (`oc-docs.theme`, `oc-docs.env`, `oc-docs:*`), the
   `.oc-playground` class or bundle names.
6. Zero comments by default. Only what the code cannot say.
