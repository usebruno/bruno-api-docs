import React, { useEffect, useRef, useState } from 'react';
import { useResolvedVariables } from '../../hooks/useVariableResolver';
import { useEditableRows } from '../../hooks/useEditableRows';
import { Tooltip } from '../../ui/Tooltip/Tooltip';
import { WarningIcon } from '../../assets/icons';
import HighlightedInput from '../HighlightedInput/HighlightedInput';
import { SecretValue } from '../../ui/SecretValue/SecretValue';
import './KeyValueTable.css';
import Checkbox from '../../ui/Checkbox/Checkbox';

// Smallest a column may be dragged to; the neighbour it trades width with is held to the same floor.
const MIN_COLUMN_WIDTH = 60;

export interface KeyValueRow {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
  [key: string]: any;
}

export interface AdditionalColumn {
  key: string;
  label: string;
  render: (
    row: KeyValueRow,
    index: number,
    updateField: (field: string, value: unknown) => void
  ) => React.ReactNode;
}

interface KeyValueTableProps {
  data: KeyValueRow[];
  onChange: (data: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showEnabled?: boolean;
  additionalColumns?: AdditionalColumn[];
  className?: string;
  disableNewRow?: boolean;
  makeNewRow?: () => Partial<KeyValueRow>;
  addWhenComplete?: boolean;
  disableDelete?: boolean;
  showActions?: boolean;
  readOnlyKey?: boolean;
  keyAutocomplete?: string[];
  valueAutocomplete?: string[];
  getRowError?: (row: KeyValueRow, index: number, field: 'name' | 'value') => string | null;
  valueHeader?: React.ReactNode;
  inlineActions?: boolean;
  multilineValues?: boolean;
  secretEditByDefault?: boolean;
  showDescription?: boolean;
  /** Let the user drag column dividers to resize (on by default; the delete column stays fixed). */
  resizableColumns?: boolean;
  testId?: string;
}

const valueTruncated = (anchor: HTMLElement): boolean => {
  const field = anchor.querySelector<HTMLElement>('input, textarea');
  return !!field && (field.scrollWidth > field.clientWidth || field.scrollHeight > field.clientHeight);
};

const KeyValueTable: React.FC<KeyValueTableProps> = ({
  data,
  onChange,
  keyPlaceholder = 'Name',
  valuePlaceholder = 'Value',
  showEnabled = true,
  additionalColumns = [],
  className = '',
  disableNewRow = false,
  makeNewRow,
  addWhenComplete = false,
  disableDelete = false,
  showActions = true,
  readOnlyKey = false,
  keyAutocomplete,
  valueAutocomplete,
  getRowError,
  valueHeader,
  inlineActions = false,
  multilineValues = false,
  secretEditByDefault = false,
  showDescription = false,
  resizableColumns = true,
  testId = 'key-value-table'
}) => {
  const { isFound, names } = useResolvedVariables();
  const { rows, updateField, removeRow } = useEditableRows(data, onChange, { disableNewRow, makeNewRow, addWhenComplete });

  // With a description column the delete action must sit in its own trailing column (after
  // Description) rather than inline in the value cell, so any inline extras (e.g. the variable
  // type dropdown) still render beside the value while delete stays last — matching the app.
  const actionsAsColumn = showActions && (!inlineActions || showDescription);
  const inlineDelete = showActions && !disableDelete && !actionsAsColumn;

  const tableRef = useRef<HTMLTableElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({});
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanup.current?.(), []);

  // The resize divider spans the whole column (header + rows), like the app. The handle is anchored in
  // the header cell, so it's stretched to the full table height via a `--kvt-height` CSS variable set
  // imperatively from a ResizeObserver — no React state, so growing/removing rows (e.g. autosizing a
  // multiline cell) never re-renders the table. (Effects don't run under SSR; until measured the
  // handle falls back to header height.)
  useEffect(() => {
    const table = tableRef.current;
    if (!table || typeof ResizeObserver === 'undefined') return;
    const setHeight = (h: number) => table.style.setProperty('--kvt-height', `${h}px`);
    setHeight(table.offsetHeight);
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize?.[0];
      setHeight(box ? box.blockSize : table.offsetHeight);
    });
    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  // Columns the user can resize, left→right. The delete column is fixed chrome, and the last
  // resizable column gets no handle (it has no right neighbour to trade width with) — like the app.
  const resizableKeys = resizableColumns
    ? [
        'key',
        'value',
        ...(!inlineActions ? additionalColumns.map((col) => col.key) : []),
        ...(showDescription ? ['description'] : [])
      ]
    : [];
  const lastResizableKey = resizableKeys[resizableKeys.length - 1];

