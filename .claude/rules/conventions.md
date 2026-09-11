---
paths:
  - "packages/**/*"
  - "scripts/**/*"
  - "examples/**/*"
---

# Readability and Diff Hygiene

`CODING_STANDARDS.md` is the source of truth for coding standards; read it. This file is the
judgment layer: the readability and hygiene calls a linter cannot make. Code and comments must
read as a natural, permanent part of the project, never as artefacts of the task or session
that produced them.

## Style and formatting

Mechanical style (indent, quotes, semicolons, trailing commas, arrow parens, brace style, line
length) is ESLint-enforced and auto-fixed by `npm run lint:fix`. Note these deviations briefly
rather than dwelling on them. Naming and casing that ESLint cannot repair still warrant attention.

## Readability

- **Names say what they hold.** Concrete subject and type, understandable on first read. Raise an
  unclear or misleading name even when the code is otherwise correct.
- **Reuse before you write.** Search for the existing component, hook, or helper by concept, then
  read the nearest sibling solving the same shape of problem; its call site shows the intended
  composition.
- **Extraction and abstraction.** Extract when it improves readability or serves a clear,
  anticipated reuse; this is not gated on a minimum number of call sites. Avoid only indirection
  that earns nothing: a utility generalised for one site with no foreseeable second user, or
  options added "for later".
- **Single-line indirection.** A one-line function that only forwards to another should be inlined.
- **Optional chaining and falsy defaults.** `?.` only where the null case is handled right there.
  `x || default` only where an empty string, `0`, or `false` genuinely means "unset".
- **Functional, but readable.** Obvious, linear pipelines over deep functional machinery.

## Comments

- **No situational comments.** Nothing that references the change, the task, or the review
  (`// added to fix ...`, `// as requested`, `// per review`). State a reason as a timeless fact
  about the code or link the issue.
- **No obvious comments.** Do not restate the code. If it is self-explanatory, leave it bare.
- **Comment the why.** Non-obvious rationale, invariants, edge cases, a workaround and the
  constraint forcing it, units, a pointer to a spec.
- **No scaffolding or narration.** No `// ... existing code ...`, no TODO-for-me notes, no
  commented-out code, no step-by-step change log in comments.
- **No comments in `StyledWrapper.ts` files.**

## Beyond comments

- **Anything added needs a live consumer in the same change.** No option nobody passes, payload
  field nobody reads, or branch for a state the producer cannot emit.
- **Replacing code leaves nothing behind.** Removing a view or feature also removes its orphaned
  components, props, store wiring, styles, and tests. Confirm what the new code actually renders
  before calling a leftover dead.
- **Minimal diffs.** No unrelated reformatting or whitespace churn.
- **No ticket identifiers** in source, comments, or test names.
