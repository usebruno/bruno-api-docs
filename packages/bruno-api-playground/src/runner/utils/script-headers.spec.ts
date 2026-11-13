import { describe, it, expect } from 'vitest';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { snapshotEnabledHeaders, getHeaderNamesChangedByScript } from './script-headers';

interface HeaderRow {
  name: string;
  value: string;
  disabled?: boolean;
}

const requestWith = (headers: HeaderRow[]) => ({
  name: 'r',
  type: 'http',
  http: { method: 'GET', url: 'https://api.example.com', headers }
} as unknown as HttpRequest);

describe('snapshotEnabledHeaders', () => {
  it('records each enabled header as a lower-cased name and value pair', () => {
    const snapshot = snapshotEnabledHeaders(requestWith([
      { name: 'Authorization', value: 'Bearer a' },
      { name: 'X-Off', value: 'no', disabled: true }
    ]));

    expect([...snapshot]).toEqual(['authorization\nBearer a']);
  });

  it('ignores rows without a name', () => {
    expect(snapshotEnabledHeaders(requestWith([{ name: '', value: 'x' }])).size).toBe(0);
  });

  it('is empty for a request without headers', () => {
    expect(snapshotEnabledHeaders(requestWith([])).size).toBe(0);
  });
});

describe('getHeaderNamesChangedByScript', () => {
  it('returns headers the script added', () => {
    const before = snapshotEnabledHeaders(requestWith([{ name: 'Accept', value: 'json' }]));
    const after = requestWith([{ name: 'Accept', value: 'json' }, { name: 'Authorization', value: 'Bearer s' }]);

    expect(getHeaderNamesChangedByScript(before, after)).toEqual(['authorization']);
  });

  it('returns headers whose value the script changed', () => {
    const before = snapshotEnabledHeaders(requestWith([{ name: 'Authorization', value: 'Bearer tab' }]));
    const after = requestWith([{ name: 'Authorization', value: 'Bearer script' }]);

    expect(getHeaderNamesChangedByScript(before, after)).toEqual(['authorization']);
  });

  it('matches a re-cased header against the snapshot without reporting it', () => {
    const before = snapshotEnabledHeaders(requestWith([{ name: 'Authorization', value: 'Bearer tab' }]));
    const after = requestWith([{ name: 'authorization', value: 'Bearer tab' }]);

    expect(getHeaderNamesChangedByScript(before, after)).toEqual([]);
  });

  it('does not report duplicate same-name rows that were all present before the script', () => {
    const rows: HeaderRow[] = [
      { name: 'Authorization', value: 'Bearer row-one' },
      { name: 'Authorization', value: 'Bearer row-two' }
    ];
    const before = snapshotEnabledHeaders(requestWith(rows));

    expect(getHeaderNamesChangedByScript(before, requestWith(rows))).toEqual([]);
  });

  it('ignores headers the script left untouched, removed, disabled, or left unnamed', () => {
    const before = snapshotEnabledHeaders(requestWith([
      { name: 'Accept', value: 'json' },
      { name: 'X-Gone', value: '1' },
      { name: 'X-Off', value: '2' }
    ]));
    const after = requestWith([
      { name: 'Accept', value: 'json' },
      { name: 'X-Off', value: '2', disabled: true },
      { name: '', value: 'unnamed' }
    ]);

    expect(getHeaderNamesChangedByScript(before, after)).toEqual([]);
  });
});
