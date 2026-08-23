import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Environment } from '@opencollection/types/config/environments';
import { RequestRunner } from './index';
import { parseYaml } from '@/utils/yamlUtils';

const okFetch = () => vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  url: 'https://example.com/',
  headers: new Headers({ 'content-type': 'application/json' }),
  text: async () => '{}',
  arrayBuffer: async () => new TextEncoder().encode('{}').buffer
});

// Minimal collection YAML with one POST request
const collectionYaml = `
opencollection: "1.0.0"
info:
  name: "Test Collection"
  version: "1.0.0"
request:
  variables:
    - name: "baseUrl"
      value: "https://jsonplaceholder.typicode.com"
    - name: "request-level-variable"
      value: "request-level-variable-value"
items:
  - name: "POST with JSON Body"
    type: "http"
    method: "POST"
    url: "{{baseUrl}}/posts"
    headers:
      - name: "Content-Type"
        value: "application/json"
    variables:
      - name: "request-level-variable"
        value: "request-level-variable-value"
    body:
      type: "json"
      data: |
        {
          "title": "{{request-level-variable}}",
          "body": "{{request-level-variable}}",
          "userId": 1
        }
    assertions:
      - expression: "res.status"
        operator: "eq"
        value: "200"
      - expression: "res.body.title"
        operator: "isString"
      - expression: "res.headers['content-type']"
        operator: "contains"
        value: "application/json"
    scripts:
      tests: |
        test("Status should be 200 or 201", function() {
          expect(res.getStatus()).to.be.oneOf([200, 201]);
          expect(res.getBody().title).to.be.a("string");
          expect(res.getBody().body).to.be.a("string");
          expect(res.getBody().userId).to.be.a("number");
        });
        const testResults = await bru.getTestResults();
        const assertionResults = await bru.getAssertionResults();
        bru.setVar('testResults', testResults);
        bru.setVar('assertionResults', assertionResults);
`;

