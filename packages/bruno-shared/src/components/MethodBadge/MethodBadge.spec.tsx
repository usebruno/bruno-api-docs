import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { MethodBadge } from './MethodBadge';

const badgeText = (element: React.ReactElement): string =>
  renderToStaticMarkup(element)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();

describe('MethodBadge', () => {
  it('renders the method uppercased', () => {
    expect(renderToStaticMarkup(<MethodBadge method="post" />)).toContain('POST');
  });

  it('defaults to GET when no method is given', () => {
    expect(renderToStaticMarkup(<MethodBadge method="" />)).toContain('GET');
  });

  it.each(['DELETE', 'OPTIONS', 'TRACE', 'CONNECT', 'PURGE'])('spells %s out in full', (method) => {
    expect(badgeText(<MethodBadge method={method} />)).toBe(method);
  });
});
