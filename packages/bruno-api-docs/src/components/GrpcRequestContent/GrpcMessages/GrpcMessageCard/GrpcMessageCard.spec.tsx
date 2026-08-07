import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { GrpcMessageCard } from './GrpcMessageCard';

describe('GrpcMessageCard', () => {
  it('renders the title and the message when expanded', () => {
    const html = renderToStaticMarkup(
      <GrpcMessageCard title="Message 1" message='{"sku":"SKU-1001"}' expanded onToggle={() => {}} />
    );
    expect(html).toContain('Message 1');
    expect(html).toContain('SKU-1001');
    expect(html).toContain('aria-expanded="true"');
  });

  it('renders the title but not the message when collapsed', () => {
    const html = renderToStaticMarkup(
      <GrpcMessageCard title="Message 2" message='{"sku":"SKU-1002"}' expanded={false} onToggle={() => {}} />
    );
    expect(html).toContain('Message 2');
    expect(html).not.toContain('SKU-1002');
    expect(html).toContain('aria-expanded="false"');
  });
});
