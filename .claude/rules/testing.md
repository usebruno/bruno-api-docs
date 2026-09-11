---
paths:
  - "packages/bruno-api-docs/e2e/**"
  - "packages/bruno-api-docs/playwright.config.ts"
  - "packages/bruno-api-docs/playwright-report/**"
  - "packages/bruno-api-docs/test-results/**"
---

# Playwright E2E Quick Reference

The narrative source of truth is `packages/bruno-api-docs/e2e/README.md`; read it for the full
walkthrough. Tests use a **class-based page-object model**: page objects and components are
classes handed to specs via fixtures, not a functional locator/action pattern.

## Running

```bash
npm run test:e2e                              # all specs, headless; starts the dev server itself
npm run test:e2e:ui                           # Playwright UI
npx playwright test e2e/tests/playground/     # one directory
npx playwright test --headed                  # watch
npx playwright test --debug                   # step debugger
```

From `packages/bruno-api-docs/`. Config: `playwright.config.ts`: `testDir: ./e2e`, one
`chromium` project, `fullyParallel: true`, retries 0 local / 2 CI, one worker in CI,
`trace: 'on-first-retry'`. `webServer` runs `npm run dev` on `http://127.0.0.1:3001`; never
start it by hand. CI runs the suite after lint, unit tests, and both builds pass.

## The three building blocks

Everything lives under `packages/bruno-api-docs/e2e/`:

- **Page objects** (`pages/*.page.ts`) describe a whole screen. Each extends `BasePage` (owns
  `goto`/`reload` and a `root` locator), sets its own `root`, and composes the components a test
  cares about as readonly fields. Screens with no URL of their own expose `open(path: string[])`
  that navigates the sidebar and waits for `root`.
- **Components** (`components/*.component.ts`) are reusable pieces. Each extends
  `BaseComponent` (every component has a `root: Locator`). Common controls (sidebar, markdown,
  tooltip) live at the top level; sections that belong to a single page live in a subfolder
  named after it (`components/overview/`, `components/playground/`, ...). A component derives
  its child locators from `root` or a `testId` base.
- **Fixtures** (`playwright/pages.fixture.ts`, `playwright/digest-mock.fixture.ts`) instantiate
  page objects and components. `playwright/index.ts` merges them with `mergeTests` and
  re-exports `test`/`expect`, the single import for every spec.

## Fixture collections

The dev entry mounts a collection per `?fixture=` value (`folders`, `vars`, `descriptions`,
`qa`) from `src/e2eFixtures/`; no query mounts the sample collection. A spec picks its
collection by navigating to `/?fixture=<name>` (see `e2e/tests/sidebar/sidebar.spec.ts`). Add a
new fixture there only when no existing one covers the shape you need, and name it after the
shape, not the ticket.

## Locating elements

- Locate by `data-testid` through page objects and components, never by styling class, tag, or
  index. Derive child ids from a base (`getByTestId(\`${testId}-text\`)`), see
  `components/secret-value.component.ts`.
- Rendered-Markdown internals have no test id; match them by role within their test-id'd
  container (scope a `MarkdownComponent` to its `root`).
- Stable `getByRole` / accessible-name assertions are fine. If no stable selector exists, add a
  `testId` to the component rather than locating by text.

## Writing a spec

- `import { test, expect } from '../../playwright';`. All imports in `e2e/` are relative; there
  are no path aliases.
- Pull page objects and components off the test callback; no `new` in specs.
- Keep every `expect` in the spec. Page objects and components expose elements and actions only.
- Auto-retrying assertions (`await expect(locator).toBeVisible()`); never assert immediately after
  navigation. Reserve `page.waitForTimeout()` for when no locator assertion can wait.
- Titles read like documentation: what the page does, in plain English.
- Fully parallel: no state shared between specs.

## Common pitfalls

1. Collapsed folders remove their children from the DOM; expand via the sidebar before asserting.
2. A component reused in several sections needs a distinct `testId` base per instance.
3. A raw `page.locator('.foo')` in a spec is a smell; extend a page object or component.
4. `test.only` fails CI (`forbidOnly`); `page.pause()` never ships.
