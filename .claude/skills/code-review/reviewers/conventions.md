# Coding standards, readability & hygiene reviewer

**Scope:** all changed files (`**/*`).

Adopt the reviewer persona and return findings in the output contract defined in `_contract.md`.

Review the diff against **`.claude/rules/conventions.md`** (read it; it points to
`CODING_STANDARDS.md`, the code-guidelines source of truth). Report each violation with
`file:line`, severity:

- **suggestion**: readability problems from the rule: unclear or misleading names, unnecessary
  abstraction (indirection that earns no readability or reuse), single-line indirection, `?.`
  where the null case is not handled right there, `x || default` where empty is a real state,
  needless whitespace or diff churn, missing comments on genuinely complex flow.
- **suggestion**: a breach of **Reuse before you write** or **Replacing code leaves nothing
  behind**; confirm what the new code actually renders or reads before calling a leftover dead.
  From the coverage mapping, report only what the diff itself shows: a new branch or default with
  no test, or a changed return or payload shape whose assertions elsewhere were not updated.
- **suggestion**: a comment that narrates the change or restates the code; any comment in a
  `StyledWrapper.ts`; a ticket identifier in code, comments, or test names; commented-out code.
- **suggestion**: a cross-tree relative import (`../../utils/x`) where the `@/*` alias covers the
  target; any `@slices/*` import; a runtime import of a `devDependencies` package.
- **nit**: pure style deviations (indent, quotes, semicolons, trailing commas, arrow parens,
  casing, line length); ESLint auto-fixes most of these, so keep them brief.
