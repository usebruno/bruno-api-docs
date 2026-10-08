import { describe, it, expect, vi } from 'vitest';
import { RequestRunner } from './index';
import { parseYaml } from '@/utils/yamlUtils';

interface SentRequest {
  url?: string;
  method?: string;
  headers: Headers;
  body?: unknown;
  timeoutArg?: number;
}

const sendWith = async (yaml: string, itemPath: number[] = [0]): Promise<SentRequest> => {
  const originalFetch = global.fetch;
  const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
  let sent: SentRequest = { headers: new Headers() };
  global.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
    sent = { url, method: init.method, headers: new Headers(init.headers), body: init.body };
    return Promise.resolve({
      status: 200,
      statusText: 'OK',
      url,
      headers: new Headers({ 'content-type': 'application/json' }),
      arrayBuffer: async () => new TextEncoder().encode('{}').buffer
    });
  });

  const collection = parseYaml(yaml);
  let item: unknown = collection;
  for (const i of itemPath) item = (item as { items: unknown[] }).items[i];

  await new RequestRunner().runRequest({
    item: item as Parameters<RequestRunner['runRequest']>[0]['item'],
    collection,
    timeout: 30000
  });

  const calls = timeoutSpy.mock.calls;
  const call = calls.length > 0 ? calls[calls.length - 1] : null;
  if (call) sent.timeoutArg = call[0];
  timeoutSpy.mockRestore();
  global.fetch = originalFetch;
  return sent;
};

const HEADERS = `
        - name: "Content-Type"
          value: "application/json"
        - name: "X-A"
          value: "1"
        - name: "X-B"
          value: "2"`;

const preReq = (
  script: string,
  opts: { method?: string; headers?: string; body?: string; params?: string } = {}
): string => {
  const { method = 'POST', headers = HEADERS, body = '', params = '' } = opts;
  const code = script.split('\n').map((line) => '            ' + line).join('\n');
  return `
opencollection: "1.0.0"
info:
  name: "Req Mutations"
items:
  - name: "r"
    type: "http"
    http:
      method: "${method}"
      url: "https://api.example.com/base"
      headers:${headers}${params}${body}
    runtime:
      scripts:
        - type: before-request
          code: |
${code}
`;
};

const entries = (h?: Headers): [string, string][] => [...(h ?? new Headers())];

