import { useState, useEffect, useRef, useCallback } from 'react';
import type { KeyValueRow } from '../components/KeyValueTable/KeyValueTable';

type NewRow<R extends KeyValueRow> = () => Partial<R>;
type IsEditable<R extends KeyValueRow> = (row: R) => boolean;

const alwaysEditable = () => true;

const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// The appended row is always a plain editable row, so R's extra fields are seeded by makeNewRow or left unset.
const blankRow = <R extends KeyValueRow>(makeNewRow?: NewRow<R>): R => ({
  id: generateId(),
  name: '',
  value: '',
  enabled: true,
  ...makeNewRow?.()
}) as R;

const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

export const isBlankRow = (row?: KeyValueRow): boolean => !hasText(row?.name) && !hasText(row?.value);
const isComplete = (row?: KeyValueRow): boolean => hasText(row?.name) && hasText(row?.value);

// Whether the last row already serves as the trailing "type here" row, so we
// don't append another. In addWhenComplete mode the trailing row lasts until it
// has both a name and a value; otherwise until either field has something in it.
// A read-only last row (e.g. a section or inherited row) never counts as one.
const hasTrailing = <R extends KeyValueRow>(
  last: R | undefined,
  addWhenComplete: boolean,
  isEditable: IsEditable<R>
): boolean => {
  if (!last || !isEditable(last)) return false;
  return addWhenComplete ? !isComplete(last) : isBlankRow(last);
};

export const withTrailingBlank = <R extends KeyValueRow>(
  data: R[],
  disableNewRow: boolean,
  makeNewRow?: NewRow<R>,
  addWhenComplete = false,
  isEditable: IsEditable<R> = alwaysEditable
): R[] => {
  const rows = data.map((row, idx) => ({ ...row, id: row.id || `row-${idx}` }));
  if (disableNewRow || hasTrailing(rows[rows.length - 1], addWhenComplete, isEditable)) return rows;
  return [...rows, blankRow(makeNewRow)];
};

export const committableRows = <R extends KeyValueRow>(rows: R[], isEditable: IsEditable<R> = alwaysEditable): R[] =>
  rows.filter((row) => !isEditable(row) || !isBlankRow(row));

// After a local edit the user's editable rows are authoritative (the incoming ones are their echo, minus
// blank rows and with different ids), so only the read-only rows are taken from the incoming data.
export const withIncomingReadOnlyRows = <R extends KeyValueRow>(
  incoming: R[],
  current: R[],
  isEditable: IsEditable<R>
): R[] => {
  const firstEditable = incoming.findIndex(isEditable);
  if (firstEditable === -1) return incoming;
  return [
    ...incoming.slice(0, firstEditable),
    ...current.filter(isEditable),
    ...incoming.slice(firstEditable).filter((row) => !isEditable(row))
  ];
};

export const applyRowPatch = <R extends KeyValueRow>(
  rows: R[],
  index: number,
  patch: Partial<R>,
  disableNewRow: boolean,
  makeNewRow?: NewRow<R>,
  addWhenComplete = false
): R[] => {
  const next = [...rows];
  const wasBlank = isBlankRow(next[index]);
  next[index] = { ...next[index], ...patch };
  const spawn = addWhenComplete ? isComplete(next[index]) : wasBlank && !isBlankRow(next[index]);
  if (!disableNewRow && index === rows.length - 1 && spawn) {
    next.push(blankRow(makeNewRow));
  }
  return next;
};

export const removeRowAt = <R extends KeyValueRow>(
  rows: R[],
  index: number,
  disableNewRow: boolean,
  makeNewRow?: NewRow<R>,
  addWhenComplete = false,
  isEditable: IsEditable<R> = alwaysEditable
): R[] => {
  if (index === rows.length - 1 && isBlankRow(rows[index])) return rows;
  const next = rows.filter((_, i) => i !== index);
  if (!disableNewRow && !hasTrailing(next[next.length - 1], addWhenComplete, isEditable)) {
    next.push(blankRow(makeNewRow));
  }
  return next;
};

interface UseEditableRowsOptions<R extends KeyValueRow> {
  disableNewRow?: boolean;
  makeNewRow?: NewRow<R>;
  addWhenComplete?: boolean;
  isEditable?: IsEditable<R>;
}

export const useEditableRows = <R extends KeyValueRow = KeyValueRow>(
  data: R[],
  onChange: (rows: R[]) => void,
  {
    disableNewRow = false,
    makeNewRow,
    addWhenComplete = false,
    isEditable = alwaysEditable
  }: UseEditableRowsOptions<R> = {}
) => {
  const isEditingRef = useRef(false);
  const previousDataRef = useRef('');
  const makeNewRowRef = useRef(makeNewRow);
  makeNewRowRef.current = makeNewRow;
  const isEditableRef = useRef(isEditable);
  isEditableRef.current = isEditable;
  const incomingRef = useRef({ data, disableNewRow, addWhenComplete });
  incomingRef.current = { data, disableNewRow, addWhenComplete };

  const [rows, setRows] = useState<R[]>(() =>
    withTrailingBlank(data, disableNewRow, makeNewRowRef.current, addWhenComplete, isEditableRef.current)
  );

  const takeIncomingRows = useCallback((): R[] | null => {
    const incoming = incomingRef.current;
    const dataString = JSON.stringify(incoming.data);
    if (dataString === previousDataRef.current) return null;
    previousDataRef.current = dataString;
    return withTrailingBlank(
      incoming.data,
      incoming.disableNewRow,
      makeNewRowRef.current,
      incoming.addWhenComplete,
      isEditableRef.current
    );
  }, []);

  useEffect(() => {
    if (isEditingRef.current) return;
    const next = takeIncomingRows();
    if (next) setRows(next);
  }, [data, disableNewRow, addWhenComplete, takeIncomingRows]);

  // Incoming data is held back while the user is editing; once they pause, apply whatever arrived.
  useEffect(() => {
    const timer = setTimeout(() => {
      isEditingRef.current = false;
      const next = takeIncomingRows();
      if (next) setRows((current) => withIncomingReadOnlyRows(next, current, isEditableRef.current));
    }, 300);
    return () => clearTimeout(timer);
  }, [rows, takeIncomingRows]);

  const commit = useCallback(
    (next: R[]) => {
      setRows(next);
      onChange(committableRows(next, isEditableRef.current));
    },
    [onChange]
  );

  const updateRow = useCallback(
    (index: number, patch: Partial<R>) => {
      isEditingRef.current = true;
      commit(applyRowPatch(rows, index, patch, disableNewRow, makeNewRowRef.current, addWhenComplete));
    },
    [rows, disableNewRow, addWhenComplete, commit]
  );

  const updateField = useCallback(
    (index: number, field: string, value: unknown) => updateRow(index, { [field]: value } as Partial<R>),
    [updateRow]
  );

  const removeRow = useCallback(
    (index: number) => {
      isEditingRef.current = true;
      commit(removeRowAt(rows, index, disableNewRow, makeNewRowRef.current, addWhenComplete, isEditableRef.current));
    },
    [rows, disableNewRow, addWhenComplete, commit]
  );

  return { rows, updateRow, updateField, removeRow };
};

export default useEditableRows;
