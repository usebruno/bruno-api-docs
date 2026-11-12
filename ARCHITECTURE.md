# Architecture

How the renderer is put together. Read this before changing code. `CODING_STANDARDS.md` says
how to write the code; this file says where things live and why. Paths are relative to
`packages/bruno-api-docs` unless they start at the repo root.

## What it is

`@usebruno/api-docs` turns a Bruno OpenCollection into an API documentation site with an
embedded playground that sends real requests. Think of it as a small API client, not a document
viewer.

It is not published to npm. It ships as a standalone CDN bundle, `dist-standalone/api-docs.js`
and `dist-standalone/api-docs.css`, built by `vite.config.standalone.ts`. A host page calls
`Bruno.apiDocs(target, { content, ... })` and gets back an object with `updateCollection`,
`updateOptions` and `destroy`.

## Entry points

| Entry | What it does |
|---|---|
| `src/standalone.ts` | The shipped bundle. Defines `Bruno.apiDocs` (and the deprecated `window.OpenCollection`), parses string content, renders `<OpenCollection>` into the target. `updateCollection`/`updateOptions` re-render with new props. |
| `src/dev.tsx` | `npm run dev`. Mounts the sample collection, or a fixture from `src/e2eFixtures/` via `?fixture=`. Also reads `?themeMode`, `?hideThemeSwitcher`, `?hidePlayground`, `?nogit`. e2e runs against this. |
| `src/components/OpenCollection/OpenCollection.tsx` | The root component both entries render. Owns the session, the loader and the router. |

## Load pipeline

`src/components/OpenCollection/OpenCollection.tsx`, `useCollectionLoader`:

1. Input is an object, a YAML/JSON string, a `File`, or an `http(s)` URL (fetched).
2. Text is parsed as YAML, then JSON as a fallback.
3. `hydrateWithUUIDs` (`src/utils/fileUtils.ts`) gives every item a uuid. Uuids are random,
   so a reload or a new collection gives new ones.
4. The hydrated collection becomes the read-only **document** (`DocumentProvider`), seeds the
   **workspace** working copy, and seeds the playground folder state.

States: `idle` → `loading` → `succeeded` or `failed`. Idle and loading show "Loading...",
failed shows the error. A failed or null collection clears the workspace and the playground
selection.

## Who owns what

One owner per fact. Everything else reads it or derives it.

| State | Owner | Survives playground close | Survives reload | On `updateCollection` |
|---|---|---|---|---|
| Document (hydrated snapshot) + nav model | `src/document/document.tsx` | yes | re-loaded | replaced |
| Theme | session, `src/theme/themeMode.ts` | yes | yes, if toggled (`oc-docs.theme`, localStorage) | kept |
| Active env, show vars | session, `src/session/env.ts` | yes | yes, same tab (`oc-docs.env`, sessionStorage) | kept |
| Playground view: selection, orientation, response format/preview | session, `src/session/playground.ts` | yes | no (selection comes back from the URL) | kept |
| Playground folder collapse | session, `src/session/playgroundFolders.ts` | yes | no | re-seeded, open/closed carried over by uuid |
| Docs folder collapse | `src/components/Docs/Sidebar/hooks/useFolderCollapse.ts` (AppShell local state) | yes | no | reset |
| Working copy (playground edits) | workspace, `src/session/workspace.ts` | yes | no | replaced, edits dropped |
| Responses | workspace | yes | no | stay, but keyed by old uuids |
| Run starts | workspace + `src/session/playgroundRuns.ts` | no, close aborts runs | no | n/a |
| Playground deep link: `pg`, `dock`, `pgReq`, `pgEx` | URL query, `src/utils/playgroundDock.ts` | no, close clears all four | yes | kept |

The session is created once per `<OpenCollection>` mount (`src/session/session.tsx`), so two
instances on one page don't share state. Session pieces are small observables
(`src/observable/observable.ts`) read with `useObservable`. The workspace is a set of pure
updaters plus one observable, and deep-freezes its state.

## Routing

- `HashRouter`. Docs pages live in the hash path; playground state lives in the query string,
  so moving between docs pages keeps the playground open (`src/hooks/useDocsNavigate.ts`).
