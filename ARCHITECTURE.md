# Architecture

How the renderer is put together. Read this before changing code. `CODING_STANDARDS.md` says
how to write the code; this file says where things live and why. Paths are relative to
`packages/` unless they start at the repo root.

## What it is

`@usebruno/api-docs` turns a Bruno OpenCollection into an API documentation site with an
embedded playground that sends real requests. Think of it as a small API client, not a document
viewer.

It is not published to npm. It ships as a standalone CDN bundle built by
`bruno-api-docs/vite.config.standalone.ts`. A host page calls
`Bruno.apiDocs(target, { content, ... })` and gets back an object with `updateCollection`,
`updateOptions` and `destroy`.

## Packages

Three npm workspaces. Only `@usebruno/api-docs` ships; the other two are private and end up
inside its build.

| Package | Folder | What lives there |
|---|---|---|
| `@usebruno/api-docs` | `bruno-api-docs/` | The docs view (pages, sidebar, search, topbar), the playground dock shell (`bruno-api-docs/src/components/Playground/`), the standalone CDN entry, the dev entry and all e2e. |
| `@usebruno/api-playground` | `bruno-api-playground/` | `PlaygroundBody` and everything under it, the request runner (`bruno-api-playground/src/runner/`), the QuickJS scripting (`bruno-api-playground/src/scripting/`), the libraries bundle and the CDN build of the playground. |
| `@usebruno/api-shared` | `bruno-shared/` | What both need: session, document, observable, routing, theme and styles (`gen:theme`), ui primitives, shared components, hooks, utils and the unit test utils. |

### The boundary

- Shared imports nothing from docs or playground.
- Playground imports only from shared, never from docs.
- Docs imports playground types only. The one value import is the lazy
  `import('@usebruno/api-playground')` in `bruno-api-docs/src/components/Playground/load.ts`.

ESLint enforces all three with `no-restricted-imports` in the repo root `eslint.config.mjs`.
The rule does not see dynamic `import()`, which is why the one lazy import passes.

Cross-package imports use the package name (`@usebruno/api-shared/session/session`). The
`@/` alias exists only in docs. Shared exports a few barrels (`./hooks`, `./constants`,
`./routing`, `./ui/MenuDropdown`, `./assets/icons`) and otherwise one file per path. There is no
single shared barrel, because it would load Monaco eagerly.

## Entry points

| Entry | What it does |
|---|---|
| `bruno-api-docs/src/standalone.ts` | The shipped bundle. Defines `Bruno.apiDocs` (and the deprecated `window.OpenCollection`), parses string content, renders `<OpenCollection>` into the target. `updateCollection`/`updateOptions` re-render with new props. |
| `bruno-api-docs/src/dev.tsx` | `npm run dev`. Mounts the sample collection, or a fixture from `bruno-api-docs/src/e2eFixtures/` via `?fixture=`. Also reads `?themeMode`, `?hideThemeSwitcher`, `?hidePlayground`, `?nogit`. e2e runs against this. |
| `bruno-api-docs/src/components/OpenCollection/OpenCollection.tsx` | The root component both entries render. Owns the session, the loader and the router. |
| `bruno-api-playground/src/index.ts` | The playground's only export: `PlaygroundBody` as the default. |

## How the playground loads

`bruno-api-docs/src/components/Playground/Playground.tsx` is the dock shell. It wraps
`lazy(() => loadPlayground())` in an `ErrorBoundary` and `Suspense`. Nothing loads until the
playground opens, from a Try click or a deep link. While it loads you see `playground-loading`;
if it fails you see `playground-load-error`.

- **Dev, unit tests, `npm run build`**: `load.ts` is a plain ESM `import()`. One module graph,
  so docs and playground share every module automatically.
- **Standalone CDN build**: the `playground-cdn` plugin in
  `bruno-api-docs/vite.config.standalone.ts` swaps `./load` for `./loadCdn`, copies the hashed
  playground file from `bruno-api-playground/dist-cdn/` into `dist-standalone/`, and defines its
  name as `__API_PLAYGROUND_FILE__`.
