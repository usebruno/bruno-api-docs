import type { QuickJSContext } from 'quickjs-emscripten';
import { cleanJson } from '@/scripting/utils/common';
import { marshallToVm } from '@/scripting/sandbox/quickjs/utils';
import { createShimHelpers } from './helpers';
import type Bru from '@/scripting/utils/bru';

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const addBruShimToContext = (vm: QuickJSContext, bru: Bru) => {
  const { setMethod } = createShimHelpers(vm);
  const bruObject = vm.newObject();

  setMethod(bruObject, 'cwd', () => bru.cwd());
  setMethod(bruObject, 'getEnvName', () => bru.getEnvName());
  setMethod(bruObject, 'getCollectionName', () => bru.getCollectionName());
  setMethod(bruObject, 'interpolate', (str) => bru.interpolate(str));
  setMethod(bruObject, 'isSafeMode', () => bru.isSafeMode());
  setMethod(bruObject, 'getProcessEnv', () => bru.getProcessEnv());

  setMethod(bruObject, 'hasEnvVar', (key) => bru.hasEnvVar(key as string));
  setMethod(bruObject, 'getEnvVar', (key) => bru.getEnvVar(key as string));
  setMethod(bruObject, 'setEnvVar', (key, value) => bru.setEnvVar(key as string, value));
  setMethod(bruObject, 'deleteEnvVar', (key) => bru.deleteEnvVar(key as string));
  setMethod(bruObject, 'getAllEnvVars', () => bru.getAllEnvVars());
  setMethod(bruObject, 'deleteAllEnvVars', () => bru.deleteAllEnvVars());

  setMethod(bruObject, 'hasGlobalEnvVar', () => bru.hasGlobalEnvVar());
  setMethod(bruObject, 'getGlobalEnvVar', () => bru.getGlobalEnvVar());
  setMethod(bruObject, 'setGlobalEnvVar', () => bru.setGlobalEnvVar());
  setMethod(bruObject, 'deleteGlobalEnvVar', () => bru.deleteGlobalEnvVar());
  setMethod(bruObject, 'getAllGlobalEnvVars', () => bru.getAllGlobalEnvVars());
  setMethod(bruObject, 'deleteAllGlobalEnvVars', () => bru.deleteAllGlobalEnvVars());

  setMethod(bruObject, 'hasVar', (key) => bru.hasVar(key as string));
  setMethod(bruObject, 'getVar', (key) => bru.getVar(key as string));
  setMethod(bruObject, 'setVar', (key, value) => bru.setVar(key as string, value));
  setMethod(bruObject, 'deleteVar', (key) => bru.deleteVar(key as string));
  setMethod(bruObject, 'deleteAllVars', () => bru.deleteAllVars());
  setMethod(bruObject, 'getAllVars', () => bru.getAllVars());

  setMethod(bruObject, 'getCollectionVar', (key) => bru.getCollectionVar(key as string));
  setMethod(bruObject, 'setCollectionVar', (key, value) => bru.setCollectionVar(key as string, value));
  setMethod(bruObject, 'hasCollectionVar', (key) => bru.hasCollectionVar(key as string));
  setMethod(bruObject, 'deleteCollectionVar', (key) => bru.deleteCollectionVar(key as string));
  setMethod(bruObject, 'deleteAllCollectionVars', () => bru.deleteAllCollectionVars());
  setMethod(bruObject, 'getAllCollectionVars', () => bru.getAllCollectionVars());

  setMethod(bruObject, 'getFolderVar', (key) => bru.getFolderVar(key as string));
  setMethod(bruObject, 'getRequestVar', (key) => bru.getRequestVar(key as string));
  setMethod(bruObject, 'getSecretVar', (key) => bru.getSecretVar(key as string));

  setMethod(bruObject, 'visualize', () => bru.visualize());
  setMethod(bruObject, 'clearVisualizations', () => bru.clearVisualizations());
  setMethod(bruObject, 'getOauth2CredentialVar', () => bru.getOauth2CredentialVar());
  setMethod(bruObject, 'resetOauth2Credential', () => bru.resetOauth2Credential());
  setMethod(bruObject, 'setNextRequest', () => bru.setNextRequest());

  const utilsObj = vm.newObject();
  setMethod(utilsObj, 'minifyJson', (json) => bru.utils.minifyJson(json));
  setMethod(utilsObj, 'minifyXml', (xml) => bru.utils.minifyXml(xml));
  vm.setProp(bruObject, 'utils', utilsObj);
  utilsObj.dispose();

  const runnerObj = vm.newObject();
  setMethod(runnerObj, 'setNextRequest', () => bru.runner.setNextRequest());
  setMethod(runnerObj, 'skipRequest', () => bru.runner.skipRequest());
  setMethod(runnerObj, 'stopExecution', () => bru.runner.stopExecution());

  const buildIterationData = () => {
    const obj = vm.newObject();
    for (const name of Object.keys(bru.runner.iterationData)) {
      setMethod(obj, name, () => bru.runner.iterationData[name]());
    }
    return obj;
  };

  vm.defineProp(runnerObj, 'iterationData', {
    enumerable: true,
    get: () => {
      bru.warnUnsupported('bru.runner.iterationData');
      return buildIterationData();
    }
  });
  vm.defineProp(runnerObj, 'iterationIndex', {
    enumerable: true,
    get: () => {
      bru.warnUnsupported('bru.runner.iterationIndex');
      return vm.undefined;
    }
  });
  vm.defineProp(runnerObj, 'totalIterations', {
    enumerable: true,
    get: () => {
      bru.warnUnsupported('bru.runner.totalIterations');
      return vm.undefined;
    }
  });

  vm.setProp(bruObject, 'runner', runnerObj);
  runnerObj.dispose();

  const cookiesObj = vm.newObject();
  for (const name of Object.keys(bru.cookies)) {
    setMethod(cookiesObj, name, () => bru.cookies[name]());
  }
  vm.setProp(bruObject, 'cookies', cookiesObj);
  cookiesObj.dispose();

  if (bru.getTestResults) {
    const getTestResults = bru.getTestResults.bind(bru);
    const fn = vm.newFunction('getTestResults', () => {
      const promise = vm.newPromise();
      getTestResults()
        .then((results) => promise.resolve(marshallToVm(cleanJson(results), vm)))
        .catch((err) => promise.resolve(marshallToVm(cleanJson({ message: messageOf(err) }), vm)));
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    fn.consume((handle) => vm.setProp(bruObject, 'getTestResults', handle));
  }

  if (bru.getAssertionResults) {
    const getAssertionResults = bru.getAssertionResults.bind(bru);
    const fn = vm.newFunction('getAssertionResults', () => {
      const promise = vm.newPromise();
      getAssertionResults()
        .then((results) => promise.resolve(marshallToVm(cleanJson(results), vm)))
        .catch((err) => promise.resolve(marshallToVm(cleanJson({ message: messageOf(err) }), vm)));
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    fn.consume((handle) => vm.setProp(bruObject, 'getAssertionResults', handle));
  }

  const sleep = vm.newFunction('sleep', (msHandle) => {
    const ms = Number(vm.dump(msHandle)) || 0;
    const promise = vm.newPromise();
    bru.sleep(ms).then(() => promise.resolve(vm.undefined));
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sleep.consume((handle) => vm.setProp(bruObject, 'sleep', handle));

  const sendRequest = vm.newFunction('_sendRequest', (configHandle) => {
    const config = vm.dump(configHandle);
    const promise = vm.newPromise();
    bru.sendRequest(config)
      .then((result) => promise.resolve(marshallToVm(cleanJson(result), vm)))
      .catch((err) => promise.reject(marshallToVm(cleanJson({ message: messageOf(err) }), vm)));
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  sendRequest.consume((handle) => vm.setProp(bruObject, '_sendRequest', handle));

  const runRequest = vm.newFunction('runRequest', (pathHandle) => {
    const path = String(vm.dump(pathHandle) ?? '');
    const promise = vm.newPromise();
    bru.runRequest(path)
      .then((result) => promise.resolve(marshallToVm(cleanJson(result), vm)))
      .catch((err) => promise.resolve(marshallToVm(cleanJson({ message: messageOf(err) }), vm)));
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  runRequest.consume((handle) => vm.setProp(bruObject, 'runRequest', handle));

  vm.setProp(vm.global, 'bru', bruObject);
  bruObject.dispose();

  const wrapper = vm.evalCode(`
    bru.sendRequest = async (requestConfig, callback) => {
      if (!callback) return await bru._sendRequest(requestConfig);
      try {
        const response = await bru._sendRequest(requestConfig);
        try {
          await callback(null, response);
          return response;
        } catch (error) {
          return Promise.reject(error);
        }
      } catch (error) {
        await callback(error, null);
        return Promise.reject(error);
      }
    };
  `);
  if (wrapper.error) wrapper.error.dispose();
  else wrapper.value.dispose();
};

export default addBruShimToContext;
