import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { query } from '../../test-utils/dom';
import KeyValueTable, { type KeyValueRow } from './KeyValueTable';

const noop = () => {};
const rows: KeyValueRow[] = [
  { id: 'r1', name: 'X-Trace', value: 'abc', enabled: true, description: 'Correlation id' }
];

const headerTexts = (root: ReturnType<typeof useRenderToDom>) =>
  root.querySelectorAll('thead th').map((th) => th.text.trim());

describe('KeyValueTable — description column', () => {
  it('renders a Description column and the authored description when showDescription is set', () => {
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} showDescription />);
    expect(headerTexts(root)).toContain('Description');
    expect(root.querySelector('[data-testid="key-value-table-description-input"]')).toBeTruthy();
    expect(root.text).toContain('Correlation id');
  });

  it('omits the Description column by default', () => {
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} />);
    expect(headerTexts(root)).not.toContain('Description');
    expect(root.querySelector('[data-testid="key-value-table-description-input"]')).toBeFalsy();
  });

  it('orders columns name → value → Description → delete when actions are inline', () => {
    // Headers/vars pass inlineActions (delete normally sits inside the value cell); adding the
    // description column pushes delete back out to its own trailing column, matching the app.
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} inlineActions showDescription />);
    const columnClasses = root.querySelectorAll('colgroup col').map((col) => col.getAttribute('class'));
    expect(columnClasses).toEqual(['col-key', 'col-value', 'col-description', 'col-actions']);
  });

  it('makes only the description no-wrap; a multiline value cell keeps soft-wrapping', () => {
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} multilineValues showDescription />);
    const valueClass = query(root, '.col-value .highlight-input').getAttribute('class');
    const descriptionClass = query(root, '.col-description .highlight-input').getAttribute('class');
    expect(valueClass).toContain('highlight-input--multiline');
    expect(valueClass).not.toContain('highlight-input--nowrap');
    expect(descriptionClass).toContain('highlight-input--nowrap');
  });
});

describe('KeyValueTable — resizable columns', () => {
  it('renders a resize handle on every resizable column except the last, by default', () => {
    // Key, Value and Description are resizable; the delete column is fixed and the last resizable
    // column (Description) has no right neighbour to trade width with, so handles land on Key + Value.
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} showDescription />);
    expect(root.querySelectorAll('.col-resize-handle').length).toBe(2);
  });

  it('renders no resize handles when resizableColumns is disabled', () => {
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} showDescription resizableColumns={false} />);
    expect(root.querySelector('.col-resize-handle')).toBeFalsy();
  });
});
