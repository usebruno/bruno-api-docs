import { describe, it, expect } from 'vitest';
import { methodColorVars, getMethodColorVar } from './methodColors';

const MUTED = 'var(--oc-colors-text-muted)';

describe('getMethodColorVar', () => {
  it('returns the token for a known method, case-insensitively', () => {
    expect(getMethodColorVar('GET')).toBe('var(--oc-request-methods-get)');
    expect(getMethodColorVar('post')).toBe('var(--oc-request-methods-post)');
    expect(getMethodColorVar('Delete')).toBe('var(--oc-request-methods-delete)');
  });

  it('still resolves colours for non-HTTP protocols kept in the map', () => {
    expect(getMethodColorVar('GRAPHQL')).toBe(methodColorVars.GRAPHQL);
    expect(getMethodColorVar('ws')).toBe(methodColorVars.WS);
  });

  it('falls back to the muted token for unknown or missing methods', () => {
    expect(getMethodColorVar('FOOBAR')).toBe(MUTED);
    expect(getMethodColorVar('')).toBe(MUTED);
    expect(getMethodColorVar(undefined)).toBe(MUTED);
  });

  it.each(['TRACE', 'CONNECT'])('falls back to the muted token for %s', (method) => {
    expect(getMethodColorVar(method)).toBe(MUTED);
  });
});