- Slugs come from item names (`src/routing/slug.ts`). Overview is `#/`; built-ins start with
  `~` (`~environments`) so they can't collide with user content.
- The nav model (order, slugs, prev/next, uuid → slug) is built once per document in
  `src/document/document.tsx` from `src/routing/navModel.ts`. Folder toggles don't rebuild it.
- `src/routing/hooks.ts` resolves the current path. `src/components/PageRouter/PageRouter.tsx`
  picks the page. An unknown slug redirects to the overview.

## Docs vs playground

- Navigation (sidebar, slugs, search, prev/next) always comes from the document snapshot.
- Docs page content reads the workspace working copy, falling back to the document. So edits
  made in the playground show on docs pages until reload. EnvSwitcher and the variable
  resolver read the working copy too.
- The playground (`src/components/Playground/`) unmounts on close. Its state lives above it in
  the session and workspace, so edits and the open view survive close, reopen and dock switches.
- Selection is restored from `pgReq`/`pgEx` once per URL value
  (`src/components/Playground/PlaygroundBody/usePlaygroundSelection.ts`).

## Request execution

1. `PlaygroundView` (`src/components/Playground/Content/Views/PlaygroundView/PlaygroundView.tsx`)
   handles Send. `src/session/playgroundRuns.ts` tracks in-flight runs and their abort controllers.
2. `src/runner/index.ts` (`RequestRunner`) merges headers, scripts and auth from the
   collection → folder → request tree, runs the pre-request script, interpolates `{{vars}}`,
   executes, runs the post-response script, then tests and assertions.
3. `src/runner/RequestExecutor.ts` builds the fetch call and writes auth to the wire.
4. HTTP is plain browser `fetch`. No proxy. CORS, mixed content, DNS failures and timeouts
   all arrive as one `TypeError`; `src/runner/classifyRequestError.ts` guesses which from the
   origins.

Interpolation and auth are separate stages. `src/runner/utils/variable-interpolator.ts` fills
`{{var}}` inside auth credentials; the executor applies auth later. Basic, bearer and apikey
become headers or query params. Digest does a 401 challenge round trip
(`src/runner/utils/digest-auth.ts`). awsv4, ntlm and wsse are interpolated and then dropped:
no signing step exists.

Scripts run in a QuickJS sandbox (`src/scripting/sandbox/quickjs/`), driven by
`src/scripting/runtime/script-runtime.ts`. The `bru`, `req` and `res` objects scripts see live
in `src/scripting/utils/`. Variables a script sets flow back into the workspace.

## Theming

- Tokens are TypeScript in `src/theme/tokens/`. `npm run gen:theme` writes
  `src/styles/theme.generated.css` as `--oc-*` custom properties.
- `src/theme/applyTheme.ts` sets `data-theme` on the root element; `src/theme/themeMode.ts` owns
  the mode and persists it when the user toggles.
- Components use CSS variables only. Hex colours fail lint outside `src/theme/`.

## Tests

| Suite | Command | Protects |
|---|---|---|
| Unit (Vitest, node) | `npm run test:run` | Pure logic: updaters, runner, routing, scripting, utils. Components as static markup. |
| Main e2e (Playwright) | `npm run test:e2e` | The app in a browser via `npm run dev` plus `e2e/server/test-server.mjs` on a second origin, so CORS is real. Config: `playwright.config.ts`. |
| Standalone e2e | `npm run test:e2e:standalone` | The built bundle as a host page uses it: `Bruno.apiDocs`, `updateCollection`, `updateOptions`, `destroy`, two instances. Config: `playwright.standalone.config.ts`, specs in `e2e/tests/standalone/`. |

`npm run test:e2e` runs both Playwright configs. Locally, run only the specs your change
touches; CI (repo root `.github/workflows/ci.yml`) runs everything.

## Known traps

- awsv4, ntlm and wsse auth silently do nothing on the wire.
- Every network failure looks the same (`TypeError`); see `src/runner/classifyRequestError.ts`.
- Playground edits live in memory only. Reload or `updateCollection` drops them.
- `description` is `string | { content }`. Read it through the helpers in
  `src/utils/description.ts`, never directly.
- Storage keys, the `.oc-playground` class and the bundle names carry old naming on purpose.
  Never rename them.
