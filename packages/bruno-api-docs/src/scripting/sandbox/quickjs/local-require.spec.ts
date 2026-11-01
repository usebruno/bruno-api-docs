import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { newQuickJSWASMModule } from 'quickjs-emscripten';
import type { OpenCollection } from '@opencollection/types';
import addCryptoUtilsShimToContext from './shims/lib/crypto-utils';
import { addRequireShimToContext } from './shims/require';
import { getBundledCode } from './bundled-libraries.iife.js';

const script = (name: string, code: string) => ({ info: { type: 'script', name }, script: code });
const folder = (name: string, items: unknown[]) => ({ info: { type: 'folder', name }, items });

const collection = {
  items: [
    folder('billing', [
      script('Script', 'const { tax } = require(\'./rates.js\'); module.exports = { total: (n) => n + tax(n) };'),
      script('rates', 'module.exports = { tax: (n) => n / 10 };')
    ]),
    script('counter', 'globalThis.loads = (globalThis.loads || 0) + 1; module.exports = globalThis.loads;'),
    script('dates', 'module.exports = require(\'moment\')(\'2026-01-02T00:00:00Z\').utc().format(\'YYYY\');')
  ]
} as unknown as OpenCollection;

let quickjs: Awaited<ReturnType<typeof newQuickJSWASMModule>>;
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

describe('require() of a .js file from the collection', () => {
  beforeAll(async () => {
    quickjs = await newQuickJSWASMModule();
  });

  beforeEach(() => {
    vm = quickjs.newContext();
    addCryptoUtilsShimToContext(vm);
    const boot = vm.evalCode(`(${getBundledCode.toString()})();`);
    expect(boot.error).toBeUndefined();
    boot.value.dispose();
    addRequireShimToContext(vm, collection);
  });

  afterEach(() => {
    vm.dispose();
  });

  it('runs the file and returns its exports, including a file it requires from its own folder', () => {
    expect(inVm('require(\'./billing/Script.js\').total(100)')).toBe(110);
    expect(inVm('require(\'/billing/Script.js\').total(100)')).toBe(110);
  });

  it('runs a file once per script', () => {
    expect(inVm('[require(\'./counter.js\'), require(\'./billing/../counter.js\')]')).toEqual([1, 1]);
  });

  it('lets a file require the safe-mode libraries', () => {
    expect(inVm('require(\'./dates.js\')')).toBe('2026');
    expect(inVm('typeof require(\'moment\')')).toBe('function');
  });

  it('reports a missing file and a path outside the collection with the desktop app\'s errors', () => {
    expect(errorMessageOf('require(\'./billing/Nope.js\')')).toBe('Cannot find module ./billing/Nope.js');
    expect(errorMessageOf('require(\'../outside.js\')'))
      .toBe('Access to files outside of the collectionPath is not allowed.');
  });

  it('does not expose the file loader to scripts', () => {
    expect(inVm('typeof globalThis.loadLocalModule')).toBe('undefined');
  });
});
