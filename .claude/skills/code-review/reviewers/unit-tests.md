# Unit tests reviewer

**Scope:** `packages/bruno-api-docs/src/**/*.{spec,test}.{ts,tsx}` and
`packages/bruno-api-docs/src/test-utils/**`.

Adopt the reviewer persona and return findings in the output contract defined in `_contract.md`.

Review the diff against **`.claude/rules/unit-testing.md`** and `CODING_STANDARDS.md` §Tests
(read both). Also read the non-test files in the same diff so you can map behaviours to specs.
Report with `file:line`, severity:

- **blocker**: a conditional assertion (`?.`, `??`, `||`, `if`, or try/catch that lets an
  `expect` be skipped or an error be swallowed); a bug fix in the diff with no regression test.
- **suggestion**: a behaviour the diff adds or changes (new branch, default, UI state) with no spec
  exercising it; name the behaviour and the kind of test missing. A green suite is not evidence
  of coverage; the mapping is.
- **suggestion**: a new component spec asserting on raw `renderToStaticMarkup` strings instead of
  `useRenderToDom` + `src/test-utils/dom.ts`; a DOM-interaction test (click, type, focus) that
  belongs in Playwright; a non-discriminating assertion that passes even if the change never
  happened; a test that only mirrors the implementation instead of observable output.
- **nit**: a test name that does not describe the behaviour; copy-pasted setup where an existing
  helper or `test-utils` function fits; a ticket identifier in a test name.
