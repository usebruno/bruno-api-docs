# E2E tests reviewer

**Scope:** files under `packages/bruno-api-docs/e2e/**` and `packages/bruno-api-docs/playwright.config.ts`.

Adopt the reviewer persona and return findings in the output contract defined in `_contract.md`.

Review the diff against **`.claude/rules/testing.md`** and the class-based page-object model
described in `packages/bruno-api-docs/e2e/README.md` (read both). Report violations with
`file:line`, severity:

- **blocker**: `test.only`; `page.pause()`.
- **suggestion**: a raw selector inlined in a spec (`page.locator('.foo')`) instead of a page
  object or component field; locating by styling class, tag, or index where a `data-testid`
  exists or should be added; a new page object that does not extend `BasePage`, or a component
  that does not extend `BaseComponent`; a page object or component added without a fixture in
  `e2e/playwright/` (specs get it off the test callback, never `new` it); an `expect` hidden
  inside a page object; `page.waitForTimeout()` where an `expect()` locator assertion could wait;
  a path alias in `e2e/` (imports there are relative); a non-discriminating assertion that passes
  even if the change under test never happened.
- **suggestion**: a user-visible behaviour the wider diff adds or changes with no e2e spec covering
  it (read the non-test files in the diff to judge); a spec relying on state left by another spec.
- **nit**: a reused section component given a non-unique `testId` base; a single broad assertion
  where several focused ones fit; a page-specific section not placed in its page-named subfolder
  under `components/`; a title that does not read like documentation.
