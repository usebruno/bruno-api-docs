---
name: write-e2e-test
description: Write a Playwright E2E test for Bruno API Docs in the class-based page-object style.
  Use when adding or modifying tests under packages/bruno-api-docs/e2e/, creating a new test
  suite, or reproducing a bug as an e2e spec.
---

# Writing an E2E test

Read `.claude/rules/testing.md` first for the quick reference, and
`packages/bruno-api-docs/e2e/README.md` for the full narrative. Tests use a **class-based
page-object model**: page objects and components are classes handed to specs via fixtures. Specs
never call `new` and never inline a raw selector. Run everything from `packages/bruno-api-docs/`.

## The model

- **Page object** (`e2e/pages/<name>.page.ts`): a class extending `BasePage`, describing one
  screen. It sets its own `root`, composes the components a test needs as readonly fields, and
  owns navigation: `goto(path)` for screens with a URL, `open(path: string[])` for screens reached
  through the sidebar.
- **Component** (`e2e/components/<name>.component.ts`): a class extending `BaseComponent`
  (every component has a `root: Locator`). Common controls live at the top level; sections that
  belong to a single page go in a subfolder named after the page (`components/overview/`,
  `components/playground/`, ...). Derive child locators from `root` or a `testId` base; see
  `components/secret-value.component.ts`.
- **Fixture** (`e2e/playwright/pages.fixture.ts`): instantiates each page object and component
  and exposes it to specs. `e2e/playwright/index.ts` merges fixtures with `mergeTests` and
  re-exports `test`/`expect`.

## Steps

1. **Pick the fixture collection.** The dev entry mounts `src/e2eFixtures/*` via
   `/?fixture=folders|vars|descriptions|qa`; no query mounts the sample collection. Reuse one
   that already has the shape you need. Add a new fixture only when none does, named after the
   shape (`descriptionsCollection`), never after a ticket.
2. **Place the spec** at `e2e/tests/<area>/<name>.spec.ts`, reusing an existing area folder
   (`overview/`, `request/`, `playground/`, `sidebar/`, `search/`, `environments/`, ...) or
   adding one.
3. **Add or reuse a page object.** If the screen has one in `e2e/pages/`, use it. Otherwise
   create `<name>.page.ts` extending `BasePage`, set `root`, compose its components, add
   navigation.
4. **Add or reuse components.** Extract each meaningful UI section into a component extending
   `BaseComponent` rather than putting locators on the page object; page-specific sections go in
   the page's subfolder under `components/`.
5. **Register the fixture** in `e2e/playwright/pages.fixture.ts` so specs receive it off the
   test callback.
6. **Locate by `data-testid`.** `page.getByTestId('...')`; derive child ids from a base. If the
   app has no stable id for what you need, add a `testId` prop to the component (see
   `.claude/rules/app-conventions.md`) rather than locating by class or text. Rendered-Markdown
   internals are matched by role scoped within their test-id'd container.
7. **Write the spec.** `import { test, expect } from '../../playwright';` (relative; no aliases in
   `e2e/`). Pull objects off the callback: `test('…', async ({ requestPage }) => { … })`. Navigate
   via `goto`/`open` in `beforeEach`. Keep every `expect` in the spec. Title it in plain English:
   what the page does.
8. **Use auto-retrying assertions** (`await expect(locator).toBeVisible()`, `toHaveText`,
   `toHaveAttribute`); never assert immediately after navigation. Reserve `page.waitForTimeout()`
   for when no locator assertion can wait.
9. **Run it**: `npx playwright test e2e/tests/<area>/<name>.spec.ts` (the dev server starts via
   `webServer`). Debug with `npm run test:e2e:ui`, `--headed`, or `--debug`.

## Checklist before done

- [ ] Spec imports `test`/`expect` from `../../playwright` and gets objects off the callback
- [ ] No `new` in the spec; no raw selectors; everything via a page object or component field
- [ ] Elements located by `data-testid` (added to the component if missing), not styling classes
- [ ] New page object extends `BasePage`; new component extends `BaseComponent`; fixture registered
- [ ] Page-specific sections live in the page's subfolder under `components/`
- [ ] Reused components get a unique `testId` base per instance
- [ ] Folders expanded via the sidebar before asserting on their children
- [ ] Auto-retrying assertions; no `test.only`, no `page.pause()`, no ticket ids in names
