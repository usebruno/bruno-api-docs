# AGENTS.md

`@usebruno/api-docs` renders a Bruno OpenCollection as API docs with a playground that sends
real requests. It ships as a CDN bundle (`Bruno.apiDocs(target, { content })`), not on npm.
The code lives in three workspaces under `packages/`; the repo root holds lint, changesets and CI.

**Read `ARCHITECTURE.md` before changing code. Follow `CODING_STANDARDS.md`.** Its core rule:
the simplest code that works, abstractions only when required.

## Where code goes

- `packages/bruno-api-docs` (`@usebruno/api-docs`): docs pages, sidebar, search, the playground
  dock shell, the standalone and dev entries, all e2e.
- `packages/bruno-api-playground` (`@usebruno/api-playground`, private): `PlaygroundBody` and below,
  the runner, QuickJS scripting. Anything that runs requests or scripts goes here.
- `packages/bruno-shared` (`@usebruno/api-shared`, private): session, document, routing, theme,
  styles, ui primitives, shared components, test utils. If docs and playground both need it, it goes here.

Boundary (lint): shared imports neither; playground imports only shared; docs only type-imports
the playground, apart from the one lazy `import()` in
`packages/bruno-api-docs/src/components/Playground/load.ts`. Cross-package imports use package
names. `@/` exists only in docs.

## Commands

From the repo root:

| Task | Command |
|---|---|
| Unit tests, all packages | `npm run test:run` |
| Unit tests, one package | `npm run test:run -w @usebruno/api-shared` (or `@usebruno/api-playground`, `@usebruno/api-docs`) |
| Lint changed lines | `npm run lint` (whole tree: `npm run lint:all`) |
| Changeset | `npm run changeset` |

From `packages/bruno-api-docs`:

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| E2E, main + standalone | `npm run test:e2e` |
| E2E, standalone only | `npm run test:e2e:standalone` |
| One e2e spec | `npx playwright test e2e/tests/<area>/<name>.spec.ts` |
| Build | `npm run build`, `npm run build:standalone` (builds the playground file first) |

## Rules agents break most

1. No new abstraction (interface, factory, wrapper, option, helper) without a second real use.
2. PRs target the active `release/vX.Y.0` branch, never `main`.
3. A change to any package needs a changeset (`npm run changeset` at the root).
4. Locally run only the e2e specs your change touches. CI runs the full suite.
5. Never rename storage keys (`oc-docs.theme`, `oc-docs.env`, `oc-docs:*`), the
   `.oc-playground` class or bundle names.
6. Zero comments by default. Only what the code cannot say.
7. New files: components `PascalCase.tsx`, everything else in `src` `camelCase.ts`, e2e `kebab-case`.
   Don't copy a neighbouring file's naming.
