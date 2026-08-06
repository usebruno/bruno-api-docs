import { Buffer } from 'buffer';
import { describe, it, expect } from 'vitest';
import BrunoResponse, { type CallableResponse, type ResponseData } from './bruno-response';

const rawResponse = (): ResponseData => ({
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json', 'x-token': 'abc' },
  data: { users: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Lin' }] },
  duration: 42,
  url: 'https://api.example.com/users'
});

const makeRes = (over?: Partial<ResponseData>): CallableResponse =>
  new BrunoResponse(over ? { ...rawResponse(), ...over } : rawResponse()) as CallableResponse;

describe('BrunoResponse (res object)', () => {
  it('maps the browser executor\'s `duration` field onto responseTime and its `url` field onto res.url/getUrl() (the app\'s axios response names them differently)', () => {
    const res = makeRes();
    expect(res.responseTime).toBe(42);
    expect(res.getResponseTime()).toBe(42);
    expect(res.url).toBe('https://api.example.com/users');
    expect(res.getUrl()).toBe('https://api.example.com/users');
  });

  it('resolves getHeader() case-insensitively and never returns inherited Object.prototype keys', () => {
    const res = makeRes();
    expect(res.getHeader('Content-Type')).toBe('application/json');
    expect(res.getHeader('X-TOKEN')).toBe('abc');
    expect(res.getHeader('content-type')).toBe('application/json');
    expect(res.getHeader('missing')).toBe(null);
    expect(res.getHeader('constructor')).toBe(null);
    expect(res.getHeader('hasOwnProperty')).toBe(null);
    expect(res.getHeader('toString')).toBe(null);
  });

  it('is callable as res("path") to read into the body, and forwards filter/mapper functions to the query engine', () => {
    const res = makeRes();
    expect(res('users[0].name')).toBe('Ada');
    const filtered = JSON.stringify(res('users[?].name', (u) => (u as { id: number }).id === 2));
    expect(filtered).toMatch(/Lin/);
    expect(filtered).not.toMatch(/Ada/);
  });

  it('exposes res.headerList for structured header reads and rejects any attempt to modify it', () => {
    const res = makeRes();
    expect(res.headerList.get('Content-Type')).toBe('application/json');
    expect(res.headerList.count()).toBe(2);
    expect(res.headerList.has('x-token')).toBe(true);
    expect(() => res.headerList.add({ key: 'x', value: 'y' })).toThrow(/read-only/);
  });

  it('setBody() deep-clones the value and keeps res.body, getBody() and getSize() in sync', () => {
    const res = makeRes({ data: { a: 1 } });
    res.setBody({ b: 2 });
    expect(res.getBody()).toEqual({ b: 2 });
    expect(res.body).toEqual({ b: 2 });
    expect(res.getSize().body).toBe(Buffer.byteLength(JSON.stringify({ b: 2 })));
  });

  it('returns safe null/empty values from every accessor when constructed without a response object', () => {
    const res = new BrunoResponse(undefined) as CallableResponse;
    expect(res.getStatus()).toBe(null);
    expect(res.getResponseTime()).toBe(null);
    expect(res.getUrl()).toBe(null);
    expect(res.getHeader('x')).toBe(null);
    expect(res.headerList.count()).toBe(0);
  });
});
