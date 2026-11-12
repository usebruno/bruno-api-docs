# Coding Standards

**Core rule: write the simplest code that works. Add an abstraction only when a second real
use needs it. No over-engineering.**

This file is the single source of truth for how code here is written. `AGENTS.md`, `CLAUDE.md`
and `.coderabbit.yaml` only point at it. Change a rule here, not there.

How to read it: each rule is one line. `see:` points at code that already does it right.
`(lint)` means ESLint fails the change, so don't spend review time on it. Paths are relative to
`packages/bruno-api-docs` unless they start at the repo root.

Old code that breaks a rule can stay until you touch it. Lines you change follow the rules.

## Simplicity

These are the smells we reject in review. Each line says how to spot it.

- **Interface or factory with one implementation.** Use the one implementation directly. Spot
  it: search for a second implementer; there isn't one.
- **An option nobody passes, an export nobody imports.** Delete it. Spot it: grep the name
  across `src/`. Unused locals and imports are `(lint)`; unused exports are not, so grep.
- **A helper with one caller, or a wrapper that only forwards.** Inline it. Spot it: grep the
  helper's name and count callers.
- **Two ways to do one thing.** Pick one and delete the other. Spot it: before adding a helper,
  search `src/utils/`, `src/hooks/` and `src/ui/` by what it does, not by the name you'd pick.
- **A guard for an input that cannot happen.** Drop it. `strict` types already say what can be
  null. Guard at real boundaries only: parsed collections, URL params, storage, network.
- **Hand-rolled code where lodash-es, the platform or existing code does it.** Use theirs.
  see: `src/session/workspace.ts` (`findLastIndex`, `omit` from lodash-es)
- **Anything "for later".** Every added line has a live user in the same change.
- **Dead code leaves with its feature.** Removing a view also removes its props, styles,
  state and tests.

## State

- One owner per fact. Everything else reads it or derives it during render.
  see: `ARCHITECTURE.md` (state owners table)
- Three owners, three lifetimes. Put new state with the owner whose lifetime it needs.
  - Read-only document, per load: `src/document/document.tsx`
  - Per-instance session (theme, env, playground view, folders): `src/session/session.tsx`
  - Playground working copy, responses, run starts: `src/session/workspace.ts`
  - Playground deep links live in the URL only: `src/utils/playgroundDock.ts`
- Session state is a small observable, not a store. Don't add a store library.
  see: `src/observable/observable.ts`
- Leaves get props and callbacks, not the session. Containers read the session and pass down.
  see: `src/components/Playground/PlaygroundBody/PlaygroundBody.tsx`
- Updates are pure `(state, payload) => state`. They never mutate. The workspace deep-freezes
  its state, so a mutation throws. see: `src/session/workspace.ts`
- Keep the identity of every branch you didn't change. A no-op returns the same state object.
  see: `src/session/workspace.ts` (`updateItemIn`, `setResponse`)
- Each owner persists itself. Nothing else writes its storage key.
  see: `src/session/env.ts`, `src/theme/themeMode.ts`
- Docs navigation comes from the URL and the nav model, never from stored selection.
  see: `src/routing/hooks.ts`

## React

- Custom hooks are named for the job they do, not the data they touch.
  see: `src/components/Docs/Sidebar/hooks/useFolderCollapse.ts`
- A context hook throws when used outside its provider. see: `src/session/session.tsx`
- Read values at render time and pass them to the handler. Don't read live state at click
  time. see: `src/components/ThemeToggle/ThemeToggle.tsx`
- No effect for a value you can derive. Compute it in render or `useMemo`.
  see: `src/components/PageRouter/PageRouter.tsx`
- Hooks follow the rules of hooks `(lint)`. Missing effect deps warn `(lint)`.
- Small components with one job. Split when a component does two.
  see: `src/components/Playground/PlaygroundBody/`
- Compound components only where a component really has slots. see: `src/ui/Field/Field.tsx`
- Search `src/ui/`, `src/components/` and `src/hooks/` before adding a component or hook.
  Widen an almost-right one instead of adding a near-duplicate.
- An element an e2e test needs takes a `testId` prop and renders it as `data-testid`.

## TypeScript

