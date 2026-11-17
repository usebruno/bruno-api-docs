import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, headerTexts, query, queryByTestId } from '@/test-utils/dom';
import KeyValueTable, { type KeyValueRow } from './KeyValueTable';

const noop = () => {};
const rows: KeyValueRow[] = [
  { id: 'r1', name: 'X-Trace', value: 'abc', enabled: true, description: 'Correlation id' }
];

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

describe('KeyValueTable — a row that has a value but no name', () => {
  const valueOnlyRow: KeyValueRow[] = [{ id: 'r1', name: '', value: 'orphan', enabled: true }];

  it('treats it as a real row: it gets a checkbox and a blank row appears underneath', () => {
    const root = useRenderToDom(<KeyValueTable data={valueOnlyRow} onChange={noop} showEnabled />);

    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    expect(root.querySelectorAll('tbody tr.empty-row').length).toBe(1);
    expect(root.querySelectorAll('tbody input[type="checkbox"]').length).toBe(1);
  });

  it('leaves a row that is empty in both fields as the trailing blank, with no checkbox', () => {
    const root = useRenderToDom(<KeyValueTable data={[]} onChange={noop} showEnabled />);

    expect(root.querySelectorAll('tbody tr').length).toBe(1);
    expect(root.querySelectorAll('tbody tr.empty-row').length).toBe(1);
    expect(root.querySelectorAll('tbody input[type="checkbox"]').length).toBe(0);
  });
});

describe('KeyValueTable: first column header alignment', () => {
  it('flags the table when rows carry an enable checkbox, so the header indents past it', () => {
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} />);
    expect(getByTestId(root, 'key-value-table-table').classList.contains('key-value-table--with-toggle')).toBe(true);
  });

  it('does not flag the table when the checkbox column is hidden', () => {
    const root = useRenderToDom(<KeyValueTable data={rows} onChange={noop} showEnabled={false} />);
    expect(getByTestId(root, 'key-value-table-table').classList.contains('key-value-table--with-toggle')).toBe(false);
  });
});

describe('KeyValueTable — rowConfig', () => {
  const mixedRows: KeyValueRow[] = [
    { id: 's1', name: '', value: '', enabled: true, rowType: 'section' },
    { id: 'i1', name: 'X-Tenant', value: 'acme', enabled: true, description: 'Tenant', rowType: 'inherited' },
    { id: 'r1', name: 'X-Trace', value: 'abc', enabled: true }
  ];
  const rowConfig = {
    isEditable: (row: KeyValueRow) => !row.rowType,
    isCheckboxDisabled: (row: KeyValueRow) => row.rowType === 'inherited',
    className: (row: KeyValueRow) => (row.rowType ? `${row.rowType}-row` : ''),
    testId: (row: KeyValueRow) => (row.rowType ? `${row.rowType}-row` : undefined),
    renderFullWidth: (row: KeyValueRow) => (row.rowType === 'section' ? <span>Inherited</span> : null),
    renderActionCell: (row: KeyValueRow) => (row.rowType === 'inherited' ? <span data-testid="source-link" /> : null)
  };
  const table = <KeyValueTable data={mixedRows} onChange={noop} showDescription rowConfig={rowConfig} />;

  it('renders a full-width row spanning every column', () => {
    const cell = query(getByTestId(useRenderToDom(table), 'section-row'), 'td');
    expect(cell.getAttribute('class')).toBe('full-width-row');
    expect(cell.getAttribute('colspan')).toBe('4');
    expect(cell.text).toBe('Inherited');
  });

  it('renders read-only rows as text with a disabled checkbox and the custom action', () => {
    const row = getByTestId(useRenderToDom(table), 'inherited-row');
    expect(row.getAttribute('class')).toBe('inherited-row');
    expect(queryByTestId(row, 'key-value-table-name-input')).toBeNull();
    expect(getByTestId(row, 'key-value-table-name-text').text).toBe('X-Tenant');
    expect(getByTestId(row, 'key-value-table-value-text').text).toBe('acme');
    expect(getByTestId(row, 'key-value-table-description-text').text).toBe('Tenant');
    expect(query(row, 'input[type="checkbox"]').hasAttribute('disabled')).toBe(true);
    getByTestId(row, 'source-link');
    expect(row.querySelector('.delete-button')).toBeNull();
  });

  it('keeps editable rows editable and appends the trailing blank row after them', () => {
    const bodyRows = useRenderToDom(table).querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(4);
    expect(bodyRows[2].querySelector('.delete-button')).toBeTruthy();
    expect(bodyRows[3].getAttribute('class')).toBe('empty-row');
  });
});