describe('req.* mutations in a pre-request script reach the sent request', () => {
  it('setUrl and setMethod change the sent url and method', async () => {
    const sent = await sendWith(preReq(`req.setUrl('https://api.example.com/changed');\nreq.setMethod('PUT');`));
    expect(sent.url).toBe('https://api.example.com/changed');
    expect(sent.method).toBe('PUT');
  });

  it('setHeader adds a new header and updates an existing one', async () => {
    const sent = await sendWith(preReq(`req.setHeader('X-A', 'updated');\nreq.setHeader('X-New', 'added');`));
    expect(sent.headers.get('X-A')).toBe('updated');
    expect(sent.headers.get('X-New')).toBe('added');
  });

  it('setHeader updates case-insensitively without duplicating the header', async () => {
    const sent = await sendWith(preReq(`req.setHeader('content-type', 'application/xml');`));
    const contentTypes = entries(sent.headers).filter(([k]) => k === 'content-type');
    expect(sent.headers.get('content-type')).toBe('application/xml');
    expect(contentTypes).toHaveLength(1);
  });

  it('setHeader coerces a non-string value to a string', async () => {
    const sent = await sendWith(preReq(`req.setHeader('X-Num', 42);`));
    expect(sent.headers.get('X-Num')).toBe('42');
  });

  it('deleteHeader and deleteHeaders remove headers', async () => {
    const sent = await sendWith(preReq(`req.deleteHeader('X-A');\nreq.deleteHeaders(['X-B']);`));
    expect(sent.headers.has('X-A')).toBe(false);
    expect(sent.headers.has('X-B')).toBe(false);
  });

  it('setHeaders replaces the enabled headers', async () => {
    const sent = await sendWith(preReq(`req.setHeaders({ 'X-Only': 'yes' });`));
    expect(sent.headers.get('X-Only')).toBe('yes');
    expect(sent.headers.has('X-A')).toBe(false);
    expect(sent.headers.has('X-B')).toBe(false);
  });

  it('headerList add / upsert / remove / repopulate / clear reach the sent request', async () => {
    const added = await sendWith(preReq(`req.headerList.add('X-List', 'v');`));
    expect(added.headers.get('X-List')).toBe('v');

    const upserted = await sendWith(preReq(`req.headerList.upsert('X-A', 'up');`));
    expect(upserted.headers.get('X-A')).toBe('up');

    const removedByName = await sendWith(preReq(`req.headerList.remove('X-A');`));
    expect(removedByName.headers.has('X-A')).toBe(false);

    const removedByPredicate = await sendWith(preReq(`req.headerList.remove((h) => h.key === 'X-B');`));
    expect(removedByPredicate.headers.has('X-B')).toBe(false);

    const repopulated = await sendWith(preReq(`req.headerList.repopulate([{ key: 'X-Fresh', value: 'f' }]);`));
    expect(repopulated.headers.get('X-Fresh')).toBe('f');
    expect(repopulated.headers.has('X-A')).toBe(false);

    const cleared = await sendWith(preReq(`req.headerList.clear();\nreq.headerList.add('X-Sole', '1');`));
    expect(cleared.headers.get('X-Sole')).toBe('1');
    expect(cleared.headers.has('X-A')).toBe(false);
  });

  it('setBody serialises an object and the request is sent as that JSON', async () => {
    const body = `
      body:
        type: "json"
        data: '{"a":1}'`;
    const sent = await sendWith(preReq(`req.setBody({ b: 2 });`, { body }));
    expect(String(sent.body)).toContain('"b":2');
    expect(String(sent.body)).not.toContain('"a":1');
  });

  it('setBody with an object sets a JSON content-type even when the request had none', async () => {
    const sent = await sendWith(preReq(`req.setBody({ a: 1 });`, { method: 'POST', headers: '\n        []' }));
    expect(String(sent.body)).toContain('"a":1');
    expect(sent.headers.get('content-type')).toContain('application/json');
  });

  it('setBody with { raw: true } sends the string verbatim', async () => {
    const body = `
      body:
        type: "text"
        data: 'old'`;
    const sent = await sendWith(preReq(`req.setBody('raw-text', { raw: true });`, { body }));
    expect(String(sent.body)).toBe('raw-text');
  });

  it('setMethod to a bodyless method (GET) drops the body', async () => {
    const body = `
      body:
        type: "json"
        data: '{"a":1}'`;
    const sent = await sendWith(preReq(`req.setMethod('GET');`, { body }));
    expect(sent.method).toBe('GET');
    expect(sent.body == null).toBe(true);
  });

  it('setTimeout flows to the request abort signal', async () => {
    const sent = await sendWith(preReq(`req.setTimeout(1234);`));
    expect(sent.timeoutArg).toBe(1234);
  });

  it('getHeader / getHeaders reflect earlier mutations within the same script', async () => {
    const sent = await sendWith(
      preReq(`req.setHeader('X-RW', '1');\nif (req.getHeader('X-RW') === '1' && req.getHeaders()['X-RW'] === '1') { req.setHeader('X-RW-OK', 'yes'); }`)
    );
    expect(sent.headers.get('X-RW-OK')).toBe('yes');
  });

  it('a collection-level pre-request script mutates the sent request', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "C"
request:
  scripts:
    - type: before-request
      code: |
        req.setHeader('X-From-Collection', 'yes');
        req.setMethod('PATCH');
items:
  - name: "r"
    type: "http"
    http:
      method: "POST"
      url: "https://api.example.com/base"
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('X-From-Collection')).toBe('yes');
    expect(sent.method).toBe('PATCH');
  });

  it('a folder-level pre-request script mutates the sent request', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "F"
items:
  - name: "folder"
    type: "folder"
    request:
      scripts:
        - type: before-request
          code: |
            req.setHeader('X-From-Folder', 'yes');
    items:
      - name: "r"
        type: "http"
        http:
          method: "GET"
          url: "https://api.example.com/base"
`;
    const sent = await sendWith(yaml, [0, 0]);
    expect(sent.headers.get('X-From-Folder')).toBe('yes');
  });

  it('a pre-request script that sets Authorization wins over inherited collection bearer auth', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Script Auth Precedence"
request:
  auth:
    type: "bearer"
    token: "collection-token"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
      auth: inherit
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('authorization', 'Bearer script-token');
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('authorization')).toBe('Bearer script-token');
  });

  it('a pre-request script that sets the api key header wins over the request api key auth', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Script ApiKey Precedence"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
      auth:
        type: "apikey"
        key: "X-API-Key"
        value: "config-key"
        placement: "header"
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('X-API-Key', 'script-key');
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('x-api-key')).toBe('script-key');
  });

  it('folder-level inherited basic auth overwrites a pre-request script Authorization header, as on desktop', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Folder Auth Precedence"
items:
  - name: "folder"
    type: "folder"
    request:
      auth:
        type: "basic"
        username: "user"
        password: "pass"
    items:
      - name: "r"
        type: "http"
        http:
          method: "GET"
          url: "https://api.example.com/base"
          auth: inherit
        runtime:
          scripts:
            - type: before-request
              code: |
                req.setHeader('AUTHORIZATION', 'Bearer script-token');
`;
    const sent = await sendWith(yaml, [0, 0]);
    expect(sent.headers.get('authorization')).toBe(`Basic ${btoa('user:pass')}`);
  });

  it('a Headers tab Authorization entry is overwritten by the request bearer auth when no script touches it', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Auth Tab Beats Headers Tab"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
      headers:
        - name: "Authorization"
          value: "Bearer tab-token"
      auth:
        type: "bearer"
        token: "config-token"
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('X-Other', 'set-by-script');
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('authorization')).toBe('Bearer config-token');
    expect(sent.headers.get('x-other')).toBe('set-by-script');
  });

  it('a pre-request script that overwrites the Headers tab Authorization entry wins over the request bearer auth', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Script Beats Both Tabs"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
      headers:
        - name: "Authorization"
          value: "Bearer tab-token"
      auth:
        type: "bearer"
        token: "config-token"
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('Authorization', 'Bearer script-token');
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('authorization')).toBe('Bearer script-token');
  });

  it('a collection cannot pre-declare script-written headers to suppress the configured auth', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Injected Script Header List"
items:
  - name: "r"
    type: "http"
    __brunoHeadersSetByScript: ["authorization"]
    http:
      method: "GET"
      url: "https://api.example.com/base"
      headers:
        - name: "Authorization"
          value: "Bearer tab-token"
      auth:
        type: "bearer"
        token: "config-token"
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('authorization')).toBe('Bearer config-token');
  });

  it('a pre-request script overwriting a header that has duplicate rows sends the script value once, with no auth configured', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Duplicate Rows Collapse"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
      headers:
        - name: "X-Dup"
          value: "row-one"
        - name: "X-Dup"
          value: "row-two"
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('X-Dup', 'script');
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('x-dup')).toBe('script');
  });

  it('a pre-request script overwriting duplicate Authorization rows wins over the configured bearer auth', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Duplicate Rows Then Script"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
      headers:
        - name: "Authorization"
          value: "Bearer row-one"
        - name: "Authorization"
          value: "Bearer row-two"
      auth:
        type: "bearer"
        token: "config-token"
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('Authorization', 'Bearer script-token');
`;
    const sent = await sendWith(yaml);
    expect(sent.headers.get('authorization')).toBe('Bearer script-token');
  });

  it('editing an inherited header in a pre-request script stays request-local and does not corrupt the shared collection config', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "Inherited Header Isolation"
request:
  headers:
    - name: "X-Inherited"
      value: "original"
items:
  - name: "r"
    type: "http"
    http:
      method: "GET"
      url: "https://api.example.com/base"
    runtime:
      scripts:
        - type: before-request
          code: |
            req.setHeader('X-Inherited', 'mutated');
`;
    const originalFetch = global.fetch;
    let sent: SentRequest = { headers: new Headers() };
    global.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      sent = { url, method: init.method, headers: new Headers(init.headers), body: init.body };
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        url,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });
    });

    const collection = parseYaml(yaml);
    const item = (collection as { items: unknown[] }).items[0];
    await new RequestRunner().runRequest({
      item: item as Parameters<RequestRunner['runRequest']>[0]['item'],
      collection,
      timeout: 30000
    });
    global.fetch = originalFetch;

    const parsedCollection = collection as { request: { headers: Array<{ name: string; value: string }> } };
    expect(sent.headers.get('X-Inherited')).toBe('mutated');
    expect(parsedCollection.request.headers).toEqual([{ name: 'X-Inherited', value: 'original' }]);
  });
});
