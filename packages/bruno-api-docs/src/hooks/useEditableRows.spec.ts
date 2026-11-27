import { describe, it, expect } from 'vitest';
import { withTrailingBlank, committableRows, applyRowPatch, removeRowAt, withIncomingReadOnlyRows } from './useEditableRows';
import type { KeyValueRow } from '../components/KeyValueTable/KeyValueTable';

const row = (over: Partial<KeyValueRow>): KeyValueRow => ({ id: 'x', name: '', value: '', enabled: true, ...over });
const names = (rows: KeyValueRow[]) => rows.map((r) => r.name);
const isEditable = (r: KeyValueRow) => !r.rowType;

describe('withTrailingBlank', () => {
  it('appends one blank row to type into', () => {
    const out = withTrailingBlank([row({ name: 'a', value: '1' })], false);
    expect(names(out)).toEqual(['a', '']);
  });

  it('does not append when the last row is already blank', () => {
    const out = withTrailingBlank([row({ name: 'a' }), row({ name: '' })], false);
    expect(names(out)).toEqual(['a', '']);
  });

  it('appends nothing when disableNewRow is true', () => {
    expect(withTrailingBlank([row({ name: 'a' })], true)).toHaveLength(1);
  });

  it('appends a blank row after a read-only last row, even when that row is blank', () => {
    const out = withTrailingBlank([row({ name: '', rowType: 'section' })], false, undefined, false, isEditable);
    expect(out).toHaveLength(2);
    expect(out[1].rowType).toBeUndefined();
  });

  it('seeds the trailing blank via makeNewRow (e.g. secret)', () => {
    const out = withTrailingBlank<KeyValueRow>([], false, () => ({ secret: true }));
    expect(out).toHaveLength(1);
    expect(out[0].secret).toBe(true);
  });
});

describe('committableRows', () => {
  it('drops blank (unnamed) rows', () => {
    const out = committableRows([row({ name: 'a' }), row({ name: '  ' }), row({ name: 'b' })]);
    expect(names(out)).toEqual(['a', 'b']);
  });

  it('keeps read-only rows, even blank ones, and drops only blank editable rows', () => {
    const section = row({ id: 's', rowType: 'section' });
    const out = committableRows([section, row({ name: 'a' }), row({ name: '' })], isEditable);
    expect(out).toEqual([section, row({ name: 'a' })]);
  });
});

describe('withIncomingReadOnlyRows', () => {
  it('keeps the local editable rows and their ids when a blanked middle row was dropped from the incoming data', () => {
    const current = [
      row({ id: 'a', name: 'A', value: '1' }),
      row({ id: 'b', name: '', value: '' }),
      row({ id: 'c', name: 'C', value: '3' }),
      row({ id: 'blank' })
    ];
    const incoming = [row({ id: 'header-0', name: 'A', value: '1' }), row({ id: 'header-1', name: 'C', value: '3' }), row({ id: 'new' })];
    expect(withIncomingReadOnlyRows(incoming, current, isEditable)).toEqual(current);
  });

  it('takes the read-only rows from the incoming data, keeping the local editable rows after them', () => {
    const current = [
      row({ id: 'inherited-section', rowType: 'section', expanded: true }),
      row({ id: 'tenant', name: 'X-Tenant', rowType: 'inherited' }),
      row({ id: 'request-section', rowType: 'section' }),
      row({ id: 'local-1', name: 'a' }),
      row({ id: 'local-blank' })
    ];
    const incoming = [
      row({ id: 'inherited-section', rowType: 'section', expanded: false }),
      row({ id: 'request-section', rowType: 'section' }),
      row({ id: 'header-0', name: 'a' }),
      row({ id: 'new-blank' })
    ];
    const out = withIncomingReadOnlyRows(incoming, current, isEditable);
    expect(out.map((r) => r.id)).toEqual(['inherited-section', 'request-section', 'local-1', 'local-blank']);
    expect(out[0].expanded).toBe(false);
  });

  it('uses the incoming rows as they are when they hold no editable rows', () => {
    const incoming = [row({ id: 'request-section', rowType: 'section' })];
    expect(withIncomingReadOnlyRows(incoming, [row({ id: 'local-1', name: 'a' })], isEditable)).toBe(incoming);
  });
});

describe('applyRowPatch', () => {
  it('appends a fresh blank when a name is typed into the trailing blank', () => {
    const rows = [row({ name: 'a' }), row({ name: '' })];
    const out = applyRowPatch(rows, 1, { name: 'b' }, false);
    expect(names(out)).toEqual(['a', 'b', '']);
  });

  it('does not append when editing an existing named row', () => {
    const rows = [row({ name: 'a' }), row({ name: '' })];
    const out = applyRowPatch(rows, 0, { value: '9' }, false);
    expect(names(out)).toEqual(['a', '']);
  });

  it('does not append when disableNewRow is true', () => {
    const rows = [row({ name: '' })];
    expect(applyRowPatch(rows, 0, { name: 'a' }, true)).toHaveLength(1);
  });

  it('uses makeNewRow for the appended blank', () => {
    const rows = [row({ name: '', secret: true })];
    const out = applyRowPatch(rows, 0, { name: 'tok' }, false, () => ({ secret: true }));
    expect(out[1].secret).toBe(true);
  });
});

