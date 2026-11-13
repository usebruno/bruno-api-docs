import { describe, it, expect } from 'vitest';
import type { HttpRequest } from '@opencollection/types/requests/http';
import BrunoRequest from './bruno-request';

const rawRequest = (): HttpRequest => ({
  info: { name: 'Get Users', tags: ['smoke', 'users'] },
  http: {
    method: 'GET',
    url: 'https://api.example.com/users/:id?active=true',
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'X-Token', value: 'abc' },
      { name: 'X-Off', value: 'nope', disabled: true }
    ],
    params: [
      { name: 'id', value: '42', type: 'path' },
      { name: 'active', value: 'true', type: 'query' }
    ],
    body: { type: 'json', data: '{"a":1}' },
    auth: { type: 'bearer', token: 'xyz' }
  },
  settings: { timeout: 5000 }
});

const make = () => {
  const raw = rawRequest();
  return { req: new BrunoRequest(raw), raw };
};

describe('BrunoRequest (req object over the OpenCollection http.* shape)', () => {
  it('reads url/method/name/tags/auth from the nested http and info blocks', () => {
    const { req } = make();
    expect(req.getUrl()).toBe('https://api.example.com/users/:id?active=true');
    expect(req.getMethod()).toBe('GET');
    expect(req.getName()).toBe('Get Users');
    expect(req.getTags()).toEqual(['smoke', 'users']);
    expect(req.getAuthMode()).toBe('bearer');
  });

  it('reads name and tags from the flat/root shape as well as the info block (the playground feeds flat items)', () => {
    const flatReq: HttpRequest & { name: string; tags: string[] } = { name: 'echo json', tags: ['smoke'] };
    const req = new BrunoRequest(flatReq);
    expect(req.getName()).toBe('echo json');
    expect(req.name).toBe('echo json');
    expect(req.getTags()).toEqual(['smoke']);
    expect(req.tags).toEqual(['smoke']);
  });

  it('getAuthMode falls back to a manual Authorization or X-WSSE header when there is no auth config (matching EE)', () => {
    const bearer = new BrunoRequest({ http: { headers: [{ name: 'Authorization', value: 'Bearer xyz' }] } });
    expect(bearer.getAuthMode()).toBe('bearer');
    const basic = new BrunoRequest({ http: { headers: [{ name: 'Authorization', value: 'Basic abc' }] } });
    expect(basic.getAuthMode()).toBe('basic');
    const wsse = new BrunoRequest({ http: { headers: [{ name: 'X-WSSE', value: 'x' }] } });
    expect(wsse.getAuthMode()).toBe('wsse');
  });

  it('derives host, interpolated path, and query string from the url', () => {
    const { req } = make();
    expect(req.getHost()).toBe('api.example.com');
    expect(req.getPath()).toBe('/users/42');
    expect(req.getQueryString()).toBe('active=true');
  });

  it('returns only path params from getPathParams()', () => {
    const { req } = make();
    expect(req.getPathParams()).toEqual([{ name: 'id', value: '42', type: 'path' }]);
  });

  it('setUrl/setMethod write through to req.http so the executor sees them', () => {
    const { req, raw } = make();
    req.setUrl('https://api.example.com/v2');
    req.setMethod('POST');
    expect(req.getUrl()).toBe('https://api.example.com/v2');
    expect(req.getMethod()).toBe('POST');
    expect(raw.http?.url).toBe('https://api.example.com/v2');
    expect(raw.http?.method).toBe('POST');
  });

  it('getHeaders/getHeader read the enabled headers; disabled headers are hidden', () => {
    const { req } = make();
    expect(req.getHeaders()).toEqual({ 'Content-Type': 'application/json', 'X-Token': 'abc' });
    expect(req.getHeader('Content-Type')).toBe('application/json');
    expect(req.getHeader('X-Off')).toBeUndefined();
  });

  it('setHeader/deleteHeader/deleteHeaders mutate the http.headers array (reaching the sent request)', () => {
    const { req, raw } = make();
    req.setHeader('X-New', '1');
    expect(req.getHeader('X-New')).toBe('1');
    expect(raw.http?.headers).toContainEqual({ name: 'X-New', value: '1' });

    req.setHeader('X-Token', 'updated');
    expect(raw.http?.headers?.find((h) => h.name === 'X-Token')?.value).toBe('updated');

    req.deleteHeader('X-Token');
    expect(raw.http?.headers?.some((h) => h.name === 'X-Token')).toBe(false);

    req.deleteHeaders(['Content-Type', 'X-New']);
    expect(raw.http?.headers?.map((h) => h.name)).toEqual(['X-Off']);
  });

  it('the req.headers shorthand stays live after setHeader, deleteHeader, and a direct req.headerList mutation (never a stale snapshot)', () => {
    const { req } = make();
    expect(req.headers).toEqual({ 'Content-Type': 'application/json', 'X-Token': 'abc' });
    req.setHeader('X-New', '1');
    expect(req.headers).toMatchObject({ 'X-New': '1' });
    req.deleteHeader('X-Token');
    expect(req.headers['X-Token']).toBeUndefined();
    req.headerList.add('X-Direct', 'd');
    expect(req.headers).toMatchObject({ 'X-Direct': 'd' });
  });

  it('setHeader coerces a nullish value (e.g. a disabled/missing variable) to "" so it is not sent as the literal "undefined"', () => {
    const { req, raw } = make();
    const vars: Record<string, string | undefined> = {}; // bru.getEnvVar('disabledVar') resolves to undefined
    req.setHeader('X-From-Var', vars.disabledVar as string);
    expect(req.getHeader('X-From-Var')).toBe('');
    expect(raw.http?.headers).toContainEqual({ name: 'X-From-Var', value: '' });
  });

  it('setHeaders replaces the enabled headers but preserves disabled ones (matching EE)', () => {
    const { req, raw } = make();
    req.setHeaders({ Accept: 'text/plain' });
    expect(raw.http?.headers).toEqual([
      { name: 'X-Off', value: 'nope', disabled: true },
      { name: 'Accept', value: 'text/plain' }
    ]);
    expect(req.getHeaders()).toEqual({ Accept: 'text/plain' });
  });

  it('getBody parses JSON bodies, exposes the raw string with { raw: true }, and setBody serialises objects into http.body.data', () => {
    const { req, raw } = make();
    expect(req.getBody()).toEqual({ a: 1 });
    expect(req.getBody({ raw: true })).toBe('{"a":1}');

    req.setBody({ b: 2 });
    expect(req.getBody()).toEqual({ b: 2 });
    expect(raw.http?.body).toEqual({ type: 'json', data: '{"b":2}' });
  });

  it('getBody returns the structured entries for form-urlencoded/multipart bodies instead of undefined', () => {
    const formReq = new BrunoRequest({
      http: {
        headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        body: { type: 'form-urlencoded', data: [{ name: 'a', value: '1' }, { name: 'b', value: '2' }] }
      }
    });
    expect(formReq.getBody()).toEqual([{ name: 'a', value: '1' }, { name: 'b', value: '2' }]);
    expect(formReq.getBody({ raw: true })).toEqual([{ name: 'a', value: '1' }, { name: 'b', value: '2' }]);
  });

  it('getTimeout/setTimeout write to req.settings', () => {
    const { req, raw } = make();
    expect(req.getTimeout()).toBe(5000);
    req.setTimeout(1000);
    expect(req.getTimeout()).toBe(1000);
    expect(raw.settings?.timeout).toBe(1000);
  });

  it('setMaxRedirects/onFail cannot be honoured in the playground, so they collect a de-duplicated warning', () => {
    const warnings: string[] = [];
    const req = new BrunoRequest(rawRequest(), warnings);
    req.setMaxRedirects();
    req.onFail();
    expect(warnings).toEqual([
      'req.setMaxRedirects is not currently supported in the Bruno playground. Please use the Bruno desktop app.',
      'req.onFail is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    ]);

    req.setMaxRedirects();
    expect(warnings.filter((w) => w.includes('req.setMaxRedirects'))).toHaveLength(1);
  });

  it('an unsupported method is a safe no-op when no warnings collector is supplied (never throws)', () => {
    const { req, raw } = make();
    expect(() => {
      req.setMaxRedirects();
      req.onFail();
    }).not.toThrow();
    expect(raw.settings?.maxRedirects).toBeUndefined();
  });

  it('getExecutionMode reflects the internal marker and disableParsingResponseJson sets its flag', () => {
    const { req, raw } = make();
    expect(req.getExecutionMode()).toBeUndefined();
    req.disableParsingResponseJson();
    expect((raw as { __brunoDisableParsingResponseJson?: boolean }).__brunoDisableParsingResponseJson).toBe(true);
  });

  it('getExecutionMode returns the execution-mode marker the runner sets ("standalone")', () => {
    expect(new BrunoRequest({ __bruno__executionMode: 'standalone' }).getExecutionMode()).toBe('standalone');
  });

  it('exposes a writable req.headerList that mutates the same http.headers array', () => {
    const { req, raw } = make();
    expect(req.headerList.get('content-type')).toBe('application/json');
    expect(req.headerList.count()).toBe(3);

    req.headerList.add('X-Trace', 'on');
    expect(raw.http?.headers).toContainEqual({ name: 'X-Trace', value: 'on' });

    expect(req.headerList.upsert('x-token', 'v2')).toBe(false);
    expect(req.headerList.get('x-token')).toBe('v2');
    expect(raw.http?.headers?.filter((h) => h.name.toLowerCase() === 'x-token')).toHaveLength(1);

    req.headerList.remove('X-Trace');
    expect(req.headerList.has('x-trace')).toBe(false);
  });

  it('returns safe defaults when the request has no http block', () => {
    const req = new BrunoRequest({});
    expect(req.getUrl()).toBe('');
    expect(req.getHost()).toBe('');
    expect(req.getMethod()).toBe('GET');
    expect(req.getHeaders()).toEqual({});
    expect(req.getAuthMode()).toBe('none');
    expect(req.getPathParams()).toEqual([]);
    expect(req.getTags()).toEqual([]);
  });
});
