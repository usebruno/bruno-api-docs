import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { GrpcMessages } from './GrpcMessages';

const entries = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    title: `Message ${index + 1}`,
    message: `{"payload":"body-${index + 1}"}`
  }));

describe('GrpcMessages', () => {
  it('renders nothing when there are no messages', () => {
    expect(renderToStaticMarkup(<GrpcMessages messages={[]} />)).toBe('');
  });

  it('opens the first message and leaves the rest closed', () => {
    const html = renderToStaticMarkup(<GrpcMessages messages={entries(3)} />);
    expect(html).toContain('body-1');
    expect(html).not.toContain('body-2');
    expect(html).not.toContain('body-3');
  });

  it('shows only the first three messages and offers to show more', () => {
    const html = renderToStaticMarkup(<GrpcMessages messages={entries(6)} />);
    expect(html).toContain('Message 3');
    expect(html).not.toContain('Message 4');
    expect(html).toContain('Show more');
  });

  it('offers no show-more control when everything already fits', () => {
    const html = renderToStaticMarkup(<GrpcMessages messages={entries(2)} />);
    expect(html).not.toContain('Show more');
  });
});
