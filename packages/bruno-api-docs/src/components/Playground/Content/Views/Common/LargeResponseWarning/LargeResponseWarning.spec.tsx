import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../../../../../utils/exampleResponse';
import { LargeResponseWarning } from './LargeResponseWarning';

describe('LargeResponseWarning', () => {
  const responseSize = 11 * 1024 * 1024;

  it('renders the warning title', () => {
    const html = renderToStaticMarkup(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    expect(html).toContain('Large Response Warning');
  });

  it('renders the formatted current response size', () => {
    const html = renderToStaticMarkup(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    expect(html).toContain(formatBytes(responseSize));
  });

  it('renders a View button with the reveal test id', () => {
    const html = renderToStaticMarkup(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    expect(html).toContain('data-testid="large-response-view"');
    expect(html).toContain('>View</button>');
  });
});
