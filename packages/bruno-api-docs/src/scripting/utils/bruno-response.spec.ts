import { Buffer } from 'buffer';
import { describe, it, expect } from 'vitest';
import BrunoResponse, { type CallableResponse, type ResponseData, type JsonValue } from './bruno-response';

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

const decodeBody = (base64?: string): string => Buffer.from(base64 ?? '', 'base64').toString();

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

  it('setBody() rewrites base64Data and size so the response pane, which renders from base64Data, shows the new body', () => {
    const res = makeRes({ data: { original: true }, base64Data: Buffer.from('{"original":true}').toString('base64') });
    res.setBody({ marker: 'hey there' });
    const raw = JSON.stringify({ marker: 'hey there' });
    const stored = res.res as ResponseData;
    expect(stored.data).toEqual({ marker: 'hey there' });
    expect(stored.base64Data).toBe(Buffer.from(raw).toString('base64'));
    expect(decodeBody(stored.base64Data)).toBe(raw);
    expect(stored.size).toBe(Buffer.byteLength(raw));
  });

  it('setBody(null) empties the rendered body: data is null, base64Data is empty and size is 0', () => {
    const res = makeRes({ data: { original: true }, base64Data: Buffer.from('{"original":true}').toString('base64') });
    res.setBody(null);
    const stored = res.res as ResponseData;
    expect(stored.data).toBeNull();
    expect(stored.base64Data).toBe('');
    expect(stored.size).toBe(0);
  });

  it('setBody() stores a string raw and unquoted, so the pane shows the text rather than a JSON-quoted string', () => {
    const res = makeRes();
    res.setBody('plain text');
    const stored = res.res as ResponseData;
    expect(res.getBody()).toBe('plain text');
    expect(decodeBody(stored.base64Data)).toBe('plain text');
    expect(stored.size).toBe(Buffer.byteLength('plain text'));
  });

  it('setBody() JSON-encodes numbers, booleans and arrays into base64Data', () => {
    const num = makeRes();
    num.setBody(42);
    expect(decodeBody((num.res as ResponseData).base64Data)).toBe('42');

    const bool = makeRes();
    bool.setBody(true);
    expect(decodeBody((bool.res as ResponseData).base64Data)).toBe('true');

    const arr = makeRes();
    arr.setBody([1, 2, 3]);
    expect(decodeBody((arr.res as ResponseData).base64Data)).toBe('[1,2,3]');
  });

  it('setBody() never throws on an un-stringifiable (circular) value: it keeps the new body and degrades the buffer to empty', () => {
    const res = makeRes({ data: { original: true } });
    const circular: Record<string, JsonValue> = {};
    circular.self = circular;
    expect(() => res.setBody(circular)).not.toThrow();
    const stored = res.res as ResponseData;
    expect((stored.data as Record<string, JsonValue>).self).toBeDefined();
    expect(stored.base64Data).toBe('');
    expect(stored.size).toBe(0);
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
