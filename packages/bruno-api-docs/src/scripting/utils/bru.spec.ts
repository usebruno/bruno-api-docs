import { describe, it, expect, vi, afterEach } from 'vitest';
import Bru from './bru';

type BruVariables = ConstructorParameters<typeof Bru>[0]['variables'];

const makeBru = (variables: BruVariables = {}, warnings?: string[]) =>
  new Bru({ collectionPath: '/c', collectionName: 'C', variables, warnings });

const WARN = (api: string) => `${api} is not currently supported in the Bruno playground. Please use the Bruno desktop app.`;

describe('Bru (bru object)', () => {
  it('reads collection name and reports safe mode (playground runs QuickJS)', () => {
    const bru = makeBru();
    expect(bru.getCollectionName()).toBe('C');
    expect(bru.isSafeMode()).toBe(true);
  });

  describe('runtime variables', () => {
    it('supports set/get/has/delete/deleteAll/getAll', () => {
      const bru = makeBru();
      expect(bru.hasVar('x')).toBe(false);
      bru.setVar('x', 1);
      bru.setVar('y', 2);
      expect(bru.hasVar('x')).toBe(true);
      expect(bru.getVar('x')).toBe(1);
      expect(bru.getAllVars()).toEqual({ x: 1, y: 2 });
      bru.deleteVar('x');
      expect(bru.hasVar('x')).toBe(false);
      bru.deleteAllVars();
      expect(bru.getAllVars()).toEqual({});
    });

    it('rejects a nameless or invalid variable name (set and get)', () => {
      const bru = makeBru();
      expect(() => bru.setVar('', 1)).toThrow(/without specifying a name/);
      expect(() => bru.setVar('bad name', 1)).toThrow(/invalid characters/);
      expect(() => bru.getVar('bad name')).toThrow(/invalid characters/);
    });
  });

  describe('environment variables', () => {
    it('excludes __name__ from getAllEnvVars and preserves it through delete/deleteAll', () => {
      const bru = makeBru({ environmentVariables: { __name__: 'Local', token: 'abc' } });
      expect(bru.getEnvName()).toBe('Local');
      expect(bru.hasEnvVar('token')).toBe(true);
      expect(bru.getEnvVar('token')).toBe('abc');
      expect(bru.getAllEnvVars()).toEqual({ token: 'abc' });

      bru.deleteEnvVar('__name__');
      expect(bru.getEnvName()).toBe('Local');
      bru.deleteAllEnvVars();
      expect(bru.getEnvName()).toBe('Local');
      expect(bru.getAllEnvVars()).toEqual({});
    });

    it('sets, reads, interpolates, validates, and deletes environment variables', () => {
      const bru = makeBru({ environmentVariables: { __name__: 'Local', host: 'api.example.com' } });

      expect(bru.getEnvVar('host')).toBe('api.example.com');
      expect(bru.getEnvVar('missing')).toBeUndefined();
      bru.setEnvVar('url', 'https://{{host}}/v1');
      expect(bru.getEnvVar('url')).toBe('https://api.example.com/v1');

      bru.setEnvVar('count', 42);
      bru.setEnvVar('cfg', { a: 1 });
      expect(bru.getEnvVar('count')).toBe(42);
      expect(bru.getEnvVar('cfg')).toEqual({ a: 1 });
      expect(bru.hasEnvVar('count')).toBe(true);
      expect(bru.hasEnvVar('nope')).toBe(false);

      expect(() => bru.setEnvVar('', 1)).toThrow(/without specifying a name/);
      expect(() => bru.setEnvVar('bad name', 1)).toThrow(/invalid characters/);

      bru.deleteEnvVar('host');
      expect(bru.hasEnvVar('host')).toBe(false);
      expect(bru.getEnvName()).toBe('Local');
    });
  });

  describe('collection / folder / request / secret stores', () => {
    it('reads and mutates the right store for each scope', () => {
      const bru = makeBru({
        collectionVariables: { c: '1' },
        folderVariables: { f: '2' },
        requestVariables: { r: '3' },
        environmentVariables: { apiKey: 'sekret' }
      });

      expect(bru.getCollectionVar('c')).toBe('1');
      bru.setCollectionVar('c2', 'x');
      expect(bru.hasCollectionVar('c2')).toBe(true);
      expect(bru.getAllCollectionVars()).toEqual({ c: '1', c2: 'x' });
      bru.deleteCollectionVar('c');
      bru.deleteAllCollectionVars();
      expect(bru.getAllCollectionVars()).toEqual({});

      expect(bru.getFolderVar('f')).toBe('2');
      expect(bru.getRequestVar('r')).toBe('3');

      expect(bru.getSecretVar('apiKey')).toBe('sekret');
    });

    it('missing keys resolve to undefined, getAll returns a copy, and getVar validates while getCollectionVar does not', () => {
      const bru = makeBru({
        runtimeVariables: { r: 1 },
        collectionVariables: { c: '1' },
        environmentVariables: { token: 'sekret' }
      });

      // A missing key resolves to undefined for every getter
      expect(bru.getVar('missing')).toBeUndefined();
      expect(bru.getCollectionVar('missing')).toBeUndefined();
      expect(bru.getFolderVar('missing')).toBeUndefined();
      expect(bru.getRequestVar('missing')).toBeUndefined();
      expect(bru.getSecretVar('missing')).toBeUndefined();

      // getSecretVar resolves a secret by its plain name (external secrets merge in under their name)
      expect(bru.getSecretVar('token')).toBe('sekret');

      // getVar validates the key name (like the desktop app); getCollectionVar does not
      expect(() => bru.getVar('bad name')).toThrow(/invalid characters/);
      expect(bru.getCollectionVar('bad name')).toBeUndefined();

      // getAll* returns a copy — mutating it does not touch the store
      const all = bru.getAllVars();
      all.injected = 'x';
      expect(bru.hasVar('injected')).toBe(false);

      // number/object values round-trip through set/get
      bru.setVar('num', 42);
      bru.setVar('obj', { a: 1 });
      expect(bru.getVar('num')).toBe(42);
      expect(bru.getVar('obj')).toEqual({ a: 1 });
      bru.setCollectionVar('cnum', 7);
      expect(bru.getCollectionVar('cnum')).toBe(7);

      // deleting a missing key is a no-op
      bru.deleteVar('nope');
      bru.deleteCollectionVar('nope');
      expect(bru.getVar('r')).toBe(1);
      expect(bru.getCollectionVar('c')).toBe('1');
    });
  });

  describe('interpolate', () => {
    it('resolves {{var}} across scopes with runtime taking precedence', () => {
      const bru = makeBru({
        collectionVariables: { host: 'coll' },
        environmentVariables: { host: 'env' },
        runtimeVariables: { host: 'runtime', path: 'users' }
      });
      expect(bru.interpolate('https://{{host}}/{{path}}')).toBe('https://runtime/users');
    });

    it('resolves nested {{}} inside a variable value and returns non-strings unchanged', () => {
      const bru = makeBru({ runtimeVariables: { base: 'api.example.com', url: 'https://{{base}}/v1', n: 42 } });
      expect(bru.getVar('url')).toBe('https://api.example.com/v1');
      expect(bru.getVar('n')).toBe(42);
      expect(bru.interpolate({ where: '{{base}}' })).toEqual({ where: 'api.example.com' });
      // falsy and non-string inputs pass through unchanged
      expect(bru.interpolate('')).toBe('');
      expect(bru.interpolate(null)).toBe(null);
      expect(bru.interpolate(42)).toBe(42);
    });
  });

  describe('utils', () => {
    it('minifyJson handles strings and objects and throws on invalid input', () => {
      const bru = makeBru();
      expect(bru.utils.minifyJson('{ "a": 1 }')).toBe('{"a":1}');
      expect(bru.utils.minifyJson({ a: 1 })).toBe('{"a":1}');
      expect(bru.utils.minifyJson('')).toBe('');
      expect(() => bru.utils.minifyJson(null)).toThrow(/Failed to minify/);
      expect(() => bru.utils.minifyJson('{invalid')).toThrow(/Failed to minify/);
    });

    it('minifyXml collapses insignificant whitespace', () => {
      const bru = makeBru();
      expect(bru.utils.minifyXml('<a>\n  <b>1</b>\n</a>')).toBe('<a><b>1</b></a>');
    });
  });

  describe('sleep', () => {
    it('returns a promise that resolves for any non-negative delay, including 0', async () => {
      const bru = makeBru();
      await expect(bru.sleep(0)).resolves.toBeUndefined();
      await expect(bru.sleep(5)).resolves.toBeUndefined();
    });
  });

  describe('sendRequest (browser fetch)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('sends via fetch and returns { status, statusText, headers, data }', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{"ok":true}'
      });
      vi.stubGlobal('fetch', fetchMock);

      const bru = makeBru();
      const res = await bru.sendRequest({ url: 'https://api.example.com/x', method: 'POST', data: { a: 1 } });

      expect(res.status).toBe(201);
      expect(res.statusText).toBe('Created');
      expect(res.data).toEqual({ ok: true });
      expect(res.headers['content-type']).toBe('application/json');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.example.com/x');
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{"a":1}');
    });

    it('warns for httpsAgent and proxy options the browser cannot honor, but still sends the request', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{"ok":true}'
      });
      vi.stubGlobal('fetch', fetchMock);

      const warnings: string[] = [];
      await makeBru({}, warnings).sendRequest({
        url: 'https://api.example.com/x',
        method: 'GET',
        proxy: { host: '127.0.0.1', port: 8080 },
        httpsAgent: { ca: 'cert-pem' }
      });

      expect(warnings).toContain(WARN('bru.sendRequest httpsAgent option'));
      expect(warnings).toContain(WARN('bru.sendRequest proxy option'));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const clean: string[] = [];
      await makeBru({}, clean).sendRequest({ url: 'https://api.example.com/x', method: 'GET' });
      expect(clean).toHaveLength(0);
    });
  });

  describe('out-of-scope APIs collect a de-duplicated warning, never a silent no-op', () => {
    it('warns for cwd, visualize, oauth, setNextRequest, runner.*, and cookies.*', () => {
      const warnings: string[] = [];
      const bru = makeBru({}, warnings);

      expect(bru.cwd()).toBe('');
      bru.getProcessEnv();
      bru.visualize();
      bru.clearVisualizations();
      bru.getOauth2CredentialVar();
      bru.resetOauth2Credential();
      bru.setNextRequest();
      bru.runner.skipRequest();
      bru.runner.stopExecution();
      bru.runner.iterationData.get();
      bru.cookies.get();
      bru.cookies.jar();

      expect(warnings).toContain(WARN('bru.cwd'));
      expect(warnings).toContain(WARN('bru.getProcessEnv'));
      expect(warnings).toContain(WARN('bru.visualize'));
      expect(warnings).toContain(WARN('bru.getOauth2CredentialVar'));
      expect(warnings).toContain(WARN('bru.setNextRequest'));
      expect(warnings).toContain(WARN('bru.runner.skipRequest'));
      expect(warnings).toContain(WARN('bru.runner.iterationData.get'));
      expect(warnings).toContain(WARN('bru.cookies.get'));
      expect(warnings).toContain(WARN('bru.cookies.jar'));

      bru.visualize();
      expect(warnings.filter((w) => w.includes('bru.visualize'))).toHaveLength(1);
    });

    it('warns for every global environment variable method (unsupported in the playground)', () => {
      const warnings: string[] = [];
      const bru = makeBru({}, warnings);

      bru.getGlobalEnvVar();
      bru.setGlobalEnvVar();
      bru.hasGlobalEnvVar();
      bru.getAllGlobalEnvVars();
      bru.deleteGlobalEnvVar();
      bru.deleteAllGlobalEnvVars();

      for (const api of [
        'bru.getGlobalEnvVar', 'bru.setGlobalEnvVar', 'bru.hasGlobalEnvVar',
        'bru.getAllGlobalEnvVars', 'bru.deleteGlobalEnvVar', 'bru.deleteAllGlobalEnvVars'
      ]) {
        expect(warnings).toContain(WARN(api));
      }

      expect(bru.getAllGlobalEnvVars()).toEqual({});
      expect(bru.hasGlobalEnvVar()).toBe(false);
      expect(bru.getGlobalEnvVar()).toBeUndefined();
    });
  });

  describe('runRequest', () => {
    it('delegates to the injected callback and returns its result', async () => {
      const calls: string[] = [];
      const runRequest = async (path: string) => {
        calls.push(path);
        return { status: 200, statusText: 'OK', data: { ok: true } };
      };
      const bru = new Bru({ collectionPath: '/c', collectionName: 'C', variables: {}, runRequest });
      const res = await bru.runRequest('Auth/Login');
      expect(calls).toEqual(['Auth/Login']);
      expect(res).toEqual({ status: 200, statusText: 'OK', data: { ok: true } });
    });

    it('warns and resolves to an empty result when no runRequest callback is wired', async () => {
      const warnings: string[] = [];
      const bru = makeBru({}, warnings);
      const res = await bru.runRequest('x');
      expect(res).toEqual({});
      expect(warnings).toContain(WARN('bru.runRequest'));
    });
  });
});
