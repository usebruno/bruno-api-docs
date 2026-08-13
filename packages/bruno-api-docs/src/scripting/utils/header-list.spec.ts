import { describe, it, expect } from 'vitest';
import { createResponseHeaderList, createRequestHeaderList, type RequestHeaderEntry } from './header-list';

describe('createResponseHeaderList (read-only response headers)', () => {
  const make = (h: Record<string, string | string[]>) => createResponseHeaderList(() => h);

  it('looks up header keys case-insensitively across get, one, has, and indexOf (HTTP header names are case-insensitive)', () => {
    const h = make({ 'content-type': 'application/json', 'x-count': '2' });
    expect(h.get('Content-Type')).toBe('application/json');
    expect(h.get('content-type')).toBe('application/json');
    expect(h.get('missing')).toBeUndefined();
    expect(h.one('X-COUNT')).toEqual({ key: 'x-count', value: '2' });
    expect(h.count()).toBe(2);
    expect(h.has('Content-Type')).toBe(true);
    expect(h.has('content-type', 'application/json')).toBe(true);
    expect(h.has('content-type', 'text/html')).toBe(false);
    expect(h.has('nope')).toBe(false);
    expect(h.has({ key: 'X-Count' })).toBe(true);
    expect(h.indexOf('X-Count')).toBe(1);
    expect(h.indexOf('nope')).toBe(-1);
    expect(h.indexOf({ key: 'X-Count' })).toBe(-1);
    expect(h.indexOf({ key: 'X-Count', value: '2' })).toBe(1);
    expect(h.indexOf({ key: 'x-count', value: 'wrong' })).toBe(-1);
  });

  it('exposes the array-style reads (all, find, filter, each, map, reduce) and the transforms (toObject, toString, toJSON)', () => {
    const h = make({ 'content-type': 'application/json', 'x-count': '2' });
    expect(h.all()).toHaveLength(2);
    expect(h.find((x) => x.key === 'x-count')).toMatchObject({ value: '2' });
    expect(h.filter((x) => x.key.startsWith('x-'))).toHaveLength(1);
    expect(h.map((x) => x.key)).toEqual(['content-type', 'x-count']);
    const keys: string[] = [];
    h.each((x) => keys.push(x.key));
    expect(keys).toEqual(['content-type', 'x-count']);
    expect(h.reduce((acc, x) => acc + x.key + ';', '')).toBe('content-type;x-count;');
    expect(h.toObject()).toEqual({ 'content-type': 'application/json', 'x-count': '2' });
    expect(h.toString()).toContain('content-type: application/json');
    expect(h.toJSON()).toHaveLength(2);
  });

  it('binds the optional second argument as `this` (thisArg) inside the map and reduce callbacks', () => {
    const h = make({ a: '1', b: '2' });
    expect(h.map(function (this: { p: string }, x) { return this.p + x.key; }, { p: '#' })).toEqual(['#a', '#b']);
    expect(h.reduce(function (this: { sep: string }, acc, x) { return acc + this.sep + x.key; }, '', { sep: '-' })).toBe('-a-b');
  });

  it('throws a clear read-only error from every mutating method (add, upsert, remove, clear, populate, repopulate, assimilate) because response headers cannot be changed', () => {
    const h = make({ a: '1' });
    expect(() => h.add({ key: 'x', value: 'y' })).toThrow(/read-only/);
    expect(() => h.upsert({ key: 'x', value: 'y' })).toThrow(/read-only/);
    expect(() => h.remove('x')).toThrow(/read-only/);
    expect(() => h.clear()).toThrow(/read-only/);
    expect(() => h.populate([])).toThrow(/read-only/);
    expect(() => h.repopulate([])).toThrow(/read-only/);
    expect(() => h.assimilate([])).toThrow(/read-only/);
  });

  it('re-reads the underlying headers on every call, and keeps a multi-value (array) header as a single entry — matching the app\'s response HeaderList', () => {
    let hs: Record<string, string | string[]> = { a: '1' };
    const h = createResponseHeaderList(() => hs);
    expect(h.count()).toBe(1);
    hs = { a: '1', b: ['2', '3'] };
    expect(h.count()).toBe(2);
    expect(h.one('b')).toMatchObject({ value: ['2', '3'] });
  });
});

