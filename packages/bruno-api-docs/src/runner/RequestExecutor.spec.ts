import { describe, it, expect, vi, afterEach } from 'vitest';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { RequestExecutor, applyApiKeyToUrl } from './RequestExecutor';
import { md5 } from 'js-md5';

describe('applyApiKeyToUrl', () => {
  it('appends the api key as a query param when placement is query', () => {
    const auth = { type: 'apikey', key: 'api_key', value: 'secret123', placement: 'query' };
    expect(applyApiKeyToUrl('https://api.example.com/data', auth)).toBe(
      'https://api.example.com/data?api_key=secret123'
    );
  });

  it('keeps existing query params when appending', () => {
    const auth = { type: 'apikey', key: 'api_key', value: 'secret123', placement: 'query' };
    expect(applyApiKeyToUrl('https://api.example.com/data?foo=bar', auth)).toBe(
      'https://api.example.com/data?foo=bar&api_key=secret123'
    );
  });

  it('leaves the url untouched when placement is not query', () => {
    const auth = { type: 'apikey', key: 'api_key', value: 'secret123', placement: 'header' };
    expect(applyApiKeyToUrl('https://api.example.com/data', auth)).toBe(
      'https://api.example.com/data'
    );
  });

  it('leaves the url untouched when it cannot be parsed', () => {
    const auth = { type: 'apikey', key: 'api_key', value: 'secret123', placement: 'query' };
    expect(applyApiKeyToUrl('api.example.com/data', auth)).toBe('api.example.com/data');
  });
});

describe('RequestExecutor', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends the api key in the request url when placement is query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      url: 'https://api.example.com/data',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ ok: true })
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await new RequestExecutor().executeRequest({
      name: 'apikey query',
      type: 'http',
      http: {
        method: 'GET',
        url: 'https://api.example.com/data',
        auth: { type: 'apikey', key: 'api_key', value: 'secret123', placement: 'query' }
      }
    } as unknown as HttpRequest);

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/data?api_key=secret123');
  });

  describe('request body', () => {
    const sendWithBody = async (method: string) => {
      const fetchMock = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{}'
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const request = {
        name: `${method} with body`,
        type: 'http',
        http: {
          method,
          url: 'https://api.example.com/data',
          body: { type: 'json', data: '{"hello":"world"}' }
        }
      } as unknown as Parameters<RequestExecutor['executeRequest']>[0];

      await new RequestExecutor().executeRequest(request);

      return fetchMock.mock.calls[0][1];
    };

    it.each(['POST', 'PUT', 'PATCH'])('sends the body for the standard method %s', async (method) => {
      expect((await sendWithBody(method)).body).toBe('{"hello":"world"}');
    });

    it.each(['PURGE', 'REPORT', 'DELETE', 'OPTIONS'])(
      'sends the body for %s, which the old allowlist dropped',
      async (method) => {
        expect((await sendWithBody(method)).body).toBe('{"hello":"world"}');
      }
    );

    // fetch throws if a body is attached to these.
    it.each([['purge', 'PURGE'], ['  purge  ', 'PURGE'], ['DeLeTe', 'DELETE']])(
      'sends %s as %s',
      async (stored, expected) => {
        expect((await sendWithBody(stored)).method).toBe(expected);
      }
    );

    it('still omits the body for a lower-cased get', async () => {
      expect((await sendWithBody('get')).body).toBeUndefined();
    });

    it.each(['GET', 'HEAD'])('omits the body for %s', async (method) => {
      expect((await sendWithBody(method)).body).toBeUndefined();
    });
  });

  describe('timeout', () => {
    const run = async (request: Parameters<RequestExecutor['executeRequest']>[0], options?: { timeout?: number }) => {
      const fetchMock = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });
      vi.stubGlobal('fetch', fetchMock);
      await new RequestExecutor().executeRequest(request, options);
      return fetchMock.mock.calls[0][1];
    };
    const httpReq = (settings?: { timeout?: number | 'inherit' }) => ({
      type: 'http',
      http: { method: 'GET', url: 'https://api.example.com/data' },
      ...(settings ? { settings } : {})
    });

    it('uses request.settings.timeout for the abort signal, overriding the runner default', async () => {
      const spy = vi.spyOn(AbortSignal, 'timeout');
      await run(httpReq({ timeout: 5000 }), { timeout: 30000 });
      expect(spy).toHaveBeenCalledWith(5000);
    });

    it('skips the abort signal when the timeout is 0 (no timeout)', async () => {
      const spy = vi.spyOn(AbortSignal, 'timeout');
      const opts = await run(httpReq({ timeout: 0 }), { timeout: 30000 });
      expect(spy).not.toHaveBeenCalled();
      expect(opts.signal).toBeUndefined();
    });

    it('falls back to the runner timeout when settings.timeout is not a number (e.g. "inherit")', async () => {
      const spy = vi.spyOn(AbortSignal, 'timeout');
      await run(httpReq({ timeout: 'inherit' }), { timeout: 12000 });
      expect(spy).toHaveBeenCalledWith(12000);
    });
  });

  describe('disableParsingResponseJson', () => {
    const runJson = async (
      request: Parameters<RequestExecutor['executeRequest']>[0] & { __brunoDisableParsingResponseJson?: boolean }
    ) => {
      const fetchMock = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{"a":1}').buffer
      });
      vi.stubGlobal('fetch', fetchMock);
      return new RequestExecutor().executeRequest(request);
    };
    const httpReq = { type: 'http', http: { method: 'GET', url: 'https://api.example.com/data' } };

    it('parses a JSON response body by default', async () => {
      const res = await runJson(httpReq);
      expect(res.data).toEqual({ a: 1 });
    });

    it('returns the raw text when the request set __brunoDisableParsingResponseJson', async () => {
      const res = await runJson({ ...httpReq, __brunoDisableParsingResponseJson: true });
      expect(res.data).toBe('{"a":1}');
    });
  });
});