  // Drag a divider to resize: the dragged column and its right neighbour trade width zero-sum, so the
  // table width never changes and no other column shifts. Widths are written straight to the two <col>
  // elements during the drag (coalesced to one write per animation frame, no re-render) and only the
  // two changed columns are committed to state as percentages on release, so they keep scaling with the
  // pane. Pointer capture keeps the drag alive even if the pointer leaves the window/iframe.
  const startResize = (event: React.PointerEvent<HTMLElement>, columnKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    const table = tableRef.current;
    const nextKey = resizableKeys[resizableKeys.indexOf(columnKey) + 1];
    if (!table || !nextKey) return;

    const columnCol = table.querySelector<HTMLTableColElement>(`col.col-${columnKey}`);
    const nextCol = table.querySelector<HTMLTableColElement>(`col.col-${nextKey}`);
    const columnHeader = table.querySelector<HTMLElement>(`thead th.col-${columnKey}`);
    const nextHeader = table.querySelector<HTMLElement>(`thead th.col-${nextKey}`);
    if (!columnCol || !nextCol || !columnHeader || !nextHeader) return;

    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startWidth = columnHeader.offsetWidth;
    const nextStartWidth = nextHeader.offsetWidth;

    let frame = 0;
    let clamped = 0;
    const paint = () => {
      frame = 0;
      columnCol.style.width = `${startWidth + clamped}px`;
      nextCol.style.width = `${nextStartWidth - clamped}px`;
    };
    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      clamped = Math.max(MIN_COLUMN_WIDTH - startWidth, Math.min(nextStartWidth - MIN_COLUMN_WIDTH, delta));
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const finish = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        paint();
      }
      dragCleanup.current?.();
      dragCleanup.current = null;
      setResizingKey(null);
      const tableWidth = table.offsetWidth;
      if (tableWidth <= 0) return;
      setColumnWidths((current) => ({
        ...current,
        [columnKey]: `${(columnHeader.offsetWidth / tableWidth) * 100}%`,
        [nextKey]: `${(nextHeader.offsetWidth / tableWidth) * 100}%`
      }));
    };

    handle.setPointerCapture?.(pointerId);
    dragCleanup.current = () => {
      cancelAnimationFrame(frame);
      handle.releasePointerCapture?.(pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    setResizingKey(columnKey);
  };

  const resizeHandle = (columnKey: string) =>
    resizableColumns && columnKey !== lastResizableKey ? (
      <span
        className={`col-resize-handle${resizingKey === columnKey ? ' is-resizing' : ''}`}
        onPointerDown={(event) => startResize(event, columnKey)}
        aria-hidden="true"
      />
    ) : null;

  const cellError = (row: KeyValueRow, index: number, field: 'name' | 'value') => {
    const message = getRowError?.(row, index, field);
    if (!message) return null;
    return (
      <Tooltip content={message}>
        <span className="cell-error" role="img" aria-label={message} data-testid={`${testId}-error`}>
          <WarningIcon />
        </span>
      </Tooltip>
    );
  };

  return (
    <div className={`key-value-table-wrapper ${className}${resizingKey ? ' is-resizing' : ''}`} data-testid={testId}>
      <div className="key-value-table-container" data-testid={`${testId}-container`}>
        <table ref={tableRef} className="key-value-table" data-testid={`${testId}-table`}>
          <colgroup>
            <col className="col-key" style={{ width: columnWidths.key }} />
            <col className="col-value" style={{ width: columnWidths.value }} />
            {!inlineActions &&
              additionalColumns.map((col) => (
                <col key={col.key} className={`col-${col.key}`} style={{ width: columnWidths[col.key] }} />
              ))}
            {showDescription && <col className="col-description" style={{ width: columnWidths.description }} />}
            {actionsAsColumn && <col className="col-actions" />}
          </colgroup>
          <thead>
            <tr>
              <th className="col-key">
                {keyPlaceholder}
                {resizeHandle('key')}
              </th>
              <th className="col-value">
                {valueHeader ?? valuePlaceholder}
                {resizeHandle('value')}
              </th>
              {!inlineActions &&
                additionalColumns.map((col) => (
                  <th key={col.key} className={`col-${col.key}`}>
                    {col.label}
                    {resizeHandle(col.key)}
                  </th>
                ))}
              {showDescription && (
                <th className="col-description" data-testid={`${testId}-description-header`}>
                  Description
                  {resizeHandle('description')}
                </th>
              )}
              {actionsAsColumn && <th className="col-actions"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLastRow = index === rows.length - 1;
              const isEmptyRow = !row.name || row.name.trim() === '';
              const isLastEmptyRow = isLastRow && isEmptyRow;
              const updateCell = (field: string, value: unknown) => updateField(index, field, value);

              const deleteButton = (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => removeRow(index)}
                  aria-label="Delete row"
                  title="Delete row"
                >
                  <svg
                    width="12"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              );

              const valueField = row.secret ? (
                <SecretValue
                  value={row.value}
                  placeholder={valuePlaceholder}
                  editByDefault={secretEditByDefault}
                  multiline={multilineValues}
                  onChange={(v) => updateField(index, 'value', v)}
                />
              ) : (
                <Tooltip content={row.value} shouldOpen={valueTruncated}>
                  <span className="value-input-tip">
                    <HighlightedInput
                      value={row.value}
                      placeholder={isLastEmptyRow ? valuePlaceholder : ''}
                      onValueChange={(v) => updateField(index, 'value', v)}
                      isFound={isFound}
                      names={names}
                      anywordHints={valueAutocomplete}
                      multiline={multilineValues}
                      testId={`${testId}-value-input`}
                    />
                  </span>
                </Tooltip>
              );

              return (
                <tr key={row.id} className={isLastEmptyRow ? 'empty-row' : ''}>
                  <td className="col-key">
                    <div className="key-cell">
                      {showEnabled && (
                        <span className="checkbox-slot">
                          {!isLastEmptyRow && (
                            <Checkbox
                              checked={row.enabled}
                              ariaLabel={row.name ? `Enable ${row.name}` : 'Enable row'}
                              onChange={(e) => updateField(index, 'enabled', e.target.checked)}
                            />
                          )}
                        </span>
                      )}
                      {readOnlyKey ? (
                        <span className="text-readonly" title={row.name}>
                          {row.name}
                        </span>
                      ) : (
                        <HighlightedInput
                          value={row.name}
                          placeholder={isLastEmptyRow ? keyPlaceholder : ''}
                          onValueChange={(v) => updateField(index, 'name', v)}
                          isFound={isFound}
                          names={names}
                          anywordHints={keyAutocomplete}
                          variablesAutocomplete={false}
                          title={row.name}
                          testId={`${testId}-name-input`}
                        />
                      )}
                      {!isLastEmptyRow && cellError(row, index, 'name')}
                    </div>
                  </td>
                  <td className="col-value">
                    {inlineActions ? (
                      <div className="value-cell">
                        <div className="value-cell-field">{valueField}</div>
                        {!isLastEmptyRow && cellError(row, index, 'value')}
                        {!isLastEmptyRow && (additionalColumns.length > 0 || inlineDelete) && (
                          <div className="value-cell-trailing">
                            {additionalColumns.map((col) => (
                              <React.Fragment key={col.key}>{col.render(row, index, updateCell)}</React.Fragment>
                            ))}
                            {inlineDelete && deleteButton}
                          </div>
                        )}
                      </div>
                    ) : (
                      valueField
                    )}
                  </td>
                  {!inlineActions &&
                    additionalColumns.map((col) => (
                      <td key={col.key} className={`col-${col.key}`}>
                        {!isLastEmptyRow && col.render(row, index, updateCell)}
                      </td>
                    ))}
                  {showDescription && (
                    <td className="col-description">
                      <HighlightedInput
                        value={typeof row.description === 'string' ? row.description : ''}
                        placeholder={isLastEmptyRow ? 'Description' : ''}
                        onValueChange={(v) => updateField(index, 'description', v)}
                        isFound={isFound}
                        names={names}
                        variablesAutocomplete={false}
                        multiline
                        noWrap
                        testId={`${testId}-description-input`}
                      />
                    </td>
                  )}
                  {actionsAsColumn && (
                    <td className="col-actions">{!isLastEmptyRow && !disableDelete && deleteButton}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KeyValueTable;