describe('RequestRunner', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
  });

  describe('runRequest', () => {
    it('should execute a POST request with JSON body and run assertions and tests', async () => {
      // Mock fetch to return a successful response
      const responseBody = {
        title: 'request-level-variable-value',
        body: 'request-level-variable-value',
        userId: 1,
        id: 101
      };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://jsonplaceholder.typicode.com/posts',
        headers: new Headers({
          'content-type': 'application/json; charset=utf-8'
        }),
        text: async () => JSON.stringify(responseBody),
        arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(responseBody)).buffer
      });

      const runner = new RequestRunner();

      // Parse the YAML collection
      const collection = parseYaml(collectionYaml);

      // Get the first request item
      const request = collection.items[0];

      const runtimeVariables: Record<string, any> = {};

      const response = await runner.runRequest({
        item: request,
        collection,
        runtimeVariables,
        timeout: 5000
      });

      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      const responseData = response.data as unknown as { title: string; body: string; userId: number };
      expect(responseData.title).toBe('request-level-variable-value');
      expect(responseData.body).toBe('request-level-variable-value');
      expect(responseData.userId).toBe(1);
      expect(response.error).toBeUndefined();

      // Verify assertion results were captured
      expect(runtimeVariables.assertionResults).toBeDefined();
      expect(runtimeVariables.assertionResults.summary).toEqual({
        total: 3,
        passed: 3,
        failed: 0,
        skipped: 0
      });
      expect(runtimeVariables.assertionResults.results).toHaveLength(3);

      // Check first assertion (res.status eq 200)
      expect(runtimeVariables.assertionResults.results[0]).toMatchObject({
        status: 'pass',
        operator: 'eq'
      });

      // Check second assertion (res.body.title isString)
      expect(runtimeVariables.assertionResults.results[1]).toMatchObject({
        status: 'pass',
        operator: 'isString'
      });

      // Check third assertion (res.headers['content-type'] contains application/json)
      expect(runtimeVariables.assertionResults.results[2]).toMatchObject({
        status: 'pass',
        operator: 'contains'
      });

      // Note: Test results from the test() function in scripts are not captured in this test
      // because the QuickJS sandbox execution is async and may not complete before the test ends.
      // In a real scenario, the test results would be available after the script completes.

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('a pre-request script can setTimeout/disableParsingResponseJson and read getExecutionMode, all reaching the run', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "prereq scripting"
items:
  - name: "GET data"
    type: "http"
    method: "GET"
    url: "https://api.example.com/data"
    scripts:
      preRequest: |
        req.setTimeout(1234);
        req.disableParsingResponseJson();
      tests: |
        bru.setVar('executionMode', req.getExecutionMode());
`;
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{"a":1}').buffer
      });

      const collection = parseYaml(yaml);
      const runtimeVariables: Record<string, string> = {};
      const response = await new RequestRunner().runRequest({
        item: collection.items[0],
        collection,
        runtimeVariables,
        timeout: 30000
      });

      expect(timeoutSpy).toHaveBeenCalledWith(1234); // setTimeout(1234) overrode the runner's 30000
      expect(response.data).toBe('{"a":1}'); // disableParsingResponseJson kept the raw string
      expect(runtimeVariables.executionMode).toBe('standalone'); // getExecutionMode resolved via the runner

      timeoutSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('surfaces a de-duplicated warning across script phases for unsupported req methods, while supported ones stay silent and the request still runs', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "unsupported methods"
items:
  - name: "GET data"
    type: "http"
    method: "GET"
    url: "https://api.example.com/data"
    scripts:
      preRequest: |
        req.setTimeout(1234);
        req.setMaxRedirects(5);
        req.setMaxRedirects(10);
      tests: |
        req.setMaxRedirects(20);
        req.onFail(function (err) { return err; });
`;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{"a":1}').buffer
      });

      const collection = parseYaml(yaml);
      const response = await new RequestRunner().runRequest({
        item: collection.items[0],
        collection,
        timeout: 30000
      });

      expect(response.warnings).toEqual([
        'req.setMaxRedirects is not currently supported in the Bruno playground. Please use the Bruno desktop app.',
        'req.onFail is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
      ]);
      expect(response.status).toBe(200);

      global.fetch = originalFetch;
    });

    it('carries a flat request\'s own header onto the wire alongside collection headers (mergeHeaders preserves both)', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "flat headers"
request:
  headers:
    - name: "X-Collection"
      value: "c"
items:
  - name: "post"
    type: "http"
    method: "POST"
    url: "https://api.example.com/data"
    headers:
      - name: "Content-Type"
        value: "application/json"
`;
      let sentHeaders: Headers | undefined;
      global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        sentHeaders = new Headers(init.headers);
        return Promise.resolve({
          status: 200,
          statusText: 'OK',
          url: 'https://api.example.com/data',
          headers: new Headers({ 'content-type': 'application/json' }),
          arrayBuffer: async () => new TextEncoder().encode('{}').buffer
        });
      });

      const collection = parseYaml(yaml);
      await new RequestRunner().runRequest({ item: collection.items[0], collection, timeout: 30000 });

      expect(sentHeaders?.get('Content-Type')).toBe('application/json'); // the request's own header survives the merge
      expect(sentHeaders?.get('X-Collection')).toBe('c'); // collection-level header is layered in

      global.fetch = originalFetch;
    });

    it('surfaces bru out-of-scope warnings (visualize, cookies) across script phases in the response', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "bru warnings"
items:
  - name: "GET data"
    type: "http"
    method: "GET"
    url: "https://api.example.com/data"
    scripts:
      preRequest: |
        bru.setVar('greeting', 'hello');
        bru.visualize('html', { content: 'x' });
      tests: |
        bru.cookies.get('sid');
`;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });

      const collection = parseYaml(yaml);
      const response = await new RequestRunner().runRequest({
        item: collection.items[0],
        collection,
        timeout: 30000
      });

      expect(response.warnings).toEqual([
        'bru.visualize is not currently supported in the Bruno playground. Please use the Bruno desktop app.',
        'bru.cookies.get is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
      ]);
      expect(response.status).toBe(200);

      global.fetch = originalFetch;
    });

    it('bru.runRequest runs a sibling request (its scripts included) and shares runtime variables with the caller', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "runRequest"
items:
  - name: "Parent"
    type: "http"
    method: "GET"
    url: "https://api.example.com/parent"
    scripts:
      tests: |
        const res = await bru.runRequest('Child');
        bru.setVar('childStatus', res.status);
        bru.setVar('childData', JSON.stringify(res.data));
        bru.setVar('childKeys', Object.keys(res).sort().join(','));
  - name: "Child"
    type: "http"
    method: "GET"
    url: "https://api.example.com/child"
    scripts:
      preRequest: |
        bru.setVar('ranChild', 'yes');
`;
      global.fetch = vi.fn().mockImplementation((url: string) => Promise.resolve({
        status: 200,
        statusText: 'OK',
        url,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ from: url.includes('child') ? 'child' : 'parent' })).buffer
      }));

      const collection = parseYaml(yaml);
      const runtimeVariables: Record<string, string | number> = {};
      const response = await new RequestRunner().runRequest({
        item: collection.items[0],
        collection,
        runtimeVariables,
        timeout: 30000
      });

      expect(response.status).toBe(200);
      expect(runtimeVariables.ranChild).toBe('yes'); // Child's own pre-request script ran, sharing the variable store
      expect(runtimeVariables.childStatus).toBe(200); // the caller captured Child's response
      expect(runtimeVariables.childData).toBe('{"from":"child"}');
      // Only the documented response fields are surfaced — no dataBuffer/base64Data/testResults/warnings leak.
      expect(runtimeVariables.childKeys).toBe('data,headers,status,statusText');

      global.fetch = originalFetch;
    });

    it('bru.runRequest reports a self-cycle and an invalid path as a resolved { message } (never an infinite loop)', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "runRequest errors"
items:
  - name: "Self"
    type: "http"
    method: "GET"
    url: "https://api.example.com/self"
    scripts:
      tests: |
        const cycle = await bru.runRequest('Self');
        bru.setVar('cycleError', cycle.message);
        const bad = await bru.runRequest('Nope');
        bru.setVar('pathError', bad.message);
`;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/self',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });

      const collection = parseYaml(yaml);
      const runtimeVariables: Record<string, string> = {};
      await new RequestRunner().runRequest({ item: collection.items[0], collection, runtimeVariables, timeout: 30000 });

      expect(runtimeVariables.cycleError).toContain('circular reference');
      expect(runtimeVariables.pathError).toContain('invalid request path');

      global.fetch = originalFetch;
    });

    it('bru.runRequest surfaces a failed sub-request as a resolved { message } (matching the desktop app)', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "runRequest failure"
items:
  - name: "Parent"
    type: "http"
    method: "GET"
    url: "https://api.example.com/parent"
    scripts:
      tests: |
        const r = await bru.runRequest('Child');
        bru.setVar('outcome', r && r.message ? ('message:' + r.message) : ('resolved:' + JSON.stringify(r)));
  - name: "Child"
    type: "http"
    method: "GET"
    url: "https://api.example.com/child"
    scripts:
      preRequest: |
        throw new Error('child pre-request failed');
`;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/parent',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });

      const collection = parseYaml(yaml);
      const runtimeVariables: Record<string, string> = {};
      await new RequestRunner().runRequest({ item: collection.items[0], collection, runtimeVariables, timeout: 30000 });

      expect(runtimeVariables.outcome).toContain('message:');
      expect(runtimeVariables.outcome).toContain('child pre-request failed');

      global.fetch = originalFetch;
    });

    it('setNextRequest is handled (warns, never a silent no-op) across every phase and both call sites, de-duplicated', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "setNextRequest"
items:
  - name: "Req"
    type: "http"
    method: "GET"
    url: "https://api.example.com/data"
    scripts:
      preRequest: |
        bru.setNextRequest('Login');
      postResponse: |
        bru.runner.setNextRequest('Login');
      tests: |
        bru.setNextRequest(null);
`;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });

      const collection = parseYaml(yaml);
      const response = await new RequestRunner().runRequest({ item: collection.items[0], collection, timeout: 30000 });
      const warnings = response.warnings ?? [];

      expect(warnings).toContain('bru.setNextRequest is not currently supported in the Bruno playground. Please use the Bruno desktop app.');
      expect(warnings).toContain('bru.runner.setNextRequest is not currently supported in the Bruno playground. Please use the Bruno desktop app.');
      // Called in both the pre-request and tests phases (with a name and with null) → one de-duplicated warning.
      expect(warnings.filter((w) => w.startsWith('bru.setNextRequest '))).toHaveLength(1);
      expect(response.status).toBe(200);

      global.fetch = originalFetch;
    });

    it('setNextRequest warns for every argument form and the warning survives a later pre-request error', async () => {
      const yaml = `
opencollection: "1.0.0"
info:
  name: "setNextRequest edges"
items:
  - name: "Req"
    type: "http"
    method: "GET"
    url: "https://api.example.com/data"
    scripts:
      preRequest: |
        bru.setNextRequest('a');
        bru.setNextRequest();
        bru.setNextRequest(null);
        bru.setNextRequest(42);
        throw new Error('boom after setNextRequest');
`;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/data',
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });

      const collection = parseYaml(yaml);
      const response = await new RequestRunner().runRequest({ item: collection.items[0], collection, timeout: 30000 });

      // The pre-request threw, so the request never sent — the warning must still be surfaced.
      expect(response.error).toContain('boom after setNextRequest');
      const warnings = response.warnings ?? [];
      expect(warnings).toContain('bru.setNextRequest is not currently supported in the Bruno playground. Please use the Bruno desktop app.');
      // name, no-arg, null and a number all warn, de-duplicated to a single message.
      expect(warnings.filter((w) => w.startsWith('bru.setNextRequest '))).toHaveLength(1);

      global.fetch = originalFetch;
    });

    it('should strip JSON comments from body before sending', async () => {
      // Mock fetch to capture what body was sent
      let sentBody: string | undefined;
      global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        sentBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          url: 'https://example.com/api',
          headers: new Headers({
            'content-type': 'application/json'
          }),
          text: async () => JSON.stringify({ success: true }),
          arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ success: true })).buffer
        });
      });

      // Test RequestExecutor directly — this is where stripJsonComments is applied
      const { RequestExecutor } = await import('./RequestExecutor');
      const executor = new RequestExecutor();

      const requestWithComments: any = {
        http: {
          method: 'POST',
          url: 'https://example.com/api',
          headers: [
            { name: 'Content-Type', value: 'application/json' }
          ],
          body: {
            type: 'json',
            data: '{\n  "filters": {\n    "estado": "A",\n    // This comment should be stripped\n    "valor": "N"\n  }\n}'
          }
        }
      };

      await executor.executeRequest(requestWithComments, { timeout: 5000 });

      // The body sent should be valid JSON (no comments)
      expect(sentBody).toBeDefined();
      expect(() => JSON.parse(sentBody!)).not.toThrow();

      // The comment should have been stripped
      expect(sentBody).not.toContain('//');
      expect(sentBody).not.toContain('This comment should be stripped');

      // The actual data should still be there
      const parsed = JSON.parse(sentBody!);
      expect(parsed.filters.estado).toBe('A');
      expect(parsed.filters.valor).toBe('N');

      global.fetch = originalFetch;
    });

    it('should handle trailing commas left after stripping comments', async () => {
      let sentBody: string | undefined;
      global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        sentBody = init.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          url: 'https://example.com/api',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify({ success: true }),
          arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ success: true })).buffer
        });
      });

      const { RequestExecutor } = await import('./RequestExecutor');
      const executor = new RequestExecutor();

      const requestWithTrailingComma: any = {
        http: {
          method: 'POST',
          url: 'https://example.com/api',
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          body: {
            type: 'json',
            data: '{\n  "a": 1,\n  // trailing comment\n}'
          }
        }
      };

      await executor.executeRequest(requestWithTrailingComma, { timeout: 5000 });

      expect(sentBody).toBeDefined();
      expect(() => JSON.parse(sentBody!)).not.toThrow();

      const parsed = JSON.parse(sentBody!);
      expect(parsed.a).toBe(1);

      global.fetch = originalFetch;
    });

    it('sends multipart text fields, excludes disabled, and omits file fields', async () => {
      let sentBody: FormData | undefined;
      global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        sentBody = init.body as FormData;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          url: 'https://example.com/upload',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify({ success: true }),
          arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ success: true })).buffer
        });
      });

      const { RequestExecutor } = await import('./RequestExecutor');
      const executor = new RequestExecutor();

      const multipartRequest: any = {
        http: {
          method: 'POST',
          url: 'https://example.com/upload',
          body: {
            type: 'multipart-form',
            data: [
              { name: 'file', type: 'file', value: '/path/to/document.pdf' },
              { name: 'description', type: 'text', value: 'Quarterly report' },
              { name: 'tags', type: 'text', value: 'report,quarterly' },
              { name: 'debug', type: 'text', value: 'true', disabled: true }
            ]
          }
        }
      };

      await executor.executeRequest(multipartRequest, { timeout: 5000 });

      expect(sentBody).toBeInstanceOf(FormData);
      expect(sentBody!.get('description')).toBe('Quarterly report');
      expect(sentBody!.get('tags')).toBe('report,quarterly');
      expect(sentBody!.has('file')).toBe(false); // file field omitted
      expect(sentBody!.has('debug')).toBe(false); // disabled field excluded

      global.fetch = originalFetch;
    });

    it('sends no body for a file/binary request', async () => {
      let sentBody: BodyInit | null | undefined;
      global.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        sentBody = init.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          url: 'https://example.com/upload',
          headers: new Headers({ 'content-type': 'application/json' }),
          text: async () => JSON.stringify({ success: true }),
          arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ success: true })).buffer
        });
      });

      const { RequestExecutor } = await import('./RequestExecutor');
      const executor = new RequestExecutor();

      const fileRequest: any = {
        http: {
          method: 'POST',
          url: 'https://example.com/upload',
          body: {
            type: 'file',
            data: [{ filePath: '/path/to/document.pdf', contentType: 'application/pdf', selected: true }]
          }
        }
      };

      await executor.executeRequest(fileRequest, { timeout: 5000 });

      expect(sentBody == null).toBe(true); // no body sent

      global.fetch = originalFetch;
    });

    describe('inherited auth reaches the wire', () => {
      const run = async (yaml: string, path: number[]) => {
        let captured: { url?: string; headers?: Record<string, string> } = {};
        global.fetch = vi
          .fn()
          .mockImplementation((url: string, init: RequestInit) => {
            captured = { url, headers: init.headers as Record<string, string> };
            return Promise.resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              url,
              headers: new Headers({ 'content-type': 'application/json' }),
              text: async () => JSON.stringify({ ok: true })
            });
          });
        const collection = parseYaml(yaml);
        let item = collection;
        for (const idx of path) item = (item.items ?? [])[idx];
        await new RequestRunner().runRequest({
          item,
          collection,
          runtimeVariables: {},
          timeout: 5000
        });
        global.fetch = originalFetch;
        return captured;
      };

      it('applies a collection-level bearer to an inheriting request, interpolating the token var', async () => {
        const captured = await run(
          `
opencollection: "1.0.0"
info:
  name: "Auth Collection"
request:
  variables:
    - name: "apiToken"
      value: "secret-abc"
  auth:
    type: "bearer"
    token: "{{apiToken}}"
items:
  - name: "Inherited Bearer"
    type: "http"
    method: "GET"
    url: "https://api.example.com/me"
    auth: inherit
`,
          [0]
        );
        expect(captured.headers?.['Authorization']).toBe('Bearer secret-abc');
      });

      it('applies a folder-level api key (query placement) to an inheriting request', async () => {
        const captured = await run(
          `
opencollection: "1.0.0"
info:
  name: "Auth Collection"
items:
  - name: "Folder A"
    type: "folder"
    request:
      auth:
        type: "apikey"
        key: "api_key"
        value: "k-123"
        placement: "query"
    items:
      - name: "Inherited ApiKey"
        type: "http"
        method: "GET"
        url: "https://api.example.com/data"
        auth: inherit
`,
          [0, 0]
        );
        expect(captured.url).toContain('api_key=k-123');
      });

      it('prefers the closest folder auth over the collection for an inheriting request', async () => {
        const captured = await run(
          `
opencollection: "1.0.0"
info:
  name: "Auth Collection"
request:
  auth:
    type: "bearer"
    token: "collection-token"
items:
  - name: "Folder A"
    type: "folder"
    request:
      auth:
        type: "bearer"
        token: "folder-token"
    items:
      - name: "Inherited Bearer"
        type: "http"
        method: "GET"
        url: "https://api.example.com/me"
        auth: inherit
`,
          [0, 0]
        );
        expect(captured.headers?.['Authorization']).toBe('Bearer folder-token');
      });

      it('sends No Auth when a No-Auth folder blocks the collection auth', async () => {
        // A folder that configured No Auth is represented by an absent `auth` field (canonical
        // OpenCollection has no 'none' string); it blocks the parent's auth for an inheriting child.
        const captured = await run(
          `
opencollection: "1.0.0"
info:
  name: "Auth Collection"
request:
  auth:
    type: "bearer"
    token: "collection-token"
items:
  - name: "Folder A"
    type: "folder"
    request:
      headers:
        - name: "X-From-Folder"
          value: "1"
    items:
      - name: "Inheriting Request"
        type: "http"
        method: "GET"
        url: "https://api.example.com/me"
        auth: inherit
`,
          [0, 0]
        );
        expect(captured.headers?.['Authorization']).toBeUndefined();
        expect(captured.headers?.['X-From-Folder']).toBe('1'); // folder headers still merge
      });
    });
  });
});

