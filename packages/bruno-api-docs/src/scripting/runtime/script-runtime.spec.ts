import { describe, it, expect } from 'vitest';
import ScriptRuntime from './script-runtime';

describe('ScriptRuntime', () => {
  it('should handle script execution', async () => {
    const runtime = new ScriptRuntime();

    const environmentVariables = {
      env_var: 'env_var_value'
    };

    const runtimeVariables = {
      runtime_var: 'runtime_var_value'
    };

    const mockRequest = {
      url: 'https://echo.usebruno.com',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      data: { message: 'success' }
    };

    const options = {
      script: `
        // check if the 'req' api works
        await test('req.getUrl()', () => {
          const url = req.getUrl();
          expect(url).to.eql('https://echo.usebruno.com');
        });

        // check if the 'res' api works
        await test('res.getStatus()', () => {
          const status = res.getStatus();
          expect(status).to.eql(200);
        });

        // check if the 'bru' api works
        // check if the 'runtime' variables get/set api works
        await test('bru.getVar', () => {
          const runtimeVar = bru.getVar('runtime_var');
          expect(runtimeVar).to.eql('runtime_var_value');
        });
        await test('bru.setVar', () => {
          bru.setVar('runtime_var', 'runtime_var_updated');
          const runtimeVar = bru.getVar('runtime_var');
          expect(runtimeVar).to.eql('runtime_var_updated');
        });

        // check if the 'env' variables get/set api works
        await test('bru.getEnvVar', () => {
          const envVar = bru.getEnvVar('env_var');
          expect(envVar).to.eql('env_var_value');
        });
        await test('bru.setEnvVar', () => {
          bru.setEnvVar('env_var', 'env_var_updated');
          const envVar = bru.getEnvVar('env_var');
          expect(envVar).to.eql('env_var_updated');
        });
        
        const testResults = await bru.getTestResults();
        bru.setVar('test_results', testResults);
      `,
      request: mockRequest,
      response: mockResponse,
      collectionName: 'test-collection',
      collectionPath: '/test/path',
      variables: {
        environmentVariables,
        runtimeVariables
      }
    };

    // This should not throw an error and will return the bru object
    const bru = await runtime.runScript(options);
    expect(bru).toBeDefined();

    expect(environmentVariables).to.eql({ env_var: 'env_var_updated' });
    expect(runtimeVariables).to.eql({
      runtime_var: 'runtime_var_updated',
      test_results: {
        summary: { total: 6, passed: 6, failed: 0, skipped: 0 },
        results: [
          { status: 'pass', description: 'req.getUrl()' },
          { status: 'pass', description: 'res.getStatus()' },
          { status: 'pass', description: 'bru.getVar' },
          { status: 'pass', description: 'bru.setVar' },
          { status: 'pass', description: 'bru.getEnvVar' },
          { status: 'pass', description: 'bru.setEnvVar' }
        ]
      }
    });
  });

  it('runs the full res API inside the QuickJS sandbox — headerList reads/iterators/read-only writes, case-insensitive getHeader, resolved responseTime and url, and res() query filters', async () => {
    const runtime = new ScriptRuntime();

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json', 'x-token': 'abc' },
      data: { users: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Lin' }] },
      duration: 42,
      url: 'https://api.example.com/users'
    };

    const script = `
      await test('res.getHeader() resolves header names case-insensitively', () => {
        expect(res.getHeader('Content-Type')).to.eql('application/json');
        expect(res.getHeader('X-TOKEN')).to.eql('abc');
      });
      await test('res.getResponseTime() and res.getUrl() resolve from the executor duration and url fields', () => {
        expect(res.getResponseTime()).to.eql(42);
        expect(res.getUrl()).to.eql('https://api.example.com/users');
      });
      await test('res.headerList reads (get, count, has, indexOf) resolve keys case-insensitively', () => {
        expect(res.headerList.get('Content-Type')).to.eql('application/json');
        expect(res.headerList.count()).to.eql(2);
        expect(res.headerList.has('x-token')).to.eql(true);
        expect(res.headerList.indexOf('X-Token')).to.be.at.least(0);
      });
      await test('res.headerList iterators (each, filter, find, map, reduce) run callbacks across the sandbox and bind thisArg', () => {
        const keys = [];
        res.headerList.each(function (h) { keys.push(h.key); });
        expect(keys).to.include('x-token');
        expect(res.headerList.filter(function (h) { return h.key === 'x-token'; })).to.have.lengthOf(1);
        const found = res.headerList.find(function (h) { return h.key === 'x-token'; });
        expect(found.value).to.eql('abc');
        const tagged = res.headerList.map(function (h) { return this.p + h.key; }, { p: '#' });
        expect(tagged).to.include('#x-token');
        const joined = res.headerList.reduce(function (acc, h) { return acc + h.key + ';'; }, '');
        expect(joined).to.match(/x-token;/);
      });
      await test('res.headerList write methods throw because response headers are read-only', () => {
        let threw = false;
        try { res.headerList.add({ key: 'x', value: 'y' }); } catch (e) { threw = true; }
        expect(threw).to.eql(true);
      });
      await test('res("path", fn) passes the filter function across the sandbox boundary and applies it to the body', () => {
        const s = JSON.stringify(res('users[?].name', function (u) { return u.id === 2; }));
        expect(s).to.match(/Lin/);
        expect(s).to.not.match(/Ada/);
      });
      await test('res.body reflects res.setBody mid-script and agrees with getBody (live getter, not a start-of-script snapshot)', () => {
        res.setBody({ replaced: true });
        expect(res.body.replaced).to.eql(true);
        expect(JSON.stringify(res.body)).to.eql(JSON.stringify(res.getBody()));
      });
    `;

    const bru = await runtime.runScript({
      script,
      response: mockResponse,
      collectionName: 'C',
      collectionPath: '/c',
      variables: {}
    });

    if (!bru.getTestResults) throw new Error('getTestResults was not attached to bru');
    const results = await bru.getTestResults();
    expect(results.summary.failed).toBe(0);
    expect(results.summary.total).toBe(7);
  });

  it('runs the full req API inside the QuickJS sandbox — reads the nested http shape, and setter/headerList writes reach the request object', async () => {
    const runtime = new ScriptRuntime();

    const mockRequest = {
      info: { name: 'Create User', tags: ['smoke'] },
      http: {
        method: 'POST',
        url: 'https://api.example.com/users/:id?active=true',
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Token', value: 'abc' }
        ],
        params: [{ name: 'id', value: '42', type: 'path' }],
        body: { type: 'json', data: '{"a":1}' },
        auth: { type: 'bearer', token: 'xyz' }
      },
      settings: { timeout: 5000 }
    };

    const script = `
      await test('req reads url/method/name/auth and derives host/path from the nested shape', () => {
        expect(req.getUrl()).to.eql('https://api.example.com/users/:id?active=true');
        expect(req.getMethod()).to.eql('POST');
        expect(req.getName()).to.eql('Create User');
        expect(req.getAuthMode()).to.eql('bearer');
        expect(req.getHost()).to.eql('api.example.com');
        expect(req.getPath()).to.eql('/users/42');
      });
      await test('req header reads and the writable headerList resolve headers', () => {
        expect(req.getHeader('X-Token')).to.eql('abc');
        expect(req.headerList.get('content-type')).to.eql('application/json');
        expect(req.headerList.count()).to.eql(2);
      });
      await test('req.getBody parses the JSON body; getPathParams and getTags read the request', () => {
        expect(JSON.stringify(req.getBody())).to.eql('{"a":1}');
        expect(req.getPathParams()[0].name).to.eql('id');
        expect(req.getTags()).to.include('smoke');
      });
      await test('req.headerList iterators run their callbacks across the sandbox', () => {
        expect(req.headerList.map(function (h) { return h.key; })).to.include('Content-Type');
        expect(req.headerList.find(function (h) { return h.key === 'X-Token'; }).value).to.eql('abc');
      });
      await test('setHeader / headerList.add / setBody / setUrl mutate the request', () => {
        req.setHeader('X-Script', 'yes');
        req.headerList.add('X-Added', '1');
        req.setBody({ updated: true });
        req.setUrl('https://api.example.com/v2');
        expect(req.getHeader('X-Script')).to.eql('yes');
        expect(req.headerList.has('x-added')).to.eql(true);
      });
      await test('req.headers reflects mid-script mutations and agrees with getHeaders (live getter, not a start-of-script snapshot)', () => {
        req.setHeader('X-Live', 'now');
        req.headerList.add('X-Also', 'too');
        expect(req.headers['X-Live']).to.eql('now');
        expect(req.headers['X-Also']).to.eql('too');
        expect(JSON.stringify(req.headers)).to.eql(JSON.stringify(req.getHeaders()));
      });
    `;

    const bru = await runtime.runScript({
      script,
      request: mockRequest,
      collectionName: 'C',
      collectionPath: '/c',
      variables: {}
    });

    if (!bru.getTestResults) throw new Error('getTestResults was not attached to bru');
    const results = await bru.getTestResults();
    expect(results.summary.failed).toBe(0);
    expect(results.summary.total).toBe(6);

    expect(mockRequest.http.url).toBe('https://api.example.com/v2');
    expect(mockRequest.http.body).toEqual({ type: 'json', data: '{"updated":true}' });
    expect(mockRequest.http.headers).toContainEqual({ name: 'X-Script', value: 'yes' });
    expect(mockRequest.http.headers).toContainEqual({ name: 'X-Added', value: '1' });
  });

  it('collects a warning (never a silent no-op) when a script calls an unsupported req method; call args are accepted and ignored', async () => {
    const runtime = new ScriptRuntime();
    const warnings: string[] = [];

    const script = `
      req.setMaxRedirects(5);
      req.onFail(function (err) { return err; });
      req.setMaxRedirects(10);
    `;

    await runtime.runScript({
      script,
      request: { http: { method: 'GET', url: 'https://api.example.com' } },
      collectionName: 'C',
      collectionPath: '/c',
      variables: {},
      warnings
    });

    expect(warnings).toEqual([
      'req.setMaxRedirects is not currently supported in the Bruno playground. Please use the Bruno desktop app.',
      'req.onFail is not currently supported in the Bruno playground. Please use the Bruno desktop app.'
    ]);
  });
});
