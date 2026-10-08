import { describe, it, expect } from 'vitest';
import type { Assertion } from '@opencollection/types/common/assertions';
import type { KeyValueRow } from '@/components/KeyValueTable/KeyValueTable';
import { assertionsToRows, rowsToAssertions } from './assertionRows';

describe('assertionsToRows', () => {
  it('maps expression, operator, value and enabled state onto a table row', () => {
    const rows = assertionsToRows([{ expression: 'res.status', operator: 'gt', value: '1', disabled: true }]);
    expect(rows).toEqual([
      { id: 'assertion-0', name: 'res.status', operator: 'gt', value: '1', enabled: false }
    ]);
  });

  it('defaults a missing operator to equals', () => {
    expect(assertionsToRows([{ expression: 'res.status', value: '200' } as Assertion])[0].operator).toBe('eq');
  });

  it('carries a bare-string description onto the row', () => {
    const rows = assertionsToRows([
      { expression: 'res.body.id', operator: 'eq', value: '1', description: 'Echoes the requested id' }
    ]);
    expect(rows[0].description).toBe('Echoes the requested id');
  });

  it('normalizes the object-form description to its text', () => {
    const rows = assertionsToRows([
      { expression: 'res.body.id', operator: 'eq', value: '1', description: { content: 'From an object', type: 'text' } }
    ] as Assertion[]);
    expect(rows[0].description).toBe('From an object');
  });

  it('leaves description undefined when the assertion has none', () => {
    expect(assertionsToRows([{ expression: 'res.status', operator: 'eq', value: '200' }])[0].description).toBeUndefined();
  });
});

describe('rowsToAssertions', () => {
  const row = (overrides: Partial<KeyValueRow>): KeyValueRow => ({
    id: 'assertion-0',
    name: 'res.status',
    operator: 'eq',
    value: '200',
    enabled: true,
    ...overrides
  });

  it('writes the row back as an assertion', () => {
    expect(rowsToAssertions([row({})])).toEqual([
      { expression: 'res.status', operator: 'eq', value: '200', disabled: false }
    ]);
  });

  it('keeps an authored description', () => {
    expect(rowsToAssertions([row({ description: 'Status must be OK' })])[0].description).toBe('Status must be OK');
  });

  it('omits a blank description', () => {
    expect(rowsToAssertions([row({ description: '   ' })])[0]).not.toHaveProperty('description');
  });

  it('drops the value for a unary operator', () => {
    expect(rowsToAssertions([row({ operator: 'isNull', value: 'stale' })])[0].value).toBeUndefined();
  });

  it('falls back to equals when the row has no operator', () => {
    expect(rowsToAssertions([row({ operator: undefined })])[0].operator).toBe('eq');
  });
});
