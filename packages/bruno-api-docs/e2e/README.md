# End-to-end tests

Playwright tests for the docs app. They open the app in a real browser and check that
what a person sees on the page is correct.

Two rules shape every test here:

1. **Tests read like documentation.** The title says, in plain English, what the page
   does; the body confirms it.
2. **Elements are located by `data-testid`.** The app sets a stable test id on each
   meaningful element (via the components' `testId` props); tests target those, never
   styling classes. Rendered-Markdown internals — which have no test id — are matched
   by role/tag within their test-id'd container.

## What's tested

| Area | Spec |
|------|------|
| Collection Overview — version/name, stat counts, environments, configuration | `tests/overview/overview.spec.ts` |
| Overview documentation — rendered Markdown | `tests/overview/overview-documentation.spec.ts` |
| Request page — details (breadcrumb, title, method/URL, description, params, auth, code snippet) | `tests/request/request-details.spec.ts` |
| Request page — Examples | `tests/request/request-examples.spec.ts` |
| Request page — Execution Context (scripts, variables, asserts, tests) | `tests/request/request-execution-context.spec.ts` |
| Script page — title, breadcrumb, source code | `tests/script/script.spec.ts` |
| Light/dark theme switch | `tests/theming/theme-toggle.spec.ts` |
| Playground requests on the wire — headers sent, CORS-blocked requests | `tests/playground/request-on-the-wire.spec.ts` |

## Running the tests

```sh
npm run test:e2e       # run headless
npm run test:e2e:ui    # run in Playwright's interactive UI
```

Playwright starts the dev server and the test server for you (see `webServer` in
`playwright.config.ts`).

## Test server

`server/test-server.mjs` is a small Node server with no dependencies, on
`http://127.0.0.1:3900` (`testServerURL` in `config/app.config.ts`). It is a different
origin from the app, so the browser applies real CORS rules to every request the
playground sends to it.

| Route | Returns |
|-------|---------|
| `/echo` | 200, JSON of the method, path, query, headers and body it received |
| `/cors/deny` | 200 with no CORS headers, so the browser blocks it |
| `/health` | 200 `ok`, used by Playwright to know the server is up |

Every route except `/cors/deny` answers CORS and preflight requests. Use it for what the
playground sends over the network; keep `page.route` stubs for tests about how a response
is shown. Run it on its own with `node e2e/server/test-server.mjs`.

## Folder layout

```
e2e/
├── tests/                          # the tests, grouped by feature
│   ├── overview/                   #   Collection Overview page
│   │   ├── overview.spec.ts
│   │   └── overview-documentation.spec.ts
│   ├── request/                    #   Request page
│   │   ├── request-details.spec.ts
│   │   ├── request-examples.spec.ts
│   │   └── request-execution-context.spec.ts
│   ├── script/                     #   Script page
│   │   └── script.spec.ts
│   └── theming/                    #   light/dark theme switch
│       └── theme-toggle.spec.ts
├── pages/                          # one "page object" per screen
│   ├── base.page.ts                #   shared navigation (goto, reload)
│   ├── overview.page.ts            #   OverviewPage — composes its overview/ sections
│   ├── request.page.ts             #   RequestPage — composes its request/ sections
│   └── script.page.ts              #   ScriptPage — breadcrumb, title, source code
├── components/                     # reusable pieces
│   ├── base.component.ts           #   shared base — every component has a `root`
│   ├── markdown.component.ts       #   any block of rendered Markdown
│   ├── secret-value.component.ts   #   a masked value with a reveal toggle
│   ├── theme-toggle.component.ts   #   the light/dark switch
│   ├── sidebar.component.ts        #   the navigation tree (open a request/script)
│   ├── breadcrumb.component.ts     #   the "folder › folder › page" trail
│   ├── overview/                   #   sections specific to the Overview page
│   │   ├── header-section.component.ts
│   │   ├── stats-section.component.ts
│   │   ├── environments-section.component.ts
│   │   └── configuration-section.component.ts
│   ├── request/                    #   sections specific to the Request page
│   │   ├── url-bar.component.ts
│   │   ├── code-snippet.component.ts
│   │   ├── examples.component.ts
│   │   └── execution-context.component.ts
│   └── script/                     #   sections specific to the Script page
│       └── script-content.component.ts
├── playwright/                     # the test harness
│   ├── pages.fixture.ts            #   defines the fixtures
│   └── index.ts                    #   merges them; the single import for specs
├── server/test-server.mjs          # local HTTP server for network tests
├── config/app.config.ts            # base URL, test server URL + how to start the app
└── tsconfig.json                   # TypeScript settings for this folder
```

The Request and Script pages have no URL of their own, so their page objects reach
them by navigating the **sidebar** — `requestPage.open(['billing', 'customers', 'Get
All Customers'])` clicks down the folder trail and waits for the page to render. The
reusable `sidebar` and `breadcrumb` components are shared by both pages.

## The three building blocks

**Page objects** (`pages/`) describe a whole screen. They own navigation (`goto`) and
compose the components a test cares about — the `OverviewPage`, for instance, wires up
the header, stats, environments and configuration sections.

**Components** (`components/`) are the reusable building blocks. Common controls used
across pages — the Markdown renderer, the theme switch — live at the top level; point
one at the element it lives in (its `root`) and it works anywhere that UI appears.
**Sections that belong to a single page live in a subfolder named after it** — the
Overview's header, stats, environments and configuration sections are in
`components/overview/`. (Its documentation section is just the common `MarkdownComponent`
scoped to the `overview-markdown-documentation` container.)

**Fixtures** (`playwright/`) hand a test ready-made page objects and common components:

```ts
test('…', async ({ overviewPage, themeToggle }) => { … });
```

`pages.fixture.ts` defines them; `index.ts` combines them with Playwright's `mergeTests`
and is the single place specs import from. To add a page, drop a new `*.fixture.ts` in
this folder and merge it in `index.ts`.

## Writing a test

Import `test` and `expect` from the `playwright` folder, then pull the page objects and
components you need off the test callback — no `new`, no setup boilerplate:

```ts
import { test, expect } from '../../playwright';

test.describe('Collection Overview', () => {
  test.beforeEach(async ({ overviewPage }) => {
    await overviewPage.goto();
  });

  test('shows the collection name in the header', async ({ overviewPage }) => {
    await expect(overviewPage.header.collectionName).toHaveText('Bruno Testbench');
  });
});
```

Keep the `expect`s in the test. Page objects and sections only expose elements and
actions — the test decides what to check.

## Imports

Every import is a relative path — there are no path aliases. Specs import from the
`playwright` barrel; everything else points straight at the file it needs:

```ts
import { test, expect } from '../../playwright';                    // test → harness
import { OverviewPage } from '../pages/overview.page';               // harness → page
import { MarkdownComponent } from '../components/markdown.component'; // page → component
```