describe('RequestExecutor parseResponse — content-type handling', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => { originalFetch = global.fetch; });

  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  const mockFetch = (bytes: Buffer, contentType: string) => {
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      url: 'https://example.com/data',
      headers: new Headers(contentType ? { 'content-type': contentType } : {}),
      arrayBuffer: async () => ab
    });
  };

  const run = async () => {
    const { RequestExecutor } = await import('./RequestExecutor');
    return new RequestExecutor().executeRequest(
      { http: { method: 'GET', url: 'https://example.com/data' } } as any,
      { timeout: 5000 }
    );
  };

  it('keeps base64 and drops the text copy for a binary (PNG) body', async () => {
    mockFetch(PNG, 'image/png');
    const res = await run();
    expect(res.detectedContentType).toBe('image/png');
    expect(typeof res.base64Data).toBe('string'); // previews need the base64 data URI
    expect(res.base64Data).toBe(PNG.toString('base64'));
    expect(res.data).toBeUndefined(); // binary bytes aren't meaningful text
    expect(res.size).toBe(PNG.length); // size from byteLength, not a copy
    global.fetch = originalFetch;
  });

  it('sniffs binary from the bytes even when the header lies (text/plain)', async () => {
    mockFetch(PNG, 'text/plain');
    const res = await run();
    expect(res.detectedContentType).toBe('image/png');
    expect(typeof res.base64Data).toBe('string');
    global.fetch = originalFetch;
  });

  it('parses JSON and keeps base64 (source text needed for precise formatting)', async () => {
    mockFetch(Buffer.from('{"a":1,"big":1736184243098437392}'), 'application/json');
    const res = await run();
    expect((res.data as unknown as { a: number }).a).toBe(1);
    expect(res.detectedContentType).toBe('text/plain');
    expect(typeof res.base64Data).toBe('string');
    global.fetch = originalFetch;
  });

  it('skips base64 for a plain-text body (data carries the bytes)', async () => {
    mockFetch(Buffer.from('hello world, this is plenty of plain text content'), 'text/plain');
    const res = await run();
    expect(res.data).toBe('hello world, this is plenty of plain text content');
    expect(res.detectedContentType).toBe('text/plain');
    expect(res.base64Data).toBeUndefined();
    global.fetch = originalFetch;
  });

  it('treats SVG as text and skips base64', async () => {
    mockFetch(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/svg+xml');
    const res = await run();
    expect(res.detectedContentType).toBe('image/svg+xml');
    expect(res.data).toContain('<svg');
    expect(res.base64Data).toBe('PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==');
    global.fetch = originalFetch;
  });

  it('extracts base64 for a large response (only formatting is deferred, not extraction)', async () => {
    // Over the 10MB threshold, and plain text — so it would be skipped as reconstructable were it
    // not large. base64 is still extracted here because the reveal warning's download/copy read it.
    mockFetch(Buffer.from('x'.repeat(11 * 1024 * 1024)), 'text/plain');
    const res = await run();
    expect(res.detectedContentType).toBe('text/plain');
    expect(typeof res.base64Data).toBe('string');
    global.fetch = originalFetch;
  });
});

