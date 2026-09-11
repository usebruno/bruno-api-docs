---
paths:
  - "packages/bruno-api-docs/src/**/*.spec.ts"
  - "packages/bruno-api-docs/src/**/*.spec.tsx"
  - "packages/bruno-api-docs/src/**/*.test.ts"
  - "packages/bruno-api-docs/src/**/*.test.tsx"
  - "packages/bruno-api-docs/src/test-utils/**"
  - "packages/bruno-api-docs/vitest.config.ts"
---

# Unit Tests (Vitest)

`CODING_STANDARDS.md` §Tests is the source of truth; this is the quick reference.

## Running

```bash
npm run test:run                              # all specs, one-shot (pretest builds the lib bundle)
npm run test:run -- src/utils/cx.spec.ts      # one spec
npm test                                      # watch mode
```

From `packages/bruno-api-docs/`. Config: `vitest.config.ts`, `environment: 'node'`, specs are
`src/**/*.{spec,test}.{ts,tsx}`; `e2e/**` is excluded. The husky pre-commit hook runs the staged
specs.

## Rendering components

Render through `useRenderToDom` and query with `src/test-utils/dom.ts`:

```tsx
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId, query } from '@/test-utils/dom';

const root = useRenderToDom(<Tabs tabs={tabs} testId="example" />);
expect(getByTestId(root, 'example-tab-a').getAttribute('aria-selected')).toBe('true');
expect(queryByTestId(root, 'example-tab-b-panel')).toBeNull();
```

- `getByTestId` / `query` throw when the element is absent, so a missing element fails the test
  with a clear message. Use `queryByTestId` only when asserting absence.
- Older specs assert on raw `renderToStaticMarkup` strings. Leave them until touched; new specs
  use `useRenderToDom`.
- There is no DOM event model here. Clicks, typing, focus, and scroll are Playwright territory.
- Storage-dependent code takes the in-memory `fakeStorage()` from `src/test-utils/storage.ts`.

## Assertions

- Unconditional. No `?.`, `??`, `||`, `if`, or try/catch around or inside an assertion; a guard
  that lets the assertion be skipped turns a failure into a silent pass.
- Assert the unique value the change under test produces, not a substring the fixture already
  carries elsewhere.
- Cover the happy path and the realistic failure paths (malformed collection field, missing
  description, disabled header, empty auth) as an API client would meet them.

## Coverage mapping

For each behaviour the diff adds or changes (new branch, default, UI state, bug fix), name the
spec that exercises it. A bug fix ships with a regression test. Pure helpers in `src/utils/`,
`src/runner/`, `src/scripting/`, and `src/routing/` get a spec file beside them.
