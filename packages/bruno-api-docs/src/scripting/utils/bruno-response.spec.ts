import { describe, it, expect } from 'vitest';
import BrunoResponse from './bruno-response';

const rawResponse = () => ({
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json', 'x-token': 'abc' },
  data: { users: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Lin' }] },
  duration: 42,
  url: 'https://api.example.com/users'
});

describe('BrunoResponse (res object)', () => {
  it('maps the browser executor\'s `duration` field onto responseTime and its `url` field onto res.url/getUrl() (the app\'s axios response names them differently)', () => {
    const res: any = new BrunoResponse(rawResponse());
    expect(res.responseTime).toBe(42);
    expect(res.getResponseTime()).toBe(42);
    expect(res.url).toBe('https://api.example.com/users');
    expect(res.getUrl()).toBe('https://api.example.com/users');
  });

  it('resolves getHeader() case-insensitively and returns null when the header name is not a string', () => {
    const res: any = new BrunoResponse(rawResponse());
    expect(res.getHeader('Content-Type')).toBe('application/json');
    expect(res.getHeader('X-TOKEN')).toBe('abc');
    expect(res.getHeader('content-type')).toBe('application/json');
    expect(res.getHeader(123 as any)).toBe(null);
  });

  it('is callable as res("path") to read into the body, and forwards filter/mapper functions to the query engine', () => {
    const res: any = new BrunoResponse(rawResponse());
    expect(res('users[0].name')).toBe('Ada');
    const filtered = JSON.stringify(res('users[?].name', (u: any) => u.id === 2));
    expect(filtered).toMatch(/Lin/);
    expect(filtered).not.toMatch(/Ada/);
  });

  it('exposes res.headerList for structured header reads and rejects any attempt to modify it', () => {
    const res: any = new BrunoResponse(rawResponse());
    expect(res.headerList.get('Content-Type')).toBe('application/json');
    expect(res.headerList.count()).toBe(2);
    expect(res.headerList.has('x-token')).toBe(true);
    expect(() => res.headerList.add({ key: 'x', value: 'y' })).toThrow(/read-only/);
  });

  it('setBody() deep-clones the new value and keeps res.body and getBody() pointing at the same updated body', () => {
    const res: any = new BrunoResponse({ ...rawResponse(), data: { a: 1 } });
    res.setBody({ b: 2 });
    expect(res.getBody()).toEqual({ b: 2 });
    expect(res.body).toEqual({ b: 2 });
  });

  it('returns safe null/empty values from every accessor when constructed without a response object', () => {
    const res: any = new BrunoResponse(undefined);
    expect(res.getStatus()).toBe(null);
    expect(res.getResponseTime()).toBe(null);
    expect(res.getUrl()).toBe(null);
    expect(res.getHeader('x')).toBe(null);
    expect(res.headerList.count()).toBe(0);
  });
});
