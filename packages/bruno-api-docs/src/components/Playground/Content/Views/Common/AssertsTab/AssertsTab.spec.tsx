import React from 'react';
import { describe, it, expect } from 'vitest';
import type { Assertion } from '@opencollection/types/common/assertions';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, headerTexts } from '@/test-utils/dom';
import { AssertsTab } from './AssertsTab';

const noop = () => {};

describe('AssertsTab', () => {
  it('defaults the operator trigger to the first operator when a row has none', () => {
    const root = useRenderToDom(
      <AssertsTab assertions={[{ expression: 'res.status', value: '200' } as Assertion]} onAssertionsChange={noop} />
    );
    expect(getByTestId(root, 'assertion-operator-0').text).toContain('equals');
  });

  it('shows the stored operator label when one is set', () => {
    const root = useRenderToDom(
      <AssertsTab
        assertions={[{ expression: 'res.status', operator: 'gt', value: '1' } as Assertion]}
        onAssertionsChange={noop}
      />
    );
    expect(getByTestId(root, 'assertion-operator-0').text).toContain('greater than');
  });

  it('labels the columns Expr, Value, Operator and Description like the app', () => {
    const root = useRenderToDom(
      <AssertsTab assertions={[{ expression: 'res.status', operator: 'eq', value: '200' }]} onAssertionsChange={noop} />
    );
    expect(headerTexts(root).slice(0, 4)).toEqual(['Expr', 'Value', 'Operator', 'Description']);
  });

  it('shows a Description column with the authored assertion description', () => {
    const root = useRenderToDom(
      <AssertsTab
        assertions={[{ expression: 'res.body.id', operator: 'eq', value: '1', description: 'Echoes the requested id' }]}
        onAssertionsChange={noop}
      />
    );
    expect(headerTexts(root)).toContain('Description');
    expect(getByTestId(root, 'key-value-table-description-input').text).toBe('Echoes the requested id');
  });
});
