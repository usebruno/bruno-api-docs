import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { newQuickJSWASMModule, type QuickJSContext } from 'quickjs-emscripten';
import addAxiosShimToContext, { serializeAxiosParams, performAxiosRequest } from './axios';

const CASES: [string, Record<string, unknown>, string][] = [
  ['flat primitive array', { ids: [1, 2] }, 'ids%5B%5D=1&ids%5B%5D=2'],
  ['mixed flat with bool', { q: 'hi', ids: [1, 2], flag: true }, 'q=hi&ids%5B%5D=1&ids%5B%5D=2&flag=true'],
  ['flat object', { n: { a: 1, b: 2 } }, 'n%5Ba%5D=1&n%5Bb%5D=2'],
  ['nested primitive array indexed', { a: { b: [1, 2] } }, 'a%5Bb%5D%5B0%5D=1&a%5Bb%5D%5B1%5D=2'],
  ['array of objects', { arr: [{ x: 1 }, { x: 2 }] }, 'arr%5B0%5D%5Bx%5D=1&arr%5B1%5D%5Bx%5D=2'],
  ['mixed array', { m: [1, { x: 2 }] }, 'm%5B0%5D=1&m%5B1%5D%5Bx%5D=2'],
  ['null and undefined dropped', { a: null, b: undefined, c: 0, d: '' }, 'c=0&d='],
  ['space and ampersand', { q: 'a b&c' }, 'q=a+b%26c'],
  ['unreserved chars kept raw', { q: 'it\'s~(x)!*' }, 'q=it\'s~(x)!*'],
  ['colon dollar comma kept raw', { q: 'a:b$c,d' }, 'q=a:b$c,d'],
  ['plus is encoded', { q: 'a+b' }, 'q=a%2Bb'],
  ['unicode', { u: 'ünïcödé' }, 'u=%C3%BCn%C3%AFc%C3%B6d%C3%A9'],
  ['date top level', { d: new Date(0) }, 'd=1970-01-01T00:00:00.000Z'],
  ['date nested', { a: { d: new Date(0) } }, 'a%5Bd%5D=1970-01-01T00:00:00.000Z'],
  ['bracket key scalar', { 'ids[]': 42 }, 'ids%5B%5D=42'],
  ['bracket key array', { 'ids[]': [1, 2] }, 'ids%5B%5D=1&ids%5B%5D=2'],
  ['bracket key non-flat array', { 'ids[]': [{ x: 1 }, 3.14] }, 'ids%5B%5D=%5Bobject+Object%5D&ids%5B%5D=3.14'],
  ['empty array and object omitted', { a: [], b: {}, c: 1 }, 'c=1'],
  ['deep nesting', { a: { b: { c: 1 } } }, 'a%5Bb%5D%5Bc%5D=1']
];

describe('serializeAxiosParams — axios default paramsSerializer parity', () => {
  it.each(CASES)('%s', (_label, params, expected) => {
    expect(serializeAxiosParams(params)).toBe(expected);
  });

  it('returns an empty string for params with only null and undefined', () => {
    expect(serializeAxiosParams({ a: null, b: undefined })).toBe('');
  });
});