- `bruno-api-docs/src/components/Playground/loadCdn.ts` fills `window.Bruno.__rt`, adds a
  `<script>` for the playground file next to the bundle (`new URL(file, import.meta.url)`), and
  resolves with `window.__brunoApiPlayground`. It loads once per page, even with two instances.
  A classic script works cross-origin and from `file://`, which is how exported HTML loads it.
- `bruno-api-playground/vite.config.cdn.ts` builds the playground as an IIFE named
  `__brunoApiPlayground`. Its externals are read from `Bruno.__rt`: react, react-dom,
  react/jsx-runtime, react-router-dom, and these files from `bruno-shared/src/`:
  `bruno-shared/src/session/session.tsx`, `bruno-shared/src/document/document.tsx`,
  `bruno-shared/src/hooks/useVariableResolver.tsx`, `bruno-shared/src/session/playgroundRuns.ts`,
  `bruno-shared/src/ui/CodeEditor/CodeEditor.tsx`, `bruno-shared/src/utils/prism.ts`,
  `bruno-shared/src/utils/fakerFunctions.ts` and `bruno-shared/src/utils/dataFormatter.ts`.

Why externals: a React context only works if provider and consumer use the same context
object, and module state (in-flight runs, Monaco completions, Prism grammars) only works if
there is one copy. So React, the router and the shared modules that hold contexts or page-wide
state must be the instance already in `api-docs.js`. Everything else from shared is bundled into
the playground file again. That costs bytes, not correctness.

A shared module that starts holding a context or module state, and that the playground uses,
must be added to both the externals in `vite.config.cdn.ts` and `Bruno.__rt` in `loadCdn.ts`.

## Load pipeline

`bruno-api-docs/src/components/OpenCollection/OpenCollection.tsx`, `useCollectionLoader`:

1. Input is an object, a YAML/JSON string, a `File`, or an `http(s)` URL (fetched).
2. Text is parsed as YAML, then JSON as a fallback.
3. `hydrateWithUUIDs` (`bruno-shared/src/utils/fileUtils.ts`) gives every item a uuid. Uuids
   are random, so a reload or a new collection gives new ones.
4. The hydrated collection becomes the read-only **document** (`DocumentProvider`), seeds the
   **workspace** working copy, and seeds the playground folder state.

States: `idle` → `loading` → `succeeded` or `failed`. Idle and loading show "Loading...",
failed shows the error. A failed or null collection clears the workspace and the playground
selection.

## Who owns what

One owner per fact. Everything else reads it or derives it.

| State | Owner | Survives playground close | Survives reload | On `updateCollection` |
|---|---|---|---|---|
| Document (hydrated snapshot) + nav model | `bruno-shared/src/document/document.tsx` | yes | re-loaded | replaced |
| Theme | session, `bruno-shared/src/theme/themeMode.ts` | yes | yes, if toggled (`oc-docs.theme`, localStorage) | kept |
| Active env, show vars | session, `bruno-shared/src/session/env.ts` | yes | yes, same tab (`oc-docs.env`, sessionStorage) | kept |
| Playground view: selection, orientation, response format/preview | session, `bruno-shared/src/session/playground.ts` | yes | no (selection comes back from the URL) | kept |
| Playground folder collapse | session, `bruno-shared/src/session/playgroundFolders.ts` | yes | no | re-seeded, open/closed carried over by uuid |
| Docs folder collapse | `bruno-api-docs/src/components/Docs/Sidebar/hooks/useFolderCollapse.ts` (AppShell local state) | yes | no | reset |
| Working copy (playground edits) | workspace, `bruno-shared/src/session/workspace.ts` | yes | no | replaced, edits dropped |
| Responses | workspace | yes | no | stay, but keyed by old uuids |
| Run starts | workspace + `bruno-shared/src/session/playgroundRuns.ts` | no, close aborts runs | no | n/a |
| Playground deep link: `pg`, `dock`, `pgReq`, `pgEx` | URL query, `bruno-shared/src/utils/playgroundDock.ts` | no, close clears all four | yes | kept |

