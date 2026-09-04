import { describe, it, expect, beforeAll } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import addCryptoUtilsShimToContext from './shims/lib/crypto-utils';
import addAxiosShimToContext from './shims/lib/axios';
import { getRequireCode } from './shims/require';
import { getBundledCode } from './bundled-libraries.iife.js';

const SUPPORTED_MODULES = [
  'ajv', 'ajv-formats', 'atob', 'axios', 'btoa', 'buffer', 'chai', 'crypto-js',
  'moment', 'nanoid', 'path', 'tv4', 'uuid'
];

let vm: any;

const inVm = (expression: string) => {
  const result = vm.evalCode(expression);
  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw new Error(error.message);
  }
  const value = vm.dump(result.value);
  result.value.dispose();
  return value;
};

const errorMessageOf = (expression: string) =>
  inVm(`(() => { try { ${expression}; return 'NO-THROW'; } catch (e) { return e.message; } })()`);

describe('sandbox library parity with desktop safe mode', () => {
  beforeAll(async () => {
    const module = await newQuickJSWASMModule();
    vm = module.newContext();
    addCryptoUtilsShimToContext(vm);
    const boot = vm.evalCode(
      `(${getBundledCode.toString()})(); ${getRequireCode()}; `
      + `globalThis.console = { log() {}, debug() {}, info() {}, warn() {}, error() {} };`
    );
    expect(boot.error).toBeUndefined();
    boot.value.dispose();
    addAxiosShimToContext(vm);
  });

  it('exposes exactly the supported safe-mode modules', () => {
    expect(inVm('Object.keys(globalThis.requireObject).sort()')).toEqual(SUPPORTED_MODULES);
  });

  it('exposes the supported safe-mode globals', () => {
    const globals = ['expect', 'assert', 'moment', 'btoa', 'atob', 'Buffer', 'tv4', 'Ajv', 'addFormats', 'crypto', 'axios', 'path', 'require', 'uuid', 'nanoid'];
    for (const name of globals) {
      expect(inVm(`typeof globalThis['${name}']`), name).not.toBe('undefined');
    }
  });

  it('every module does real work inside the VM', () => {
    expect(inVm(`require('moment')('2026-08-20T10:00:00Z').utc().format('YYYY-MM-DD')`)).toBe('2026-08-20');
    expect(inVm(`require('crypto-js').SHA256('abc').toString()`)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(inVm(`require('uuid').validate(require('uuid').v4())`)).toBe(true);
    expect(inVm(`require('nanoid').nanoid(10).length`)).toBe(10);
    expect(inVm(`require('buffer').Buffer.from('hello').toString('base64')`)).toBe('aGVsbG8=');
    expect(inVm(`require('btoa')('hello')`)).toBe('aGVsbG8=');
    expect(inVm(`require('atob')('aGVsbG8=')`)).toBe('hello');
    expect(inVm(`require('tv4').validate({ a: 1 }, { type: 'object' })`)).toBe(true);
    expect(inVm(`new (require('ajv'))().compile({ type: 'number' })(5)`)).toBe(true);
    expect(inVm(`(() => { const Ajv = require('ajv'); const ajv = new Ajv(); require('ajv-formats')(ajv); return ajv.compile({ type: 'string', format: 'email' })('a@b.co'); })()`)).toBe(true);
    expect(inVm(`require('path').resolve('/a/b', '../c')`)).toBe('/a/c');
    expect(inVm(`(() => { const { expect } = require('chai'); expect(1).to.eql(1); return 'ok'; })()`)).toBe('ok');
    expect(inVm(`typeof require('axios').get`)).toBe('function');
  });

  it('resolves relative-only path arguments from the root, since the sandbox has no working directory', () => {
    expect(inVm(`require('path').resolve('a', 'b')`)).toBe('/a/b');
    expect(inVm(`require('path').resolve()`)).toBe('/');
    expect(inVm(`require('path').relative('a/b', 'a/c')`)).toBe('../c');
    expect(inVm(`globalThis.path.resolve('x')`)).toBe('/x');
    expect(inVm(`typeof globalThis.process`)).toBe('undefined');
  });

  it('gives explanatory errors for developer-mode-only and node builtin modules', () => {
    expect(errorMessageOf(`require('lodash')`)).toContain('only available in the Bruno desktop app\'s developer mode');
    expect(errorMessageOf(`require('fs')`)).toContain('is a Node.js builtin');
    expect(errorMessageOf(`require('node:fs')`)).toContain('is a Node.js builtin');
    expect(errorMessageOf(`require('./helper.js')`)).toContain('Local file require');
    expect(errorMessageOf(`require('./helper.js')`)).toContain('is not available in the docs playground');
    expect(inVm(`typeof require('node:buffer').Buffer`)).toBe('function');
    expect(inVm(`typeof require('node:path').resolve`)).toBe('function');
    expect(errorMessageOf(`require('node:chai')`)).toContain('Cannot find module node:chai');
    expect(errorMessageOf(`require('left-pad-9000')`)).toBe('Cannot find module left-pad-9000');
    expect(errorMessageOf(`require('jsonwebtoken')`)).toBe('\'jsonwebtoken\' is not currently supported in the docs playground. Please use the Bruno desktop app.');
    expect(errorMessageOf(`require('crypto')`)).toContain('use the crypto global instead');
    expect(errorMessageOf(`require('constructor')`)).toBe('Cannot find module constructor');
    expect(errorMessageOf(`require('__proto__')`)).toBe('Cannot find module __proto__');
    expect(errorMessageOf(`require('toString')`)).toBe('Cannot find module toString');
  });

  it('generates randomness for supported typed arrays and rejects unsupported ones', () => {
    expect(inVm(`crypto.getRandomValues(new Uint8Array(4)).length`)).toBe(4);
    expect(inVm(`crypto.getRandomValues(new Uint32Array(2)).length`)).toBe(2);
    expect(inVm(`crypto.randomBytes(8).length`)).toBe(8);
    expect(errorMessageOf(`crypto.getRandomValues(new BigInt64Array(2))`)).toBe('getRandomValues: unsupported typed array type: BigInt64Array');
    expect(errorMessageOf(`crypto.getRandomValues(new Float32Array(2))`)).toBe('getRandomValues: unsupported typed array type: Float32Array');
  });
});