describe('performAxiosRequest — body and status handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubFetch = (status: number, body = '{}') => {
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response(body, {
      status,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', spy);
    return spy;
  };

  it('drops the request body on GET even when data is provided', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a', method: 'get', data: { a: 1 } });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it('drops the request body on HEAD', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a', method: 'head', data: { a: 1 } });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it('sends a JSON body on POST', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a', method: 'post', data: { a: 1 } });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"a":1}');
  });

  it('throws ERR_BAD_REQUEST on 404 by default', async () => {
    stubFetch(404);
    await expect(
      performAxiosRequest({ url: 'https://x.test/a', method: 'get' })
    ).rejects.toMatchObject({ code: 'ERR_BAD_REQUEST', response: { status: 404 } });
  });

  it('throws ERR_BAD_RESPONSE on 500 by default', async () => {
    stubFetch(500);
    await expect(
      performAxiosRequest({ url: 'https://x.test/a', method: 'get' })
    ).rejects.toMatchObject({ code: 'ERR_BAD_RESPONSE', response: { status: 500 } });
  });

  it('resolves a 404 when validateStatus accepts it', async () => {
    stubFetch(404, '{"err":"nope"}');
    const res = await performAxiosRequest({
      url: 'https://x.test/a',
      method: 'get',
      validateStatus: () => true
    });
    expect(res.status).toBe(404);
    expect(res.data).toEqual({ err: 'nope' });
  });

  it('resolves any status when validateStatus is null', async () => {
    stubFetch(500);
    const res = await performAxiosRequest({
      url: 'https://x.test/a',
      method: 'get',
      validateStatus: null
    });
    expect(res.status).toBe(500);
  });

  it('parses a JSON body even when content-type is text/plain', async () => {
    const spy = vi.fn(async () => new Response('{"token":"abc"}', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    }));
    vi.stubGlobal('fetch', spy);
    const res = await performAxiosRequest({ url: 'https://x.test/a', method: 'get' });
    expect(res.data).toEqual({ token: 'abc' });
  });

  it('keeps a non-JSON body as a string', async () => {
    const spy = vi.fn(async () => new Response('plain text', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    }));
    vi.stubGlobal('fetch', spy);
    const res = await performAxiosRequest({ url: 'https://x.test/a', method: 'get' });
    expect(res.data).toBe('plain text');
  });

  it('strips a #fragment before appending params', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a#top', method: 'get', params: { a: 1 } });
    expect(spy.mock.calls[0][0]).toBe('https://x.test/a?a=1');
  });

  it('keeps the #fragment when there are no params', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a#top', method: 'get' });
    expect(spy.mock.calls[0][0]).toBe('https://x.test/a#top');
  });

  it('still throws when validateStatus rejects the status', async () => {
    stubFetch(200);
    await expect(
      performAxiosRequest({ url: 'https://x.test/a', method: 'get', validateStatus: (s) => s === 201 })
    ).rejects.toMatchObject({ code: 'ERR_BAD_RESPONSE' });
  });

  it('rejects a non-absolute URL without touching fetch', async () => {
    const spy = stubFetch(200);
    await expect(
      performAxiosRequest({ url: '/relative/path', method: 'get' })
    ).rejects.toMatchObject({ code: 'ERR_INVALID_URL' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('maps a fetch timeout to ECONNABORTED with the axios message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      const error = new Error('signal timed out');
      error.name = 'TimeoutError';
      throw error;
    }));
    await expect(
      performAxiosRequest({ url: 'https://x.test/a', method: 'get', timeout: 100 })
    ).rejects.toMatchObject({ code: 'ECONNABORTED', message: 'timeout of 100ms exceeded' });
  });

  it('sets a Basic Authorization header from config.auth', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a', method: 'get', auth: { username: 'u', password: 'p' } });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Basic ${btoa('u:p')}`);
  });

  it('keeps the request body on DELETE', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a', method: 'delete', data: { a: 1 } });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"a":1}');
  });

  it('sends string data as-is without forcing a JSON content type', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a', method: 'post', data: 'raw=payload' });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('raw=payload');
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('appends params with & when the URL already has a query', async () => {
    const spy = stubFetch(200);
    await performAxiosRequest({ url: 'https://x.test/a?x=1', method: 'get', params: { a: 1 } });
    expect(spy.mock.calls[0][0]).toBe('https://x.test/a?x=1&a=1');
  });

  it('returns an empty string for an empty response body', async () => {
    stubFetch(200, '');
    const res = await performAxiosRequest({ url: 'https://x.test/a', method: 'get' });
    expect(res.data).toBe('');
  });

  it('parses a bare JSON primitive body into its value', async () => {
    const spy = vi.fn(async () => new Response('123', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    }));
    vi.stubGlobal('fetch', spy);
    const res = await performAxiosRequest({ url: 'https://x.test/a', method: 'get' });
    expect(res.data).toBe(123);
  });

  it('throws ERR_BAD_RESPONSE for a non-4xx failing status', async () => {
    stubFetch(300);
    await expect(
      performAxiosRequest({ url: 'https://x.test/a', method: 'get' })
    ).rejects.toMatchObject({ code: 'ERR_BAD_RESPONSE', response: { status: 300 } });
  });
});

