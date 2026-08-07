import { describe, it, expect, vi, afterEach } from 'vitest';
import { RequestExecutor, applyApiKeyToUrl } from './RequestExecutor';

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
    } as any);

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
