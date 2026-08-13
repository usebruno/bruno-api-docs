import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';
import { marshallToVm } from '../utils';
import type { HeaderEntry } from '../../../utils/header-list';
import type { JsonValue } from '../../../utils/bruno-response';

export const createShimHelpers = (vm: QuickJSContext) => {
  const setValue = (target: QuickJSHandle, name: string, value: JsonValue) => {
    const handle: QuickJSHandle = marshallToVm(value, vm);
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const defineGetter = (target: QuickJSHandle, name: string, read: () => JsonValue) => {
    vm.defineProp(target, name, {
      enumerable: true,
      configurable: true,
      get: () => marshallToVm(read(), vm)
    });
  };

  const setMethod = <R>(target: QuickJSHandle, name: string, fn: (...args: JsonValue[]) => R) => {
    const handle = vm.newFunction(name, (...args: QuickJSHandle[]) =>
      marshallToVm(fn(...args.map((a) => vm.dump(a) as JsonValue)), vm));
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const setThrowingMethod = (target: QuickJSHandle, name: string, message: string) => {
    const handle = vm.newFunction(name, () => { throw vm.newError(message); });
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const defineMethod = (target: QuickJSHandle, name: string, handler: (...args: QuickJSHandle[]) => QuickJSHandle) => {
    const handle = vm.newFunction(name, handler);
    vm.setProp(target, name, handle);
    handle.dispose();
  };

  const callVmCallback = (fnHandle: QuickJSHandle, thisArg: QuickJSHandle, argHandles: QuickJSHandle[]): JsonValue => {
    const result = vm.callFunction(fnHandle, thisArg, ...argHandles);
    argHandles.forEach((handle) => handle.dispose());
    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw error;
    }
    const value = vm.dump(result.value) as JsonValue;
    result.value.dispose();
    return value;
  };

  const thisArgOf = (ctxHandle?: QuickJSHandle): QuickJSHandle =>
    ctxHandle !== undefined && vm.typeof(ctxHandle) !== 'undefined' ? ctxHandle : vm.undefined;

  const entryCallback = <R extends JsonValue>(fnHandle: QuickJSHandle, ctxHandle?: QuickJSHandle) =>
    (header: HeaderEntry, index: number): R =>
      callVmCallback(fnHandle, thisArgOf(ctxHandle), [marshallToVm(header, vm), marshallToVm(index, vm)]) as R;

  const reduceCallback = (fnHandle: QuickJSHandle, ctxHandle?: QuickJSHandle) =>
    (accumulator: JsonValue, header: HeaderEntry, index: number): JsonValue =>
      callVmCallback(fnHandle, thisArgOf(ctxHandle),
        [marshallToVm(accumulator, vm), marshallToVm(header, vm), marshallToVm(index, vm)]);

  return {
    setValue,
    defineGetter,
    setMethod,
    setThrowingMethod,
    defineMethod,
    callVmCallback,
    entryCallback,
    reduceCallback
  };
};