describe('validateStatus bridged through the QuickJS sandbox', () => {
  let vm: QuickJSContext;

  beforeAll(async () => {
    const module = await newQuickJSWASMModule();
    vm = module.newContext();
    addAxiosShimToContext(vm);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubFetch = (status: number, body = '{}') => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, {
      status,
      headers: { 'content-type': 'application/json' }
    })));
  };

  const inVmAsync = async (expression: string) => {
    const result = vm.evalCode(`(async () => (${expression}))()`);
    const promiseHandle = vm.unwrapResult(result);
    const resolving = vm.resolvePromise(promiseHandle);
    vm.runtime.executePendingJobs();
    const resolved = await resolving;
    promiseHandle.dispose();
    if (resolved.error) {
      const error = vm.dump(resolved.error);
      resolved.error.dispose();
      throw error;
    }
    const value = vm.dump(resolved.value);
    resolved.value.dispose();
    return value;
  };

  it('a script-supplied validateStatus function lets a 404 resolve', async () => {
    stubFetch(404, '{"err":"missing"}');
    const status = await inVmAsync(
      `(await axios.get('https://x.test/a', { validateStatus: (s) => s < 500 })).status`
    );
    expect(status).toBe(404);
  });

  it('a script-supplied validateStatus function can reject a 2xx', async () => {
    stubFetch(200);
    const message = await inVmAsync(
      `axios.get('https://x.test/a', { validateStatus: (s) => s === 201 })
        .then(() => 'NO-THROW', (e) => e.message)`
    );
    expect(message).toBe('Request failed with status code 200');
  });

  it('bridges validateStatus on the axios(config) shape', async () => {
    stubFetch(404);
    const status = await inVmAsync(
      `(await axios({ url: 'https://x.test/a', validateStatus: (s) => s < 500 })).status`
    );
    expect(status).toBe(404);
  });

  it('bridges validateStatus on the axios.post(url, data, config) shape', async () => {
    stubFetch(404);
    const status = await inVmAsync(
      `(await axios.post('https://x.test/a', { a: 1 }, { validateStatus: (s) => s < 500 })).status`
    );
    expect(status).toBe(404);
  });

  it('propagates an error thrown inside the script validateStatus', async () => {
    stubFetch(200);
    const message = await inVmAsync(
      `axios.get('https://x.test/a', { validateStatus: () => { throw new Error('boom from script'); } })
        .then(() => 'NO-THROW', (e) => e.message)`
    );
    expect(message).toBe('boom from script');
  });

  it('still rejects a 404 without validateStatus', async () => {
    stubFetch(404);
    const message = await inVmAsync(
      `axios.get('https://x.test/a').then(() => 'NO-THROW', (e) => e.message)`
    );
    expect(message).toBe('Request failed with status code 404');
  });

  it('delivers response data, status and headers into the sandbox', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"token":"abc","n":1}', {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-request-id': 'r-1' }
    })));
    const seen = await inVmAsync(`
      axios.get('https://x.test/a').then((res) => ({
        status: res.status,
        token: res.data.token,
        n: res.data.n,
        requestId: res.headers['x-request-id']
      }))
    `);
    expect(seen).toEqual({ status: 200, token: 'abc', n: 1, requestId: 'r-1' });
  });

  it('sends the sandbox-built config through fetch on POST', async () => {
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', spy);
    await inVmAsync(`axios.post('https://x.test/a', { a: 1 }, { headers: { 'X-Key': 'k1' } })`);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.test/a');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)['X-Key']).toBe('k1');
  });

  it('delivers the axios error shape into the sandbox on a 500', async () => {
    stubFetch(500, '{"err":"down"}');
    const seen = await inVmAsync(`
      axios.get('https://x.test/a').then(() => 'NO-THROW', (e) => ({
        isAxiosError: e.isAxiosError,
        code: e.code,
        status: e.response.status,
        err: e.response.data.err
      }))
    `);
    expect(seen).toEqual({ isAxiosError: true, code: 'ERR_BAD_RESPONSE', status: 500, err: 'down' });
  });

  it('works with the plain axios(url) shape from the sandbox', async () => {
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));
    vi.stubGlobal('fetch', spy);
    const status = await inVmAsync(`(await axios('https://x.test/a')).status`);
    expect(status).toBe(200);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('GET');
  });

  it('throws a clear error for unsupported axios methods in the sandbox', async () => {
    const message = await inVmAsync(`
      (() => { try { axios.head('https://x.test/a'); return 'NO-THROW'; } catch (e) { return e.message; } })()
    `);
    expect(message).toBe('axios.head is not supported in the docs playground; use axios(config) or axios.get/post/put/patch/delete.');
  });

  it('delivers a network error with the CORS hint into the sandbox', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    const seen = await inVmAsync(`
      axios.get('https://x.test/a').then(() => 'NO-THROW', (e) => ({
        code: e.code,
        message: e.message,
        hasHint: typeof e.hint === 'string'
      }))
    `);
    expect(seen).toEqual({ code: 'ERR_NETWORK', message: 'Network Error', hasHint: true });
  });
});
