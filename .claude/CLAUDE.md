# Project Guide

Bruno API Docs fork — open-source API docs generated from a Bruno collection (React + Redux +
Vite). One workspace: `packages/bruno-api-docs`, published as `@opencollection/docs`.

Collection docs render the collection a team already runs: every folder, request, and environment
gets a page (method, URL, params, headers, body, auth, examples, code snippets, scripts, tests),
and the embedded playground lets readers edit and send those requests from the docs. The output
is one static HTML file plus the CDN bundle this repo builds.

The app is an API **client**, not a server. Judge every behaviour and edge case by "what should an
API client do here?", not what a document viewer or an API server would do.

## Quick commands

```bash
nvm use && npm install                 # Node from .nvmrc; installs the husky pre-commit hook
npm run lint                           # root
npm run lint:fix                       # root: auto-fix; the pre-commit hook runs this too
```

From `packages/bruno-api-docs/`:

```bash
npm run dev                            # Vite on http://127.0.0.1:3001 (?fixture=folders|vars|descriptions|qa)
npm run test:run                       # Vitest one-shot (pretest builds the QuickJS lib bundle)
npm run test:run -- src/utils/cx.spec.ts       # single unit spec
npm run test:e2e                       # Playwright; starts the dev server itself
npx playwright test e2e/tests/sidebar/ # one e2e directory
npm run build && npm run build:standalone      # library + CDN bundle (dist/, dist-standalone/)
```

Prefer the smallest scope (one spec, one directory) over the full suite.

## Key architecture

- **Entry**: `src/components/OpenCollection/OpenCollection.tsx` owns the store, parses the
  collection (YAML, then JSON fallback), and renders `AppShell` inside a `HashRouter`.
  `components/PageRouter` maps routes (`src/routing/`) to `src/pages/*`.
- **Layers**: `src/pages/` routed screens, `src/components/` reusable UI, `src/ui/` primitives,
  `src/hooks/`, `src/utils/` pure helpers, `src/store/` Redux Toolkit slices, `src/runner/`
  request execution, `src/scripting/` the QuickJS sandbox and `bru.*` runtime, `src/theme/`
  tokens. List a directory for the current set; do not trust a catalogue in a doc.
- **Standalone bundle**: `src/standalone.ts` (`OpenCollectionRenderer`) is what the HTML Bruno
  generates loads from the CDN. Build output lives in `dist*/`; edit `src/` only.
- **Theming**: tokens in `src/theme/tokens/{light,dark}.ts` become CSS custom properties in
  the generated `src/styles/theme.generated.css`. Components consume `var(--...)` only.

## Coding standards

Full list: `CODING_STANDARDS.md` (read it before writing code). Mechanical style is
ESLint-enforced; the rules worth holding in every session:

- Colours and fonts only via CSS custom properties; hex literals fail lint outside `src/theme/`.
- Slices import through `@/store/slices/<slice>`; `@slices/*` fails lint. Other `src/` imports
  use `@/*`. `e2e/` has no aliases.
- One component per folder (`Foo.tsx` + `StyledWrapper.ts` + `Foo.spec.tsx`); `testId` prop
  with derived child ids; classes over inline `style`; no comments in `StyledWrapper.ts`.
- `description` fields are string **or** `{ content }`; always go through the normalisers.
- Every changed behaviour maps to a unit spec (via `useRenderToDom`) or an e2e spec.

## Testing

- **Unit**: Vitest, `environment: 'node'`, specs beside the code as `*.spec.ts(x)`. Render with
  `useRenderToDom` and query with `src/test-utils/dom.ts`. No DOM interaction tests here.
- **E2E**: Playwright, class-based page-object model under `packages/bruno-api-docs/e2e/`.
  Guide: `e2e/README.md`; quick reference: `.claude/rules/testing.md`; use `/write-e2e-test`.
- **CI** (`.github/workflows/ci.yml`): lint, unit tests, both builds, then e2e. Draft PRs skip
  the builds and e2e.

## Rules and skills

Path-scoped rules in `.claude/rules/` attach when you touch matching files: `app-conventions`
(components, styling, state, format consumption), `conventions` (readability, comment and diff
hygiene), `cross-os-compat` (line endings, modifier keys, SSR safety), `unit-testing`,
`testing` (Playwright quick reference). Skills: `/code-review` (parallel lenses mirroring
`.coderabbit.yaml`), `/write-e2e-test`, `/new-component`. Layout and maintenance notes:
`.claude/README.md`.

## Gotchas

- `tsc` and Vitest fail with `Cannot find module './bundled-libraries.iife.js'` until
  `npm run build:lib-bundle` has run once (`pretest`/`predev`/`prebuild` do it for you).
- Never edit `src/styles/theme.generated.css`; change the tokens and run `npm run gen:theme`.
- The dev entry `src/dev.tsx` mounts e2e fixture collections via `?fixture=`. Do not add ad-hoc
  user collections there; exercise them through the standalone build instead.
- Every PR that changes published behaviour needs a changeset (`npm run changeset` or a
  `changeset:patch|minor|major` label). Tooling-only PRs use an empty changeset.

## Before you call a change done

From the root: `npm run lint`. From `packages/bruno-api-docs/`: `npm run test:run`, plus
`npm run test:e2e` when UI behaviour changed. Remove dead code with the feature that used it.
