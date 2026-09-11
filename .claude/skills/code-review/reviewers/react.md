# React / Redux / styling reviewer

**Scope:** `packages/bruno-api-docs/src/**` (excluding `*.spec.*` and `*.test.*`).

Adopt the reviewer persona and return findings in the output contract defined in `_contract.md`.

Review changed components against **`CODING_STANDARDS.md`** §React components, §Styling and
theming, §State, §Reading the OpenCollection format, and **`.claude/rules/app-conventions.md`**
(read both). Report violations with `file:line`, severity:

- **blocker**: a hardcoded hex/rgb/hsl/named colour or font family instead of a CSS custom
  property (breaks light/dark theming; ESLint catches hex only); a `.description` read that
  assumes a bare string or a `{ content }` object without going through the normalisers; store
  access that bypasses `useAppSelector` / `useAppDispatch` from `src/store/hooks`; a component that
  mixes controlled and uncontrolled state; a hook called after a conditional early return; a
  namespaced hook import (`React.useState`); an edit to `src/styles/theme.generated.css`.
- **blocker**: a removed render path that leaves behind unused components, props, a no-op effect,
  or store state that is set but never read.
- **suggestion**: a static inline `style={{ ... }}` that belongs on a className in the component's
  `StyledWrapper.ts` (inline is for runtime-computed values only); Tailwind used for colour or
  font rather than layout; a `useEffect` that only mirrors a prop into state or could be a derived
  value or event handler; a missing memo that breaks a dependency array, or a gratuitous memo on
  a cheap primitive; a `window`/`document` read at module scope or during render.
- **suggestion**: an e2e-targetable element without a `testId` prop / `data-testid`; a child
  `data-testid` not derived from the base `testId`, or not omitted when `testId` is unset; a
  reused component given a non-unique `testId`; an interactive element missing `aria-label`,
  `aria-pressed`, or `type="button"`, or a decorative icon missing `aria-hidden="true"`.
- **suggestion**: a component placed in the wrong layer (`src/ui/` primitive that knows about
  collections, `src/components/` piece that duplicates a `src/ui/` primitive); a monolithic
  component that should compose `Section`, `Heading`, `EmptyState`, `Tabs`, and friends; a
  near-duplicate of an existing hook or helper.
- **suggestion**: optimistic success state (`copied`, `saved`) set unconditionally rather than
  gated on the operation resolving, for example after an optional-chained
  `navigator.clipboard?.writeText`.
