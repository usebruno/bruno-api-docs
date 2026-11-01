import type { OpenCollection } from '@opencollection/types';
import { findScriptFileByPath } from '@/runner/utils/tree-utils';

const NODE_BUILTIN_MODULES = [
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'events',
  'fs', 'http', 'http2', 'https', 'net', 'os', 'path', 'perf_hooks', 'process', 'querystring',
  'readline', 'stream', 'string_decoder', 'timers', 'tls', 'url', 'util', 'v8', 'vm',
  'worker_threads', 'zlib'
];

const DEVELOPER_MODE_LIBRARIES = [
  'lodash', 'cheerio', 'xml2js', 'node-fetch', 'yaml', 'json-query',
  'xml-formatter', 'chai-string', 'handlebars'
];

const UNSUPPORTED_LIBRARIES = ['jsonwebtoken'];

const getLocalRequireCode = () => `
  const { dirname, join, normalize } = globalThis.path;
  const localModules = {};
  const requireLocal = (modulePath, requested) => {
    if (!Object.prototype.hasOwnProperty.call(localModules, modulePath)) {
      const module = { exports: {} };
      localModules[modulePath] = module;
      const requireFromFile = (subModule) => (subModule?.startsWith?.('.')
        ? requireLocal(join(dirname(modulePath), subModule), subModule)
        : globalThis.require(subModule));
      try {
        new Function('module', 'exports', 'require', loadLocalModule(modulePath, requested))(module, module.exports, requireFromFile);
      } catch (error) {
        delete localModules[modulePath];
        throw error;
      }
    }
    return localModules[modulePath].exports;
  };
`;

const getRequireCode = () => `
  globalThis.require = (mod) => {
    const hasOwn = (name) => Object.prototype.hasOwnProperty.call(globalThis.requireObject, name);
    if (hasOwn(mod)) {
      return globalThis.requireObject[mod];
    }

    if (mod?.startsWith?.('.') || mod?.startsWith?.('/')) {
      return requireLocal(normalize(mod), mod);
    }

    const bareName = mod?.startsWith?.('node:') ? mod.slice(5) : mod;
    const nodeBuiltins = ${JSON.stringify(NODE_BUILTIN_MODULES)};
    if (nodeBuiltins.includes(bareName)) {
      if (hasOwn(bareName)) {
        return globalThis.requireObject[bareName];
      }
      if (bareName === 'crypto') {
        throw new Error(
          \`'\${mod}' cannot be required in the docs playground; use the crypto global instead (crypto.randomBytes, crypto.getRandomValues).\`
        );
      }
      throw new Error(
        \`'\${mod}' is a Node.js builtin and is not available in the docs playground; it requires the Bruno desktop app's developer mode.\`
      );
    }
    if (${JSON.stringify(DEVELOPER_MODE_LIBRARIES)}.includes(bareName)) {
      const available = Object.keys(globalThis.requireObject).sort().join(', ');
      throw new Error(
        \`'\${mod}' is only available in the Bruno desktop app's developer mode; the docs playground supports the safe-mode library set (\${available}).\`
      );
    }
    if (${JSON.stringify(UNSUPPORTED_LIBRARIES)}.includes(bareName)) {
      throw new Error(\`'\${mod}' is not currently supported in the docs playground. Please use the Bruno desktop app.\`);
    }
    throw new Error(\`Cannot find module \${mod}\`);
  }
`;

const createLocalModuleLoader = (vm: any, collection?: OpenCollection) =>
  vm.newFunction('loadLocalModule', (pathHandle: any, requestedHandle: any) => {
    const modulePath = vm.dump(pathHandle);
    const requested = vm.dump(requestedHandle);
    if (!collection) {
      throw new Error(
        `Local file require ('${requested}') is not available in the docs playground; `
        + 'only the built-in safe-mode libraries can be required here.'
      );
    }
    const result = findScriptFileByPath(collection, modulePath);
    if (!result.found) {
      throw new Error(result.reason === 'outside-collection'
        ? 'Access to files outside of the collectionPath is not allowed.'
        : `Cannot find module ${requested}`);
    }
    return vm.newString(result.code);
  });

export const addRequireShimToContext = (vm: any, collection?: OpenCollection) => {
  const install = vm.unwrapResult(vm.evalCode(`(loadLocalModule) => { ${getLocalRequireCode()} ${getRequireCode()} }`));
  const loader = createLocalModuleLoader(vm, collection);
  try {
    vm.unwrapResult(vm.callFunction(install, vm.undefined, loader)).dispose();
  } finally {
    loader.dispose();
    install.dispose();
  }
};