describe('addWhenComplete mode', () => {
  it('withTrailingBlank appends only after the last row has both name and value', () => {
    expect(names(withTrailingBlank([row({ name: 'a', value: '1' })], false, undefined, true))).toEqual(['a', '']);
    expect(names(withTrailingBlank([row({ name: 'a', value: '' })], false, undefined, true))).toEqual(['a']);
  });

  it('applyRowPatch does not spawn a new row until the trailing row is complete', () => {
    const rows = [row({ name: 'a', value: '1' }), row({ name: '' })];
    const named = applyRowPatch(rows, 1, { name: 'b' }, false, undefined, true);
    expect(names(named)).toEqual(['a', 'b']);
    const completed = applyRowPatch(named, 1, { value: '2' }, false, undefined, true);
    expect(names(completed)).toEqual(['a', 'b', '']);
  });

  it('removeRowAt keeps the trailing blank only when the last remaining row is complete', () => {
    const rows = [row({ name: 'a', value: '1' }), row({ name: 'b', value: '2' }), row({ name: '' })];
    expect(names(removeRowAt(rows, 0, false, undefined, true))).toEqual(['b', '']);
    const incomplete = [row({ name: 'a', value: '' }), row({ name: 'b', value: '2' })];
    expect(names(removeRowAt(incomplete, 1, false, undefined, true))).toEqual(['a']);
  });
});

describe('removeRowAt', () => {
  it('removes a named row and keeps a trailing blank', () => {
    const rows = [row({ name: 'a' }), row({ name: 'b' }), row({ name: '' })];
    const out = removeRowAt(rows, 0, false);
    expect(names(out)).toEqual(['b', '']);
  });

  it('ignores a request to remove the trailing blank', () => {
    const rows = [row({ name: 'a' }), row({ name: '' })];
    expect(removeRowAt(rows, 1, false)).toBe(rows);
  });

  it('re-adds a trailing blank when the last remaining row is named', () => {
    const rows = [row({ name: 'a' }), row({ name: 'b' })];
    const out = removeRowAt(rows, 0, false);
    expect(names(out)).toEqual(['b', '']);
  });

  it('re-adds a trailing blank when only a read-only row remains', () => {
    const rows = [row({ rowType: 'section' }), row({ name: 'a' })];
    const out = removeRowAt(rows, 1, false, undefined, false, isEditable);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ name: '', value: '' });
    expect(out[1].rowType).toBeUndefined();
  });
});

describe('a row that has a value but no name', () => {
  it('counts as a real row, so a fresh blank is added below it', () => {
    const rows = [row({ name: 'a', value: '1' }), row({})];
    const out = applyRowPatch(rows, 1, { value: 'orphan' }, false);

    expect(out).toHaveLength(3);
    expect(out[1]).toMatchObject({ name: '', value: 'orphan' });
    expect(out[2]).toMatchObject({ name: '', value: '' });
  });

  it('is handed back to the caller, so it is saved and counted like any other row', () => {
    const out = committableRows([
      row({ name: 'a', value: '1' }),
      row({ name: '', value: 'orphan' }),
      row({})
    ]);

    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ name: '', value: 'orphan' });
  });

  it('gets a trailing blank of its own when the rows are laid out', () => {
    const out = withTrailingBlank([row({ name: '', value: 'orphan' })], false);

    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ name: '', value: '' });
  });

  it('can be deleted, leaving a blank row to type into', () => {
    const rows = [row({ name: '', value: 'orphan' }), row({})];
    const out = removeRowAt(rows, 0, false);

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: '', value: '' });
  });

  it('is not enough for the environments table, which waits for both fields', () => {
    const out = applyRowPatch([row({})], 0, { value: 'orphan' }, false, undefined, true);

    expect(out).toHaveLength(1);
  });
});

describe('a row that is empty in both fields', () => {
  it('is still treated as the trailing blank, so no second blank is added', () => {
    const out = withTrailingBlank([row({ name: 'a', value: '1' }), row({})], false);
    expect(out).toHaveLength(2);
  });

  it('is still dropped when the rows are handed back', () => {
    const out = committableRows([row({ name: 'a', value: '1' }), row({ name: '   ', value: '  ' })]);
    expect(names(out)).toEqual(['a']);
  });
});