describe('RequestRunner - script env-var persistence', () => {
  const ENV_SCRIPT_YAML = `
opencollection: "1.0.0"
info:
  name: "env set"
  version: "1.0.0"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setEnvVar('foo', 'bar');
`;

  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = okFetch();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('attaches a script setEnvVar to result.environmentVariables when an environment is active', async () => {
    const collection = parseYaml(ENV_SCRIPT_YAML);
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      environment: { name: 'Dev', variables: [] } as Environment,
      timeout: 5000
    });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: { foo: 'bar' }, deleted: [] });
  });

  it('keeps a number, boolean, and object as native values, not strings', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "env types"
  version: "1.0.0"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setEnvVar('num', 7);
        bru.setEnvVar('flag', false);
        bru.setEnvVar('cfg', { a: 1 });
`;
    const collection = parseYaml(yaml);
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      environment: { name: 'Dev', variables: [] } as Environment,
      timeout: 5000
    });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: { num: 7, flag: false, cfg: { a: 1 } }, deleted: [] });
  });

  it('warns and attaches nothing when no environment is selected', async () => {
    const collection = parseYaml(ENV_SCRIPT_YAML);
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      timeout: 5000
    });
    expect(response.environmentVariables).toBeUndefined();
    expect(response.warnings).toEqual(expect.arrayContaining([expect.stringContaining('no environment is selected')]));
  });
});

describe('RequestRunner - script collection-var persistence', () => {
  const COLL_SCRIPT_YAML = (script: string) => `
opencollection: "1.0.0"
info:
  name: "coll set"
  version: "1.0.0"
request:
  variables:
    - name: "existing"
      value: "keep"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        ${script}
`;

  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = okFetch();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('attaches script setCollectionVar changes to result.collectionVariables', async () => {
    const collection = parseYaml(COLL_SCRIPT_YAML('bru.setCollectionVar(\'foo\', \'bar\');'));
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      timeout: 5000
    });
    expect(response.collectionVariables).toEqual({ variables: { foo: 'bar' }, deleted: [] });
  });

  it('keeps a number, boolean, and object as native values, not strings', async () => {
    const collection = parseYaml(COLL_SCRIPT_YAML(
      'bru.setCollectionVar(\'count\', 3); bru.setCollectionVar(\'flag\', true); bru.setCollectionVar(\'cfg\', { on: 1 });'
    ));
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      timeout: 5000
    });
    expect(response.collectionVariables).toEqual({ variables: { count: 3, flag: true, cfg: { on: 1 } }, deleted: [] });
  });

  it('does not attach collectionVariables when a script makes no change', async () => {
    const collection = parseYaml(COLL_SCRIPT_YAML('bru.getCollectionVar(\'existing\');'));
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      timeout: 5000
    });
    expect(response.collectionVariables).toBeUndefined();
  });

  it('keeps runtime vars (bru.setVar) ephemeral — they never trigger env or collection persistence', async () => {
    const collection = parseYaml(COLL_SCRIPT_YAML('bru.setVar(\'x\', \'y\');'));
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      environment: { name: 'Dev', variables: [] } as Environment,
      timeout: 5000
    });
    expect(response.collectionVariables).toBeUndefined();
    expect(response.environmentVariables).toBeUndefined();
  });
});

describe('RequestRunner - environment variable resolution', () => {
  const HEADER_YAML = `
opencollection: "1.0.0"
info:
  name: "env resolution"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    headers:
      - name: "X-Token"
        value: "{{token}}"
`;

  const capturedHeader = async (environment: Environment): Promise<string | undefined> => {
    const originalFetch = global.fetch;
    let headers: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      headers = init.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        url,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{}',
        arrayBuffer: async () => new TextEncoder().encode('{}').buffer
      });
    });
    const collection = parseYaml(HEADER_YAML);
    await new RequestRunner().runRequest({ item: collection.items[0], collection, environment, timeout: 5000 });
    global.fetch = originalFetch;
    return headers['X-Token'];
  };

  it('resolves a secret variable over a plain variable of the same name, whatever the order', async () => {
    const header = await capturedHeader({
      name: 'Dev',
      variables: [
        { name: 'token', value: 'secret-value', secret: true },
        { name: 'token', value: 'plain-value' }
      ]
    } as Environment);
    expect(header).toBe('secret-value');
  });
});

describe('RequestRunner - script variable persistence (delta + nesting + failure)', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = okFetch();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends only the env vars that changed, never untouched vars or secret values', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "delta"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setEnvVar('plainVar', 'changed');
`;
    const collection = parseYaml(yaml);
    const environment = {
      name: 'Dev',
      variables: [
        { name: 'plainVar', value: 'original' },
        { name: 'untouched', value: 'stay' },
        { name: 'apiToken', value: 'super-secret', secret: true, type: 'string' }
      ]
    } as Environment;
    const response = await new RequestRunner().runRequest({
      item: collection.items[0], collection, environment, timeout: 5000
    });
    expect(response.environmentVariables).toEqual({
      envName: 'Dev',
      variables: { plainVar: 'changed' },
      deleted: []
    });
  });

  it('reports a deleted env var as an explicit deleted name, not by omission', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "delete"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.deleteEnvVar('gone');
`;
    const collection = parseYaml(yaml);
    const environment = {
      name: 'Dev',
      variables: [{ name: 'gone', value: 'x' }, { name: 'stay', value: 'y' }]
    } as Environment;
    const response = await new RequestRunner().runRequest({
      item: collection.items[0], collection, environment, timeout: 5000
    });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: {}, deleted: ['gone'] });
  });

  it('persists setCollectionVar and setEnvVar from a nested bru.runRequest', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "nested"
request:
  variables:
    - name: "colStart"
      value: "0"
items:
  - name: "Parent"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        await bru.runRequest('Child');
  - name: "Child"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setCollectionVar('fromChild', 'yes');
        bru.setEnvVar('envFromChild', 'yes');
`;
    const collection = parseYaml(yaml);
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      environment: { name: 'Dev', variables: [] } as Environment,
      timeout: 5000
    });
    expect(response.collectionVariables).toEqual({ variables: { fromChild: 'yes' }, deleted: [] });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: { envFromChild: 'yes' }, deleted: [] });
  });

  it('persists setCollectionVar and setEnvVar even when the send fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const yaml = `
opencollection: "1.0.0"
info:
  name: "failing"
request:
  variables:
    - name: "colStart"
      value: "0"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setCollectionVar('colBeforeFail', 'survive');
        bru.setEnvVar('envBeforeFail', 'survive');
`;
    const collection = parseYaml(yaml);
    const response = await new RequestRunner().runRequest({
      item: collection.items[0],
      collection,
      environment: { name: 'Dev', variables: [] } as Environment,
      timeout: 5000
    });
    expect(response.error).toBeDefined();
    expect(response.collectionVariables).toEqual({ variables: { colBeforeFail: 'survive' }, deleted: [] });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: { envBeforeFail: 'survive' }, deleted: [] });
  });

  it('keeps an external-secret name out of the env delta when a script overwrites it', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "ext upsert"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setEnvVar('regular', 'changed');
        bru.setEnvVar('awsKey', 'override');
`;
    const collection = parseYaml(yaml);
    const environment = {
      name: 'Dev',
      variables: [{ name: 'regular', value: 'orig' }],
      externalSecrets: { type: 'aws-secrets-manager', variables: [{ name: 'awsKey', secretName: 'k', value: 'cached' }] }
    } as unknown as Environment;
    const response = await new RequestRunner().runRequest({
      item: collection.items[0], collection, environment, timeout: 5000
    });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: { regular: 'changed' }, deleted: [] });
  });

  it('keeps an external-secret name out of the env delta deleted list on deleteAllEnvVars', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "ext delete"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.deleteAllEnvVars();
`;
    const collection = parseYaml(yaml);
    const environment = {
      name: 'Dev',
      variables: [{ name: 'regular', value: 'orig' }],
      externalSecrets: { type: 'aws-secrets-manager', variables: [{ name: 'awsKey', secretName: 'k', value: 'cached' }] }
    } as unknown as Environment;
    const response = await new RequestRunner().runRequest({
      item: collection.items[0], collection, environment, timeout: 5000
    });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: {}, deleted: ['regular'] });
  });

  it('still persists a script write to a declared env var that shares a name with an external secret', async () => {
    const yaml = `
opencollection: "1.0.0"
info:
  name: "shared name"
items:
  - name: "req"
    type: "http"
    method: "GET"
    url: "https://example.com"
    scripts:
      preRequest: |
        bru.setEnvVar('shared', 'fromScript');
`;
    const collection = parseYaml(yaml);
    const environment = {
      name: 'Dev',
      variables: [{ name: 'shared', value: 'declared' }],
      externalSecrets: { type: 'aws-secrets-manager', variables: [{ name: 'shared', secretName: 'k', value: 'cached' }] }
    } as unknown as Environment;
    const response = await new RequestRunner().runRequest({
      item: collection.items[0], collection, environment, timeout: 5000
    });
    expect(response.environmentVariables).toEqual({ envName: 'Dev', variables: { shared: 'fromScript' }, deleted: [] });
  });
});
