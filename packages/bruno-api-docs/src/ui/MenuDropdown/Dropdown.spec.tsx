import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sticky } from 'tippy.js';

// Tippy renders nothing while closed, so intercepting its props is the only way
// to see which plugins the dropdown registered.
const capturedProps: { sticky?: unknown; plugins?: unknown[] }[] = [];

vi.mock('@tippyjs/react', () => ({
  default: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
    capturedProps.push(props as { sticky?: unknown; plugins?: unknown[] });
    return <>{children}</>;
  }
}));

const { Dropdown } = await import('./Dropdown');

const render = (props: Record<string, unknown>) => {
  renderToStaticMarkup(
    <Dropdown icon={<button type="button">open</button>} {...props}>
      <p>content</p>
    </Dropdown>
  );
  return capturedProps[capturedProps.length - 1];
};

describe('Dropdown sticky positioning', () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it('does not follow the trigger unless a caller asks it to', () => {
    const props = render({});
    expect(props.sticky).toBeUndefined();
    expect(props.plugins ?? []).not.toContain(sticky);
  });

  it('registers the plugin when a caller asks for sticky, since tippy ignores the option without it', () => {
    const props = render({ sticky: 'reference' });
    expect(props.sticky).toBe('reference');
    expect(props.plugins).toContain(sticky);
  });

  it('keeps a plugin the caller passed alongside the sticky one', () => {
    const other = { name: 'other', fn: () => ({}) };
    const props = render({ sticky: 'reference', plugins: [other] });
    expect(props.plugins).toContain(other);
    expect(props.plugins).toContain(sticky);
  });

  it('leaves a caller-supplied plugin list alone when sticky is off', () => {
    const other = { name: 'other', fn: () => ({}) };
    const props = render({ plugins: [other] });
    expect(props.plugins).toEqual([other]);
  });
});
