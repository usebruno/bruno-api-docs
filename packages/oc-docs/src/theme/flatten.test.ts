import { describe, it, expect } from 'vitest';
import { flattenTheme } from './flatten';

describe('flattenTheme', () => {
  it('flattens nested paths to kebab-case --oc-* vars', () => {
    const out = flattenTheme({
      bg: '#fff',
      sidebar: { bg: '#fafafa', focusBorder: '#ccc' },
      request: { methods: { get: '#2563eb' } },
    });
    expect(out['--oc-bg']).toBe('#fff');
    expect(out['--oc-sidebar-bg']).toBe('#fafafa');
    expect(out['--oc-sidebar-focus-border']).toBe('#ccc');
    expect(out['--oc-request-methods-get']).toBe('#2563eb');
  });

  it('skips non-stringifiable / nullish leaves', () => {
    const out = flattenTheme({ a: undefined as unknown as string, b: 1 });
    expect(out['--oc-a']).toBeUndefined();
    expect(out['--oc-b']).toBe('1');
  });
});
