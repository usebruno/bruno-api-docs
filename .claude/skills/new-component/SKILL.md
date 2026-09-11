---
name: new-component
description: Scaffold a new React component or page in packages/bruno-api-docs following the
  repo's folder, styling, test-id, and unit-test conventions. Use when adding UI to the docs
  renderer or playground.
---

# Scaffold a component

Create a component in `packages/bruno-api-docs` that matches `CODING_STANDARDS.md` §React
components, §Styling and theming, §Tests, and `.claude/rules/app-conventions.md`. Do not deviate
from these patterns.

## Inputs

- **Name** (PascalCase, e.g. `EnvironmentBadge`).
- **Layer**: primitive with no collection knowledge → `src/ui/<Name>/`; collection-aware reusable
  piece → `src/components/<Name>/`; routed screen → `src/pages/<Name>/`.
- **Needs a test id?** Almost always yes for anything e2e might target.

## Before scaffolding

Search `src/ui/`, `src/components/`, and `src/hooks/` by concept for an existing piece that
already does this; widening it beats a near-duplicate. Read the nearest sibling for composition.

## Steps

1. Create the folder and the three files below (plus `index.ts` only for pages or public entry
   points). Wire real prop types from `@opencollection/types/...`; avoid `any`.
2. Style via Emotion in `StyledWrapper.ts` using CSS custom properties only. No hex literals, no
   comments in the wrapper, no static inline `style`.
3. Run `npm run lint` (root) and `npm run test:run` (package) and fix anything.

### `<Name>.tsx`

```tsx
import React from 'react';
import { StyledWrapper } from './StyledWrapper';

interface <Name>Props {
  testId?: string;
  className?: string;
}

export const <Name>: React.FC<<Name>Props> = ({ testId, className }) => (
  <StyledWrapper className={className} data-testid={testId}>
    <span className="<name>-value" data-testid={testId ? `${testId}-value` : undefined} />
  </StyledWrapper>
);

export default <Name>;
```

### `StyledWrapper.ts`

```ts
import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  color: var(--text-primary);

  .<name>-value {
    color: var(--text-secondary);
  }
`;
```

### `<Name>.spec.tsx`

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { <Name> } from './<Name>';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';

describe('<Name>', () => {
  it('renders the root and derived child test ids', () => {
    const root = useRenderToDom(<<Name> testId="x" />);
    expect(getByTestId(root, 'x-value')).toBeTruthy();
  });

  it('omits test ids when none is given', () => {
    const root = useRenderToDom(<<Name> />);
    expect(queryByTestId(root, 'x-value')).toBeNull();
  });
});
```

Vitest runs in `environment: 'node'`: assert on rendered text, `aria-*`, and `data-testid`
presence. Cover clicks and toggles with Playwright, not here.

### `index.ts` (pages and public entry points only)

```ts
export { <Name> } from './<Name>';
export { default } from './<Name>';
```

## Reminders

- Interactive elements: `type="button"`, `aria-label`, `aria-pressed` for toggles; decorative
  icons `aria-hidden="true"`. See `ui/SecretValue` and `ui/CopyButton`.
- Store access via `useAppSelector` / `useAppDispatch` from `@/store/hooks`; slices via
  `@/store/slices/<slice>`.
- Keep test ids unique per instance when the component is reused across sections.
- Add an e2e component or page object under `e2e/` if the new UI is user-visible
  (`/write-e2e-test`).
