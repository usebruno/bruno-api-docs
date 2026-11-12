import { describe, it, expect } from 'vitest';
import { keyValueRowToEntry } from './keyValueRow';

describe('keyValueRowToEntry', () => {
  it('inverts enabled to disabled and carries name/value', () => {
    expect(keyValueRowToEntry({ id: '1', name: 'X-Trace', value: 'abc', enabled: true })).toEqual({
      name: 'X-Trace',
      value: 'abc',
      disabled: false
    });
    expect(keyValueRowToEntry({ id: '1', name: 'X-Trace', value: 'abc', enabled: false })).toEqual({
      name: 'X-Trace',
      value: 'abc',
      disabled: true
    });
  });

  it('writes a non-empty description and omits an empty, whitespace-only or absent one', () => {
    expect(
      keyValueRowToEntry({ id: '1', name: 'X', value: 'v', enabled: true, description: 'why it exists' })
    ).toEqual({ name: 'X', value: 'v', disabled: false, description: 'why it exists' });

    expect(
      keyValueRowToEntry({ id: '1', name: 'X', value: 'v', enabled: true, description: '' })
    ).not.toHaveProperty('description');

    // A whitespace-only description is dropped, not persisted invisibly.
    expect(
      keyValueRowToEntry({ id: '1', name: 'X', value: 'v', enabled: true, description: '   ' })
    ).not.toHaveProperty('description');

    expect(keyValueRowToEntry({ id: '1', name: 'X', value: 'v', enabled: true })).not.toHaveProperty('description');
  });

  it('never persists "[object Object]" for a non-string description', () => {
    expect(
      keyValueRowToEntry({ id: '1', name: 'X', value: 'v', enabled: true, description: { content: 'x' } as unknown as string })
    ).not.toHaveProperty('description');
  });
});
