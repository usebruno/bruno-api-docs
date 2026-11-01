import addBruShimToContext from './shims/bru';
import addBrunoRequestShimToContext from './shims/bruno-request';
import addConsoleShimToContext from './shims/console';
import addBrunoResponseShimToContext from './shims/bruno-response';
import addTestShimToContext from './shims/test';
import addCryptoUtilsShimToContext from './shims/lib/crypto-utils';
import addAxiosShimToContext from './shims/lib/axios';
import { newQuickJSWASMModule, memoizePromiseFactory } from 'quickjs-emscripten';
import { marshallToVm } from './utils';
import { getBundledCode } from './bundled-libraries.iife.js';
import { addRequireShimToContext } from './shims/require';
import type { OpenCollection } from '@opencollection/types';

let QuickJSSyncContext: any;
const loader = memoizePromiseFactory(() => newQuickJSWASMModule());
const getContext = (opts?: any) => loader().then((mod) => (QuickJSSyncContext = mod.newContext(opts)));
getContext();

const toNumber = (value: string) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const removeQuotes = (str: string) => {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith('\'') && str.endsWith('\''))) {
    return str.slice(1, -1);
  }
  return str;
};

const executeQuickJsVm = ({ script: externalScript, context: externalContext, scriptType = 'template-literal' }: { script: any; context: any; scriptType?: string }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  if (scriptType === 'template-literal') {
    if (!isNaN(Number(externalScript))) {
      const number = Number(externalScript);

      // Check if the number is too high. Too high number might get altered, see #1000
      if (number > Number.MAX_SAFE_INTEGER) {
        return externalScript;
      }

      return toNumber(externalScript);
    }

    if (externalScript === 'true') return true;
    if (externalScript === 'false') return false;
    if (externalScript === 'null') return null;
    if (externalScript === 'undefined') return undefined;

    externalScript = removeQuotes(externalScript);
  }

  const vm = QuickJSSyncContext;

  try {
    const { bru, req, res, ...variables } = externalContext;

    if (bru) addBruShimToContext(vm, bru);
    if (req) addBrunoRequestShimToContext(vm, req);
    if (res) addBrunoResponseShimToContext(vm, res);

    Object.entries(variables)?.forEach(([key, value]) => {
      vm.setProp(vm.global, key, marshallToVm(value, vm));
    });

    const templateLiteralText = `\`${externalScript}\``;
    const jsExpressionText = `${externalScript}`;

    const scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

    const result = vm.evalCode(scriptText);
    if (result.error) {
      const e = vm.dump(result.error);
      result.error.dispose();
      return e;
    } else {
      const v = vm.dump(result.value);
      result.value.dispose();
      return v;
    }
  } catch (error) {
    console.error('Error executing the script!', error);
    return error instanceof Error ? error.message : String(error);
  }
};

const executeQuickJsVmAsync = async ({
  script: externalScript,
  context: externalContext,
  collectionPath: _collectionPath,
  collection
}: { script: any; context: any; collectionPath: any; collection?: OpenCollection }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  try {
    const module = await loader();
    const vm = module.newContext();

    // must run before the bundle eval: uuid and nanoid grab crypto.getRandomValues at load time
    addCryptoUtilsShimToContext(vm);

    if (typeof getBundledCode !== 'function') {
      throw new Error('Sandbox library bundle is missing; run build:lib-bundle before executing scripts.');
    }
    const bundledCode = getBundledCode.toString();

    const bootResult = vm.evalCode(
      `
        (${bundledCode})();
      `
    );
    if (bootResult.error) {
      const bootError = vm.dump(bootResult.error);
      bootResult.error.dispose();
      throw new Error(`Failed to load sandbox libraries: ${bootError?.message || String(bootError)}`);
    }
    bootResult.value.dispose();
    addRequireShimToContext(vm, collection);

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    if (consoleFn) addConsoleShimToContext(vm, consoleFn);
    if (bru) addBruShimToContext(vm, bru);
    if (req) addBrunoRequestShimToContext(vm, req);
    if (res) addBrunoResponseShimToContext(vm, res);
    if (test && __brunoTestResults) addTestShimToContext(vm, __brunoTestResults);

    addAxiosShimToContext(vm);

    const script = `
      (async () => {
        const setTimeout = async(fn, timer) => {
          v = await bru.sleep(timer);
          fn.apply();
        }
        await bru.sleep(0);
        try {
          ${externalScript}
        }
        catch(error) {
          console?.debug?.('quick-js:execution-end:with-error', error?.message);
          throw new Error(error?.message);
        }
        return 'done';
      })()
    `;

    const result = vm.evalCode(script);
    const promiseHandle = vm.unwrapResult(result);
    const resolvedResult = await vm.resolvePromise(promiseHandle);
    promiseHandle.dispose();
    const resolvedHandle = vm.unwrapResult(resolvedResult);
    resolvedHandle.dispose();
    // vm.dispose();
    return;
  } catch (error) {
    console.error('Error executing the script!', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

export { executeQuickJsVm, executeQuickJsVmAsync };