- `strict` is on. Keep it on. see: `packages/bruno-api-docs/tsconfig.json`
- No new `any` `(lint)`. Real shapes live in `@opencollection/types`.
- Type the boundaries: props, exported functions, parsed input. Let inference do the rest.
- `import type` for type-only imports `(lint)`.
- `@/` points at `src/`. It is the only alias. Sibling files stay relative.
- `x ?? fallback`, not `x || fallback`, when an empty string, `0` or `false` is a real value.
  An empty header or auth token is a real state in an API client.
- `===` only `(lint)`. No `console.log` `(lint)`; `console.warn` and `console.error` are fine.
- Runtime code imports only from `dependencies`, not `devDependencies` `(lint)`.

## Styling

- Colours and fonts come from `--oc-*` CSS variables only. Hex literals fail lint outside
  `src/theme/` `(lint)`.
- Colours are literal only in `src/theme/tokens/`. `src/styles/theme.generated.css` is
  generated by `npm run gen:theme`; never edit it by hand.
- Styles live in the component's Emotion StyledWrapper file. Tailwind classes are for layout.
  see: `src/components/PageRouter/StyledWrapper.ts`
- Formatting (indent, quotes, semicolons, line length) is `(lint)` and auto-fixed by the
  pre-commit hook. Don't review it by hand.

## Comments

- Zero by default. Good names and small functions say what the code does.
- Write one only for what the code cannot say: a non-obvious reason, an invariant, a
  workaround and the constraint forcing it.
- Never narrate the change (`// added to fix X`). No commented-out code. No ticket ids.

## Tests

- Pin behaviour before you change it. Write the test, see it pass on the old code, then change
  the code. A behaviour change ships with a test that fails without it.
- Assert what survives with exact values, not "is defined" or a substring the fixture already
  has. see: `src/session/workspace.test.ts`
- Assertions are unconditional. No `?.`, `if` or `try` that lets one be skipped.

### Unit (Vitest)

- Specs sit next to the code as `*.spec.ts(x)` or `*.test.ts`. Run in a node environment.
- Components render to static markup through `useRenderToDom` and are queried with the
  helpers in `src/test-utils/dom.ts`. see: `src/hooks/useRenderToDom.ts`
- Wrap components in the one shared `TestProviders`. Don't build providers inline.
  see: `src/test-utils/providers.tsx`
- Storage-dependent code uses `src/test-utils/storage.ts`.
- Clicks, typing, focus and scroll belong in Playwright, not in unit specs.

### E2E (Playwright)

- `e2e/README.md` is the guide. Page objects in `e2e/pages/`, components in
  `e2e/components/`, fixtures in `e2e/playwright/`. Specs never call `new`.
- Locate by `data-testid` only. Never by styling class, tag or index.
- Every `expect` lives in the spec. Page objects expose elements and actions.
- No `page.waitForTimeout`. Use auto-retrying `expect`. No `test.only`, no `page.pause()`.
- No serial mode unless the spec says why tests can't run in parallel.
- Fixture collections live in `src/e2eFixtures/` and mount via `?fixture=`.
  see: `src/dev.tsx`
- Locally, run only the specs your change touches. CI runs everything.

## Repo rules

- **Never rename public names.** Storage keys `oc-docs.theme`, `oc-docs.env`,
  `oc-docs:docsSidebarWidth`, `oc-docs:playgroundSidebarWidth`, the `.oc-playground` class
  and the bundle file names stay as they are. Renaming a key silently drops every user's
  saved theme, env and sidebar widths.
- **Public API stays stable.** `Bruno.apiDocs(target, { content })` and `updateCollection`,
  `updateOptions`, `destroy`. see: `src/standalone.ts`
- **Changesets.** Every change to the package carries a changeset: `npm run changeset` at
  the root. see: `.changeset/config.json`
- **Release branches.** PRs target the active `release/vX.Y.0` branch, never `main`.
  Releases are manual.
- **Auth trap.** Only basic, bearer, apikey and digest reach the wire. awsv4, ntlm and wsse
  are modelled and interpolated, then silently dropped. Check this before debugging a 401.
  see: `src/runner/RequestExecutor.ts`
- **API client lens.** Reason about requests, responses, auth, headers, bodies and
  environments as an API client would, not as a document viewer.