The session is created once per `<OpenCollection>` mount (`bruno-shared/src/session/session.tsx`),
so two instances on one page don't share state. Session pieces are small observables
(`bruno-shared/src/observable/observable.ts`) read with `useObservable`. The workspace is a set of
pure updaters plus one observable, and deep-freezes its state.

### Across the boundary

Session, document and workspace all live in shared. Docs owns them: `OpenCollection` creates
the session and renders `SessionProvider`, `DocumentProvider` and the variable resolver
provider. The playground renders inside those providers and reads them with the same hooks
docs uses. It owns no state of its own that outlives it: the dock shell aborts runs and clears
the workspace's in-flight requests when the playground unmounts. In the CDN build this works
only because those modules are externals (see above).

## Routing

- `HashRouter`. Docs pages live in the hash path; playground state lives in the query string,
  so moving between docs pages keeps the playground open
  (`bruno-api-docs/src/hooks/useDocsNavigate.ts`).
- Slugs come from item names (`bruno-shared/src/routing/slug.ts`). Overview is `#/`; built-ins
  start with `~` (`~environments`) so they can't collide with user content.
- The nav model (order, slugs, prev/next, uuid → slug) is built once per document in
  `bruno-shared/src/document/document.tsx` from `bruno-shared/src/routing/navModel.ts`. Folder
  toggles don't rebuild it.
- `bruno-api-docs/src/routing/hooks.ts` resolves the current path.
  `bruno-api-docs/src/components/PageRouter/PageRouter.tsx` picks the page. An unknown slug
  redirects to the overview.

## Docs vs playground

- Navigation (sidebar, slugs, search, prev/next) always comes from the document snapshot.
- Docs page content reads the workspace working copy, falling back to the document. So edits
  made in the playground show on docs pages until reload. EnvSwitcher and the variable
  resolver read the working copy too.
- The playground unmounts on close. Its state lives above it in the session and workspace, so
  edits and the open view survive close, reopen and dock switches.
- Selection is restored from `pgReq`/`pgEx` once per URL value
  (`bruno-api-playground/src/components/Playground/PlaygroundBody/usePlaygroundSelection.ts`).

## Request execution

All of this is in `bruno-api-playground`.

1. `PlaygroundView`
   (`bruno-api-playground/src/components/Playground/Content/Views/PlaygroundView/PlaygroundView.tsx`)
   handles Send. `bruno-shared/src/session/playgroundRuns.ts` tracks in-flight runs and their
   abort controllers.
2. `bruno-api-playground/src/runner/index.ts` (`RequestRunner`) merges headers, scripts and auth
   from the collection → folder → request tree, runs the pre-request script, interpolates
   `{{vars}}`, executes, runs the post-response script, then tests and assertions.
3. `bruno-api-playground/src/runner/RequestExecutor.ts` builds the fetch call and writes auth to
   the wire.
4. HTTP is plain browser `fetch`. No proxy. CORS, mixed content, DNS failures and timeouts all
   arrive as one `TypeError`; `bruno-api-playground/src/runner/classifyRequestError.ts` guesses
   which from the origins.

Interpolation and auth are separate stages.
`bruno-api-playground/src/runner/utils/variable-interpolator.ts` fills `{{var}}` inside auth
credentials; the executor applies auth later. Basic, bearer and apikey become headers or query
params. Digest does a 401 challenge round trip
(`bruno-api-playground/src/runner/utils/digest-auth.ts`). awsv4, ntlm and wsse are interpolated
and then dropped: no signing step exists.

Scripts run in a QuickJS sandbox (`bruno-api-playground/src/scripting/sandbox/quickjs/`), driven
by `bruno-api-playground/src/scripting/runtime/script-runtime.ts`. The `bru`, `req` and `res`
objects scripts see live in `bruno-api-playground/src/scripting/utils/`. Variables a script sets
flow back into the workspace.

## Theming

- Tokens are TypeScript in `bruno-shared/src/theme/tokens/`. `npm run gen:theme` (in shared;
  docs forwards it) writes `bruno-shared/src/styles/theme.generated.css` as `--oc-*` custom
  properties.