describe('createRequestHeaderList (writable request headers)', () => {
  const make = (headers: RequestHeaderEntry[] = []) => {
    const arr: RequestHeaderEntry[] = headers.map((h) => ({ ...h }));
    return { list: createRequestHeaderList(() => arr), arr };
  };

  it('reads keys case-insensitively over the backing array', () => {
    const { list } = make([{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Count', value: '2' }]);
    expect(list.get('content-type')).toBe('application/json');
    expect(list.one('X-COUNT')).toMatchObject({ key: 'X-Count', value: '2' });
    expect(list.count()).toBe(2);
    expect(list.has('x-count', '2')).toBe(true);
    expect(list.indexOf('X-Count')).toBe(1);
    expect(list.toObject()).toEqual({ 'Content-Type': 'application/json', 'X-Count': '2' });
  });

  it('toObject honors excludeDisabled, caseSensitive, and multiValue', () => {
    const { list } = make([{ name: 'X-A', value: '1' }, { name: 'X-B', value: '2', disabled: true }]);
    expect(list.toObject()).toEqual({ 'X-A': '1', 'X-B': '2' });
    expect(list.toObject(true)).toEqual({ 'X-A': '1' });
    expect(list.toObject(false, false)).toEqual({ 'x-a': '1', 'x-b': '2' });

    const dup = make([{ name: 'X', value: '1' }, { name: 'X', value: '2' }]).list;
    expect(dup.toObject()).toEqual({ X: '2' });
    expect(dup.toObject(false, true, true)).toEqual({ X: '1' });
  });

  it('toString renders enabled headers in wire format with a trailing newline', () => {
    expect(make([{ name: 'A', value: '1' }, { name: 'B', value: '2', disabled: true }]).list.toString()).toBe('A: 1\n');
    expect(make().list.toString()).toBe('');
  });

  it('get and one prefer the enabled header when a key exists both enabled and disabled', () => {
    const { list } = make([{ name: 'X', value: 'on' }, { name: 'X', value: 'off', disabled: true }]);
    expect(list.get('X')).toBe('on');
    expect(list.one('X')).toMatchObject({ value: 'on' });
  });

  it('reduce throws on an empty list with no initial value, like native Array.reduce', () => {
    expect(() => make().list.reduce((acc) => acc)).toThrow(/empty array/);
    expect(make().list.reduce((acc, h) => acc + h.key, 'seed')).toBe('seed');
  });

  it('add accepts (name, value), a { key, value } object, and a "Key: Value" string', () => {
    const { list, arr } = make();
    list.add('X-One', '1');
    list.add({ key: 'X-Two', value: '2' });
    list.add('X-Three: 3');
    expect(arr).toEqual([
      { name: 'X-One', value: '1' },
      { name: 'X-Two', value: '2' },
      { name: 'X-Three', value: '3' }
    ]);
  });

  it('add replaces an existing key instead of duplicating it', () => {
    const { list, arr } = make([{ name: 'X-Trace', value: 'a' }]);
    list.add('X-Trace', 'b');
    expect(arr).toEqual([{ name: 'X-Trace', value: 'b' }]);
  });

  it('all/map/each/indexOf iterate in stored order even with a disabled header present (only get/one prefer the enabled twin)', () => {
    const { list } = make([
      { name: 'X-Token', value: 'a' },
      { name: 'X-Off', value: 'b', disabled: true },
      { name: 'X-Last', value: 'c' }
    ]);
    expect(list.map((h) => h.key)).toEqual(['X-Token', 'X-Off', 'X-Last']);
    expect(list.indexOf('X-Last')).toBe(2);
    const seen: string[] = [];
    list.each((h) => seen.push(h.key));
    expect(seen).toEqual(['X-Token', 'X-Off', 'X-Last']);
  });

  it('upsert adds new keys (true), updates existing case-insensitively (false), and rejects nil input (null)', () => {
    const { list, arr } = make([{ name: 'X-Token', value: 'a' }]);
    expect(list.upsert('X-New', 'n')).toBe(true);
    expect(list.upsert('x-token', 'b')).toBe(false);
    expect(list.upsert({ key: '' })).toBe(null);
    expect(list.get('x-token')).toBe('b');
    expect(arr.filter((h) => h.name.toLowerCase() === 'x-token')).toHaveLength(1);
  });

  it('remove deletes by string key, by object, and by predicate', () => {
    const { list, arr } = make([{ name: 'A', value: '1' }, { name: 'B', value: '2' }, { name: 'C', value: '3' }]);
    list.remove('a');
    list.remove({ key: 'B' });
    expect(arr.map((h) => h.name)).toEqual(['C']);
    list.remove((h) => h.key === 'C');
    expect(arr).toHaveLength(0);
  });

  it('clear empties the list, populate skips existing keys, repopulate replaces everything', () => {
    const { list, arr } = make([{ name: 'A', value: '1' }]);
    list.populate([{ key: 'A', value: 'x' }, { key: 'B', value: '2' }]);
    expect(arr).toEqual([{ name: 'A', value: '1' }, { name: 'B', value: '2' }]);
    list.clear();
    expect(arr).toHaveLength(0);
    list.repopulate('X-A: 1\nX-B: 2');
    expect(arr).toEqual([{ name: 'X-A', value: '1' }, { name: 'X-B', value: '2' }]);
  });

  it('assimilate merges source items and prunes items absent from the source', () => {
    const { list, arr } = make([{ name: 'Keep', value: '1' }, { name: 'Drop', value: '2' }]);
    list.assimilate([{ key: 'Keep', value: 'updated' }, { key: 'New', value: '3' }], true);
    expect(arr).toEqual([{ name: 'Keep', value: 'updated' }, { name: 'New', value: '3' }]);
  });

  it('binds the optional thisArg inside iteration callbacks and exposes toString/toJSON', () => {
    const { list } = make([{ name: 'a', value: '1' }, { name: 'b', value: '2' }]);
    expect(list.map(function (this: { p: string }, h) { return this.p + h.key; }, { p: '#' })).toEqual(['#a', '#b']);
    expect(list.reduce((acc, h) => acc + h.key, '')).toBe('ab');
    expect(list.toString()).toBe('a: 1\nb: 2\n');
    expect(list.toJSON()).toHaveLength(2);
  });
});
