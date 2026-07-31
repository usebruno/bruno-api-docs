import React, { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SectionNav } from './SectionNav';

describe('SectionNav (the floating section navigator)', () => {
  // It discovers a page's sections by reading the live DOM in a browser effect. During
  // server-side rendering there is no DOM (and effects don't run), so it must quietly render
  // nothing instead of reaching for window/document, which would throw.
  it('renders nothing on the server, where there is no page DOM to read', () => {
    const rootRef = createRef<HTMLDivElement>();
    const html = renderToStaticMarkup(<SectionNav rootRef={rootRef} title="Overview" navKey="overview" />);
    expect(html).toBe('');
  });
});
