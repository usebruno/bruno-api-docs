import { marshallToVm } from '../utils';

const addBrunoResponseShimToContext = (vm: any, res: any) => {
  const setValue = (target: any, name: string, value: any) => {
    const handle = marshallToVm(value, vm);
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const setMethod = (target: any, name: string, fn: (...args: any[]) => any) => {
    const handle = vm.newFunction(name, (...args: any[]) =>
      marshallToVm(fn(...args.map((a: any) => vm.dump(a))), vm));
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const setThrowingMethod = (target: any, name: string, message: string) => {
    const handle = vm.newFunction(name, () => { throw vm.newError(message); });
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const toHostQueryArg = (arg: any) => {
    if (vm.typeof(arg) !== 'function') return vm.dump(arg);
    return (item: any) => {
      const itemHandle = marshallToVm(item, vm);
      const result = vm.callFunction(arg, vm.undefined, itemHandle);
      itemHandle.dispose();
      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw error;
      }
      const value = vm.dump(result.value);
      result.value.dispose();
      return value;
    };
  };

  const resFn = vm.newFunction('res', function (exprStr: any, ...queryArgs: any[]) {
    const nativeArgs = queryArgs.map((arg) => toHostQueryArg(arg));
    return marshallToVm(res(vm.dump(exprStr), ...nativeArgs), vm);
  });

  setValue(resFn, 'status', res?.status);
  setValue(resFn, 'statusText', res?.statusText);
  setValue(resFn, 'headers', res?.headers);
  setValue(resFn, 'body', res?.body);
  setValue(resFn, 'responseTime', res?.responseTime);
  setValue(resFn, 'url', res?.url);

  setMethod(resFn, 'getStatus', () => res.getStatus());
  setMethod(resFn, 'getStatusText', () => res.getStatusText());
  setMethod(resFn, 'getHeader', (name: string) => res.getHeader(name));
  setMethod(resFn, 'getHeaders', () => res.getHeaders());
  setMethod(resFn, 'getBody', () => res.getBody());
  setMethod(resFn, 'getResponseTime', () => res.getResponseTime());
  setMethod(resFn, 'getUrl', () => res.getUrl());
  setMethod(resFn, 'setBody', (data: any) => res.setBody(data));
  setMethod(resFn, 'getSize', () => res.getSize());
  setMethod(resFn, 'getDataBuffer', () => res.getDataBuffer());

  if (res?.headerList) {
    const hl = res.headerList;
    const headerListObj = vm.newObject();

    setMethod(headerListObj, 'get', (name: string) => hl.get(name));
    setMethod(headerListObj, 'one', (name: string) => hl.one(name));
    setMethod(headerListObj, 'all', () => hl.all());
    setMethod(headerListObj, 'count', () => hl.count());
    setMethod(headerListObj, 'has', (name: any, value?: string) => hl.has(name, value));
    setMethod(headerListObj, 'indexOf', (item: any) => hl.indexOf(item));
    setMethod(headerListObj, 'toObject', () => hl.toObject());
    setMethod(headerListObj, 'toString', () => hl.toString());
    setMethod(headerListObj, 'toJSON', () => hl.toJSON());

    const READ_ONLY = 'res.headerList is read-only; response headers cannot be modified';
    ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate']
      .forEach((name) => setThrowingMethod(headerListObj, name, READ_ONLY));

    vm.setProp(resFn, 'headerList', headerListObj);
    headerListObj.dispose();
  }

  vm.setProp(vm.global, 'res', resFn);
  resFn.dispose();

  if (res?.headerList) {
    const iteratorResult = vm.evalCode(`{
      const _hl = globalThis.res.headerList;
      const _all = _hl.all;
      _hl.each = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; _all().forEach(b); };
      _hl.filter = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; return _all().filter(b); };
      _hl.find = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; return _all().find(b); };
      _hl.map = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; return _all().map(b); };
      _hl.reduce = (fn, ...rest) => {
        const ctx = rest.length > 1 ? rest[1] : undefined;
        const b = ctx !== undefined ? fn.bind(ctx) : fn;
        return rest.length > 0 ? _all().reduce(b, rest[0]) : _all().reduce(b);
      };
    }`);
    if (iteratorResult.error) iteratorResult.error.dispose();
    else iteratorResult.value.dispose();
  }
};

export default addBrunoResponseShimToContext;
