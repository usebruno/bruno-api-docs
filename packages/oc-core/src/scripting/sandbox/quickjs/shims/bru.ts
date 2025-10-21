import { cleanJson } from '../../../utils/common';
import { marshallToVm } from '../utils';

const addBruShimToContext = (vm: any, bru: any) => {
  const bruObject = vm.newObject();
  const bruRunnerObject = vm.newObject();

  const cwd = vm.newFunction('cwd', function () {
    return marshallToVm(bru.cwd(), vm);
  });
  vm.setProp(bruObject, 'cwd', cwd);
  cwd.dispose();

  const getEnvName = vm.newFunction('getEnvName', function () {
    return marshallToVm(bru.getEnvName(), vm);
  });
  vm.setProp(bruObject, 'getEnvName', getEnvName);
  getEnvName.dispose();

  const getCollectionName = vm.newFunction('getCollectionName', function () {
    return marshallToVm(bru.getCollectionName(), vm);
  });
  vm.setProp(bruObject, 'getCollectionName', getCollectionName);
  getCollectionName.dispose();

  const interpolate = vm.newFunction('interpolate', function (str: any) {
    return marshallToVm(bru.interpolate(vm.dump(str)), vm);
  });
  vm.setProp(bruObject, 'interpolate', interpolate);
  interpolate.dispose();

  const hasEnvVar = vm.newFunction('hasEnvVar', function (key: any) {
    return marshallToVm(bru.hasEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'hasEnvVar', hasEnvVar);
  hasEnvVar.dispose();

  const getEnvVar = vm.newFunction('getEnvVar', function (key: any) {
    return marshallToVm(bru.getEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getEnvVar', getEnvVar);
  getEnvVar.dispose();

  const setEnvVar = vm.newFunction('setEnvVar', function (key: any, value: any, options: any = {}) {
    bru.setEnvVar(vm.dump(key), vm.dump(value), vm.dump(options));
  });
  vm.setProp(bruObject, 'setEnvVar', setEnvVar);
  setEnvVar.dispose();

  const deleteEnvVar = vm.newFunction('deleteEnvVar', function (key: any) {
    bru.deleteEnvVar(vm.dump(key));
  });
  vm.setProp(bruObject, 'deleteEnvVar', deleteEnvVar);
  deleteEnvVar.dispose();

  const getGlobalEnvVar = vm.newFunction('getGlobalEnvVar', function (key: any) {
    return marshallToVm(bru.getGlobalEnvVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getGlobalEnvVar', getGlobalEnvVar);
  getGlobalEnvVar.dispose();

  const setGlobalEnvVar = vm.newFunction('setGlobalEnvVar', function (key: any, value: any) {
    bru.setGlobalEnvVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setGlobalEnvVar', setGlobalEnvVar);
  setGlobalEnvVar.dispose();

  const hasVar = vm.newFunction('hasVar', function (key: any) {
    return marshallToVm(bru.hasVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'hasVar', hasVar);
  hasVar.dispose();

  const getVar = vm.newFunction('getVar', function (key: any) {
    return marshallToVm(bru.getVar(vm.dump(key)), vm);
  });
  vm.setProp(bruObject, 'getVar', getVar);
  getVar.dispose();

  const setVar = vm.newFunction('setVar', function (key: any, value: any) {
    bru.setVar(vm.dump(key), vm.dump(value));
  });
  vm.setProp(bruObject, 'setVar', setVar);
  setVar.dispose();

  const deleteVar = vm.newFunction('deleteVar', function (key: any) {
    bru.deleteVar(vm.dump(key));
  });
  vm.setProp(bruObject, 'deleteVar', deleteVar);
  deleteVar.dispose();

  const deleteAllVars = vm.newFunction('deleteAllVars', function () {
    bru.deleteAllVars();
  });
  vm.setProp(bruObject, 'deleteAllVars', deleteAllVars);
  deleteAllVars.dispose();

  const getTestResults = vm.newFunction('getTestResults', () => {
    const promise = vm.newPromise();
    bru
      .getTestResults()
      .then((results: any) => {
        promise.resolve(marshallToVm(cleanJson(results), vm));
      })
      .catch((err: any) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  getTestResults.consume((handle: any) => vm.setProp(bruObject, 'getTestResults', handle));

  const getAssertionResults = vm.newFunction('getAssertionResults', () => {
    const promise = vm.newPromise();
    bru
      .getAssertionResults()
      .then((results: any) => {
        promise.resolve(marshallToVm(cleanJson(results), vm));
      })
      .catch((err: any) => {
        promise.resolve(
          marshallToVm(
            cleanJson({
              message: err.message
            }),
            vm
          )
        );
      });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  getAssertionResults.consume((handle: any) => vm.setProp(bruObject, 'getAssertionResults', handle));


  const sleep = vm.newFunction('sleep', (timer: any) => {
    const t = vm.getString(timer);
    const promise = vm.newPromise();
    setTimeout(() => {
      promise.resolve(vm.newString('slept'));
    }, t);
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sleep.consume((handle: any) => vm.setProp(bruObject, 'sleep', handle));

  vm.setProp(bruObject, 'runner', bruRunnerObject);
  vm.setProp(vm.global, 'bru', bruObject);
  bruObject.dispose();
  bruRunnerObject.dispose();
};

export default addBruShimToContext;