describe('RequestExecutor digest auth', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const CHALLENGE = 'Digest realm="digest-lab", nonce="abc123def", opaque="deadbeef", algorithm=MD5, qop="auth"';
  const response = (status: number, headers: Record<string, string> = {}, body = '{}') => ({
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    url: 'https://api.example.com/data?x=1',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    text: async () => body,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer
  });

  const digestRequest = (auth: Record<string, unknown>, headers: unknown[] = []) => ({
    name: 'digest request',
    type: 'http',
    http: { method: 'GET', url: 'https://api.example.com/data?x=1', auth, headers }
  } as unknown as HttpRequest);

  const executeWith = (fetchMock: ReturnType<typeof vi.fn>, auth: Record<string, unknown>, headers: unknown[] = []) => {
    global.fetch = fetchMock as unknown as typeof fetch;
    return new RequestExecutor().executeRequest(digestRequest(auth, headers));
  };

  it('answers a digest challenge with a second, correctly signed request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }))
      .mockResolvedValueOnce(response(200));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstLegHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(firstLegHeaders).map((k) => k.toLowerCase())).not.toContain('authorization');

    const sent = (fetchMock.mock.calls[1][1].headers as Record<string, string>)['Authorization'];
    expect(sent).toMatch(/^Digest username="user", realm="digest-lab", nonce="abc123def", uri="\/data\?x=1", response="[0-9a-f]{32}", qop=auth, algorithm=MD5, nc=00000001, cnonce="[0-9a-f]{48}", opaque="deadbeef"$/);

    const cnonceMatch = /cnonce="([0-9a-f]{48})"/.exec(sent);
    const responseMatch = /response="([0-9a-f]{32})"/.exec(sent);
    expect(cnonceMatch).not.toBeNull();
    expect(responseMatch).not.toBeNull();
    const expected = md5(`${md5('user:digest-lab:pass')}:abc123def:00000001:${cnonceMatch![1]}:auth:${md5('GET:/data?x=1')}`);
    expect(responseMatch![1]).toBe(expected);
  });

  it('sends both digest legs with credentials omitted', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }))
      .mockResolvedValueOnce(response(200));

    await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
    expect(fetchMock.mock.calls[1][1].credentials).toBe('omit');
  });

  it('surfaces the second 401 as the final response without a third attempt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }))
      .mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'wrong' });

    expect(result.status).toBe(401);
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies a cross-origin 401 without a readable challenge header', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://docs.example.com', href: 'https://docs.example.com/apidocs' } });
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.errorType).toBe('digest-challenge-unreadable');
    expect(result.error).toContain('Access-Control-Expose-Headers');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a same-origin 401 without a challenge header as the final response', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://api.example.com', href: 'https://api.example.com/apidocs' } });
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.status).toBe(401);
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies a challenge that requests a non-MD5 algorithm', async () => {
    const challenge = CHALLENGE.replace('algorithm=MD5', 'algorithm=SHA-256');
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401, { 'www-authenticate': challenge }));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.errorType).toBe('digest-unsupported-algorithm');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies a challenge missing realm or nonce', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401, { 'www-authenticate': 'Digest qop="auth"' }));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.errorType).toBe('digest-malformed-challenge');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a non-digest 401 as the final response', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401, { 'www-authenticate': 'Basic realm="digest-lab"' }));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.status).toBe(401);
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers the digest challenge when another scheme is listed before it', async () => {
    const merged = `Basic realm="digest-lab", ${CHALLENGE}`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { 'www-authenticate': merged }))
      .mockResolvedValueOnce(response(200));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>)['Authorization']).toMatch(/^Digest username="user", realm="digest-lab"/);
  });

  it('sends a single request, body included, when the server never challenges', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200, {}, '{"real":true}'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await new RequestExecutor().executeRequest({
      name: 'digest post no challenge',
      type: 'http',
      http: {
        method: 'POST',
        url: 'https://api.example.com/data?x=1',
        auth: { type: 'digest', username: 'user', password: 'pass' },
        body: { type: 'json', data: '{"a":1}' }
      }
    } as unknown as HttpRequest);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
    expect(result.data).toEqual({ real: true });
  });

  it.each([
    ['empty', { type: 'digest', username: '', password: 'pass' }],
    ['missing', { type: 'digest', password: 'pass' }]
  ])('skips the digest flow when the username is %s', async (_label, auth) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }));
    await executeWith(fetchMock, auth);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].credentials).toBeUndefined();
  });

  it.each([
    ['an empty', { type: 'digest', username: 'user', password: '' }],
    ['an absent', { type: 'digest', username: 'user' }]
  ])('answers the challenge for %s password, which digest permits', async (_label, auth) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }))
      .mockResolvedValueOnce(response(200));

    const result = await executeWith(fetchMock, auth);

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies a challenge whose qop list does not offer auth', async () => {
    const challenge = CHALLENGE.replace('qop="auth"', 'qop="auth-int"');
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401, { 'www-authenticate': challenge }));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.errorType).toBe('digest-unsupported-qop');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a challenge delivered through a cross-origin redirect', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ...response(401, { 'www-authenticate': CHALLENGE }),
      redirected: true,
      url: 'https://attacker.example.net/login'
    });

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.errorType).toBe('digest-redirected-challenge');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('hashes and retries against the redirect target after a same-origin redirect', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ...response(401, { 'www-authenticate': CHALLENGE }),
        redirected: true,
        url: 'https://api.example.com/moved?y=2'
      })
      .mockResolvedValueOnce(response(200));

    const result = await executeWith(fetchMock, { type: 'digest', username: 'user', password: 'pass' });

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/moved?y=2');
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>)['Authorization']).toContain('uri="/moved?y=2"');
  });

  it('leaves a manually set Authorization header alone', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }));

    await executeWith(
      fetchMock,
      { type: 'digest', username: 'user', password: 'pass' },
      [{ name: 'Authorization', value: 'Bearer token123', disabled: false }]
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)['Authorization']).toBe('Bearer token123');
  });

  it('sends the body on both the challenged leg and the signed retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { 'www-authenticate': CHALLENGE }))
      .mockResolvedValueOnce(response(200));
    global.fetch = fetchMock as unknown as typeof fetch;

    await new RequestExecutor().executeRequest({
      name: 'digest post',
      type: 'http',
      http: {
        method: 'POST',
        url: 'https://api.example.com/data?x=1',
        auth: { type: 'digest', username: 'user', password: 'pass' },
        body: { type: 'json', data: '{"a":1}' }
      }
    } as unknown as HttpRequest);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}');
    expect(fetchMock.mock.calls[1][1].body).toBe('{"a":1}');
  });

  it('does not alter credentials for non-digest auth', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200));

    await executeWith(fetchMock, { type: 'basic', username: 'user', password: 'pass' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].credentials).toBeUndefined();
  });
});
