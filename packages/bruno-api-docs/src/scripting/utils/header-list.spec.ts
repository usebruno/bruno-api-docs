import { describe, it, expect } from 'vitest';
import { createResponseHeaderList } from './header-list';

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
