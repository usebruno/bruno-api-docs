import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { marshallToVm } from '../utils';
import { createShimHelpers } from './helpers';
import type { CallableResponse, QueryArg, JsonValue } from '@/scripting/utils/bruno-response';
import { READ_ONLY_METHODS, READ_ONLY_MESSAGE } from '@/scripting/utils/header-list';

const addBrunoResponseShimToContext = (vm: QuickJSContext, res: CallableResponse) => {
  const {
    setValue, defineGetter, setMethod, setThrowingMethod, defineMethod, callVmCallback, entryCallback, reduceCallback
  } = createShimHelpers(vm);

  const toHostQueryArg = (arg: QuickJSHandle): QueryArg => {
    if (vm.typeof(arg) !== 'function') return vm.dump(arg) as QueryArg;
    return (item: JsonValue) => callVmCallback(arg, vm.undefined, [marshallToVm(item, vm)]);
  };

  const resFn = vm.newFunction('res', function (exprStr: QuickJSHandle, ...queryArgs: QuickJSHandle[]) {
    const nativeArgs = queryArgs.map((arg) => toHostQueryArg(arg));
    return marshallToVm(res(vm.dump(exprStr) as string, ...nativeArgs), vm);
  });

  setValue(resFn, 'status', res.status);
  setValue(resFn, 'statusText', res.statusText);
  setValue(resFn, 'headers', res.headers);
  defineGetter(resFn, 'body', () => res.getBody());
  setValue(resFn, 'responseTime', res.responseTime);
  setValue(resFn, 'url', res.url);

  setMethod(resFn, 'getStatus', () => res.getStatus());
  setMethod(resFn, 'getStatusText', () => res.getStatusText());
  setMethod(resFn, 'getHeader', (name) => res.getHeader(name as string));
  setMethod(resFn, 'getHeaders', () => res.getHeaders());
  setMethod(resFn, 'getBody', () => res.getBody());
  setMethod(resFn, 'getResponseTime', () => res.getResponseTime());
  setMethod(resFn, 'getUrl', () => res.getUrl());
  setMethod(resFn, 'setBody', (data) => res.setBody(data));
  setMethod(resFn, 'getSize', () => res.getSize());
  setMethod(resFn, 'getDataBuffer', () => res.getDataBuffer());

  if (res.headerList) {
    const hl = res.headerList;
    const headerListObj = vm.newObject();

    setMethod(headerListObj, 'get', (name) => hl.get(name as string));
    setMethod(headerListObj, 'one', (name) => hl.one(name as string));
    setMethod(headerListObj, 'all', () => hl.all());
    setMethod(headerListObj, 'count', () => hl.count());
    setMethod(headerListObj, 'has', (name, value) =>
      hl.has(name as Parameters<typeof hl.has>[0], value as string | undefined));
    setMethod(headerListObj, 'indexOf', (item) => hl.indexOf(item as Parameters<typeof hl.indexOf>[0]));
    setMethod(headerListObj, 'toObject', () => hl.toObject());
    setMethod(headerListObj, 'toString', () => hl.toString());
    setMethod(headerListObj, 'toJSON', () => hl.toJSON());

    defineMethod(headerListObj, 'each', (fn, ctx) => {
      hl.each(entryCallback<JsonValue>(fn, ctx));
      return vm.undefined;
    });
    defineMethod(headerListObj, 'filter', (fn, ctx) =>
      marshallToVm(hl.filter(entryCallback<boolean>(fn, ctx)), vm));
    defineMethod(headerListObj, 'find', (fn, ctx) =>
      marshallToVm(hl.find(entryCallback<boolean>(fn, ctx)), vm));
    defineMethod(headerListObj, 'map', (fn, ctx) =>
      marshallToVm(hl.map(entryCallback<JsonValue>(fn, ctx)), vm));
    defineMethod(headerListObj, 'reduce', (fn, ...rest) => {
      const ctx = rest.length > 1 ? rest[1] : undefined;
      const callback = reduceCallback(fn, ctx);
      const reduced = rest.length > 0 ? hl.reduce(callback, vm.dump(rest[0]) as JsonValue) : hl.reduce(callback);
      return marshallToVm(reduced, vm);
    });

    READ_ONLY_METHODS.forEach((name) => setThrowingMethod(headerListObj, name, READ_ONLY_MESSAGE));

    vm.setProp(resFn, 'headerList', headerListObj);
    headerListObj.dispose();
  }

  vm.setProp(vm.global, 'res', resFn);
  resFn.dispose();
};

export default addBrunoResponseShimToContext;