- `bruno-shared/src/theme/applyTheme.ts` sets `data-theme` on the root element;
  `bruno-shared/src/theme/themeMode.ts` owns the mode and persists it when the user toggles.
- Components use CSS variables only. Hex colours fail lint outside the theme folder.

## Build outputs

`npm run build:standalone` in docs runs the playground's `build:cdn` first, then the docs
standalone build. It writes `bruno-api-docs/dist-standalone/`:

| File | Size (gzip) | What |
|---|---|---|
| `api-docs.js` | 4.8 MB (1.5 MB) | UMD, what hosts load as a classic script. Docs, shell, shared. |
| `api-docs.esm.js` | 6.8 MB (1.8 MB) | ES module build of the same. |
| `api-docs.css` | 95 KB (14 KB) | All styles. |
| `api-playground-<hash>.js` | 4.5 MB (1.5 MB) | The playground, loaded on first open. |

Sizes are from this branch's build and will drift. The playground file name is hashed, so a new
build gives a new name.

### Deploy requirement

The builder (`teambruno/bruno-api-docs-builder`, `deploy-latest.yml`) today syncs every file
with a one-year cache and `--delete`. After the split that breaks: a browser holding an old
`api-docs.js` asks for an old `api-playground-<hash>.js` that `--delete` removed, and the
playground fails to load. Before this ships, the builder must:

- upload `api-playground-*.js` as immutable and never delete old ones,
- serve `api-docs.js`, `api-docs.esm.js` and `api-docs.css` with a short cache,
- keep `--delete` for everything else, with those files excluded.

## Tests

| Suite | Command | Protects |
|---|---|---|
| Unit (Vitest, node) | `npm run test:run` at the root runs every package. One package: `npm run test:run -w @usebruno/api-shared` (or `api-playground`, `api-docs`). | Each package's own specs, next to its code. Shared: session, workspace, routing, theme, utils. Playground: runner, scripting, playground views. Docs: pages, hooks, `standalone.ts`, `dev.tsx`, `loadCdn.ts`. Components render as static markup. |
| Main e2e (Playwright) | `npm run test:e2e` in docs | The app in a browser via `npm run dev` plus `bruno-api-docs/e2e/server/test-server.mjs` on a second origin, so CORS is real. Config: `bruno-api-docs/playwright.config.ts`. |
| Standalone e2e | `npm run test:e2e:standalone` in docs | The built bundle as a host page uses it: `Bruno.apiDocs`, `updateCollection`, `updateOptions`, `destroy`, two instances. Config: `bruno-api-docs/playwright.standalone.config.ts`, specs in `bruno-api-docs/e2e/tests/standalone/`. |

Two standalone specs guard the split:

- `bruno-api-docs/e2e/tests/standalone/exported-html.spec.ts` loads HTML files shaped like
  Bruno's "Generate Documentation" output (old and new mount call) with the bundle on another
  origin and no CORS. It catches a bundle that stops working as a cross-origin classic script.
- `bruno-api-docs/e2e/tests/standalone/playground-lazy-load.spec.ts` checks the playground file
  loads only on Try or a deep link, once per page, and that a missing file shows the load error.

All e2e lives in docs. Unit specs live with their code. `npm run test:e2e` runs both Playwright
configs. Locally, run only the specs your change touches; CI (repo root
`.github/workflows/ci.yml`) runs everything.

## Known traps

- awsv4, ntlm and wsse auth silently do nothing on the wire.
- Every network failure looks the same (`TypeError`); see
  `bruno-api-playground/src/runner/classifyRequestError.ts`.
- Playground edits live in memory only. Reload or `updateCollection` drops them.
- `description` is `string | { content }`. Read it through the helpers in
  `bruno-shared/src/utils/description.ts`, never directly.
- Storage keys, the `.oc-playground` class and the bundle names carry old naming on purpose.
  Never rename them.
- A shared module with a context or module state, missing from the CDN externals, works in dev
  and unit tests and breaks only in the standalone build. The standalone e2e is what catches it.
