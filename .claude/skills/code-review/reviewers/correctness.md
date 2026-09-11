# Correctness & root-cause reviewer

**Scope:** all changed source (`packages/**`, `scripts/**`), excluding `*.spec.*`, `*.test.*`,
and `packages/bruno-api-docs/e2e/**`.

Adopt the reviewer persona and return findings in the output contract defined in `_contract.md`.

Validate that the change is correct and, for every bug fix, that it addresses the underlying
problem rather than the visible symptom. Surface-level patches that mask a defect without
resolving it are a **blocker**:

- Understand *why* the issue exists before accepting the fix; trace the bug to its origin.
- Flag patches that suppress a symptom (extra null guards, try/catch swallowing, defensive
  re-checks, retries, timeouts, clamping) while leaving the real cause in place. If this defends
  against a bad value, where does the bad value come from, and should it be fixed there?
- A fix at the wrong layer (a UI guard for a data-layer bug, a caller working around a callee's
  contract violation) is a symptom patch; name the correct layer.
- A fix scoped to one reproduction when the same root cause can manifest elsewhere; the correct
  fix usually covers all call sites.
- When a fix looks like a workaround, say so and name the deeper change that would resolve it.
- Ordinary correctness: off-by-one and boundary errors, unhandled promise rejections and missing
  `await`, swallowed errors, wrong null/undefined handling, edge cases the change introduces.
- **`x || default` on a field whose absence is meaningful.** For an API client, a deliberately
  empty auth token, param, or header is a real state. Falsy-coalescing fabricates a value and
  erases the distinction; use `??` or an explicit `undefined` check.
- **Twin paths.** Docs pages and the playground render the same collection from separate slices
  (`store/slices/docs.ts`, `store/slices/playground.ts`). A change that touches how one reads a
  field (description, auth, params, body) must be checked against the other; divergence is a bug.
- **Format unions.** `description` is string or `{ content }`; request shapes differ per protocol.
  Direct property access that assumes one shape is a **blocker** when the other shape reaches it.
