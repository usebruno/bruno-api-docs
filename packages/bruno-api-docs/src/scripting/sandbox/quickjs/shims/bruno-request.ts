import type { QuickJSContext } from 'quickjs-emscripten';
import { marshallToVm } from '../utils';
import { createShimHelpers } from './helpers';
import type { HeaderEntry } from '@/scripting/utils/header-list';
import type BrunoRequest from '@/scripting/utils/bruno-request';

const addBrunoRequestShimToContext = (vm: QuickJSContext, req: BrunoRequest) => {
  const { setValue, defineGetter, setMethod, defineMethod, entryCallback, reduceCallback } = createShimHelpers(vm);

  const reqObject = vm.newObject();

  setValue(reqObject, 'url', req.getUrl());
  setValue(reqObject, 'method', req.getMethod());
  defineGetter(reqObject, 'headers', () => req.getHeaders());
  const bodyHandle = marshallToVm(req.getBody() ?? null, vm);
  vm.setProp(reqObject, 'body', bodyHandle);
  bodyHandle.dispose();
  setValue(reqObject, 'timeout', req.getTimeout() ?? null);
  setValue(reqObject, 'name', req.getName() ?? null);
  setValue(reqObject, 'pathParams', req.getPathParams());
  setValue(reqObject, 'tags', req.getTags());

  setMethod(reqObject, 'getUrl', () => req.getUrl());
  setMethod(reqObject, 'setUrl', (url) => req.setUrl(url as string));
  setMethod(reqObject, 'getHost', () => req.getHost());
  setMethod(reqObject, 'getPath', () => req.getPath());
  setMethod(reqObject, 'getQueryString', () => req.getQueryString());
  setMethod(reqObject, 'getMethod', () => req.getMethod());
  setMethod(reqObject, 'setMethod', (method) => req.setMethod(method as string));
  setMethod(reqObject, 'getAuthMode', () => req.getAuthMode());
  setMethod(reqObject, 'getName', () => req.getName());
  setMethod(reqObject, 'getPathParams', () => req.getPathParams());
  setMethod(reqObject, 'getTags', () => req.getTags());

  setMethod(reqObject, 'getHeaders', () => req.getHeaders());
  setMethod(reqObject, 'setHeaders', (headers) => req.setHeaders(headers as Record<string, string>));
  setMethod(reqObject, 'getHeader', (name) => req.getHeader(name as string));
  setMethod(reqObject, 'setHeader', (name, value) => req.setHeader(name as string, value as string));
  setMethod(reqObject, 'deleteHeader', (name) => req.deleteHeader(name as string));
  setMethod(reqObject, 'deleteHeaders', (names) => req.deleteHeaders(names as string[]));

  setMethod(reqObject, 'getBody', (options) => req.getBody(options as { raw?: boolean }));
  setMethod(reqObject, 'setBody', (data, options) => req.setBody(data, options as { raw?: boolean }));

  setMethod(reqObject, 'setMaxRedirects', () => req.setMaxRedirects());
  defineMethod(reqObject, 'onFail', () => {
    req.onFail();
    return vm.undefined;
  });
  setMethod(reqObject, 'getTimeout', () => req.getTimeout());
  setMethod(reqObject, 'setTimeout', (timeout) => req.setTimeout(timeout as number));
  setMethod(reqObject, 'disableParsingResponseJson', () => req.disableParsingResponseJson());
  setMethod(reqObject, 'getExecutionMode', () => req.getExecutionMode());

  const hl = req.headerList;
  const headerListObj = vm.newObject();

  setMethod(headerListObj, 'get', (name) => hl.get(name as string));
  setMethod(headerListObj, 'one', (name) => hl.one(name as string));
  setMethod(headerListObj, 'all', () => hl.all());
  setMethod(headerListObj, 'count', () => hl.count());
  setMethod(headerListObj, 'has', (name, value) =>
    hl.has(name as Parameters<typeof hl.has>[0], value as string | undefined));
  setMethod(headerListObj, 'indexOf', (item) => hl.indexOf(item as Parameters<typeof hl.indexOf>[0]));
  setMethod(headerListObj, 'toObject', (excludeDisabled, caseSensitive, multiValue, sanitizeKeys) =>
    hl.toObject(
      excludeDisabled as boolean | undefined,
      caseSensitive as boolean | undefined,
      multiValue as boolean | undefined,
      sanitizeKeys as boolean | undefined
    ));
  setMethod(headerListObj, 'toString', () => hl.toString());
  setMethod(headerListObj, 'toJSON', () => hl.toJSON());

  setMethod(headerListObj, 'add', (item, value) =>
    hl.add(item as Parameters<typeof hl.add>[0], value as string | undefined));
  setMethod(headerListObj, 'upsert', (item, value) =>
    hl.upsert(item as Parameters<typeof hl.upsert>[0], value as string | undefined));
  setMethod(headerListObj, 'clear', () => hl.clear());
  setMethod(headerListObj, 'populate', (items) => hl.populate(items as Parameters<typeof hl.populate>[0]));
  setMethod(headerListObj, 'repopulate', (items) => hl.repopulate(items as Parameters<typeof hl.repopulate>[0]));
  defineMethod(headerListObj, 'assimilate', (source, prune) => {
    hl.assimilate(vm.dump(source) as HeaderEntry[], vm.dump(prune) as boolean | undefined);
    return vm.undefined;
  });

  defineMethod(headerListObj, 'each', (fn, ctx) => {
    hl.each(entryCallback<boolean>(fn, ctx));
    return vm.undefined;
  });
  defineMethod(headerListObj, 'filter', (fn, ctx) =>
    marshallToVm(hl.filter(entryCallback<boolean>(fn, ctx)), vm));
  defineMethod(headerListObj, 'find', (fn, ctx) =>
    marshallToVm(hl.find(entryCallback<boolean>(fn, ctx)), vm));
  defineMethod(headerListObj, 'map', (fn, ctx) =>
    marshallToVm(hl.map(entryCallback(fn, ctx)), vm));
  defineMethod(headerListObj, 'reduce', (fn, ...rest) => {
    const ctx = rest.length > 1 ? rest[1] : undefined;
    const callback = reduceCallback(fn, ctx);
    const reduced = rest.length > 0 ? hl.reduce(callback, vm.dump(rest[0])) : hl.reduce(callback);
    return marshallToVm(reduced, vm);
  });
  defineMethod(headerListObj, 'remove', (predicate, ctx) => {
    if (vm.typeof(predicate) === 'function') {
      hl.remove(entryCallback<boolean>(predicate, ctx));
    } else {
      hl.remove(vm.dump(predicate) as Parameters<typeof hl.remove>[0]);
    }
    return vm.undefined;
  });

  vm.setProp(reqObject, 'headerList', headerListObj);
  headerListObj.dispose();

  vm.setProp(vm.global, 'req', reqObject);
  reqObject.dispose();
};

export default addBrunoRequestShimToContext;
