---
paths:
  - "packages/bruno-api-docs/src/**"
---

# App Conventions

`CODING_STANDARDS.md` is the source of truth for how components, styling, state, and tests are
written; read it. This file holds the judgment calls and repo-specific detail a linter cannot
make. Derived from the existing codebase: match it.

## Components

- Before adding a component, hook, or helper, search `src/ui/`, `src/components/`, `src/hooks/`,
  and `src/utils/` by concept, not by the name you would have picked, and read the nearest
  sibling that solves the same shape of problem. Reuse is usually a net deletion.
- Where an existing primitive is almost right, widen it rather than standing up a near-duplicate
  next to it; two near-identical implementations diverge silently.
- `src/ui/` holds primitives with no knowledge of collections (tables, tabs, modals, editors).
  `src/components/` holds collection-aware pieces. `src/pages/` holds routed screens composed
  from both. A helper that only one component uses lives next to that component; a shared one
  lives in `src/utils/` with its own spec.
- `useEffect` is used throughout the codebase and is not banned; still prefer derived state and
  event handlers where they are genuinely simpler. An effect that only mirrors a prop into state
  is a smell.

## Styling

- Legacy alias variables (`--text-primary`, `--border-color`, `--bg-secondary`, ...) in
  `src/styles/index.css` map onto the generated `--oc-*` tokens. Prefer an existing alias; add
  a new alias there rather than reaching for a raw `--oc-*` token in a component.
- Headings inside `.markdown-documentation`: keep `line-height` unitless or at least the font
  size, or multi-line headings clip.
- Tailwind utilities appear alongside Emotion for layout (`flex`, spacing). That is fine; colour,
  font, and border tokens still come from CSS variables in the wrapper.

## Reading collections

- `description` may be a bare string or a legacy `{ content, type }` object. Display and search
  both go through `descriptionText` / `resolveDescription` (`utils/description.ts`),
  `getDescription` (`utils/request.ts`), or `getItemDescription` (`utils/schemaHelpers.ts`).
  A new description-bearing field follows the same handling.
- Requests come in several protocols (HTTP, GraphQL, gRPC, WebSocket). Check how
  `components/PageRouter` and `utils/schemaHelpers.ts` discriminate them before adding a branch.
- Playground state is seeded from the docs collection; changes to one side must keep the other
  consistent. Read `store/slices/playground.ts` alongside `store/slices/docs.ts`.

## Test ids

- Components take `testId?: string`; child ids derive from it (`${testId}-row`) and are omitted
  when unset. A component reused in several sections gets a distinct `testId` per instance so
  e2e locators stay unambiguous.
- If an e2e test needs an element with no stable id, add a `testId` to the component. Never
  locate by styling class or text in a spec.

## Hygiene

- Do not strip explanatory JSDoc from non-obvious logic (for example the parsing rules in
  `utils/pathParams.ts`) during a refactor; those comments are the contract.
- The `@/*` alias is configured in `tsconfig.json`, `vite.config.ts`, `vite.config.*.ts`, and
  `vitest.config.ts`. Keep them in sync if you touch one.

## Before you call a change done

From the root: `npm run lint`. From `packages/bruno-api-docs/`: `npm run test:run`, plus
`npm run test:e2e` when UI behaviour changed. Then list every behaviour the diff adds or changes
and name the test that exercises it. Anything without a test is a gap to fill before the commit,
not a note for the PR.
