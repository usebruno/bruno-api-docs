import { marshallToVm } from '../utils';

const addBrunoRequestShimToContext = (vm: any, req: any) => {
  const reqObject = vm.newObject();

  const url = marshallToVm(req.getUrl(), vm);
  const method = marshallToVm(req.getMethod(), vm);
  const headers = marshallToVm(req.getHeaders(), vm);
  const body = marshallToVm(req.getBody(), vm);
  const timeout = marshallToVm(req.getTimeout(), vm);
  const name = marshallToVm(req.getName(), vm);
  const tags = marshallToVm(req.getTags(), vm);

  vm.setProp(reqObject, 'url', url);
  vm.setProp(reqObject, 'method', method);
  vm.setProp(reqObject, 'headers', headers);
  vm.setProp(reqObject, 'body', body);
  vm.setProp(reqObject, 'timeout', timeout);
  vm.setProp(reqObject, 'name', name);
  vm.setProp(reqObject, 'tags', tags);

  url.dispose();
  method.dispose();
  headers.dispose();
  body.dispose();
  timeout.dispose();
  name.dispose();
  tags.dispose();

  const getUrl = vm.newFunction('getUrl', function () {
    return marshallToVm(req.getUrl(), vm);
  });
  vm.setProp(reqObject, 'getUrl', getUrl);
  getUrl.dispose();

  const setUrl = vm.newFunction('setUrl', function (url: any) {
    req.setUrl(vm.dump(url));
  });
  vm.setProp(reqObject, 'setUrl', setUrl);
  setUrl.dispose();

  const getMethod = vm.newFunction('getMethod', function () {
    return marshallToVm(req.getMethod(), vm);
  });
  vm.setProp(reqObject, 'getMethod', getMethod);
  getMethod.dispose();

  const getAuthMode = vm.newFunction('getAuthMode', function () {
    return marshallToVm(req.getAuthMode(), vm);
  });
  vm.setProp(reqObject, 'getAuthMode', getAuthMode);
  getAuthMode.dispose();

  const getName = vm.newFunction('getName', function () {
    return marshallToVm(req.getName(), vm);
  });
  vm.setProp(reqObject, 'getName', getName);
  getName.dispose();

  const setMethod = vm.newFunction('setMethod', function (method: any) {
    req.setMethod(vm.dump(method));
  });
  vm.setProp(reqObject, 'setMethod', setMethod);
  setMethod.dispose();

  const getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(req.getHeaders(), vm);
  });
  vm.setProp(reqObject, 'getHeaders', getHeaders);
  getHeaders.dispose();

  const setHeaders = vm.newFunction('setHeaders', function (headers: any) {
    req.setHeaders(vm.dump(headers));
  });
  vm.setProp(reqObject, 'setHeaders', setHeaders);
  setHeaders.dispose();

  const getHeader = vm.newFunction('getHeader', function (name: any) {
    return marshallToVm(req.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(reqObject, 'getHeader', getHeader);
  getHeader.dispose();

  const setHeader = vm.newFunction('setHeader', function (name: any, value: any) {
    req.setHeader(vm.dump(name), vm.dump(value));
  });
  vm.setProp(reqObject, 'setHeader', setHeader);
  setHeader.dispose();

  const getBody = vm.newFunction('getBody', function (options: any) {
    return marshallToVm(req.getBody(vm.dump(options)), vm);
  });
  vm.setProp(reqObject, 'getBody', getBody);
  getBody.dispose();

  const setBody = vm.newFunction('setBody', function (data: any, options: any) {
    req.setBody(vm.dump(data), vm.dump(options));
  });
  vm.setProp(reqObject, 'setBody', setBody);
  setBody.dispose();

  const setMaxRedirects = vm.newFunction('setMaxRedirects', function (maxRedirects: any) {
    req.setMaxRedirects(vm.dump(maxRedirects));
  });
  vm.setProp(reqObject, 'setMaxRedirects', setMaxRedirects);
  setMaxRedirects.dispose();

  const getTimeout = vm.newFunction('getTimeout', function () {
    return marshallToVm(req.getTimeout(), vm);
  });
  vm.setProp(reqObject, 'getTimeout', getTimeout);
  getTimeout.dispose();

  const setTimeout = vm.newFunction('setTimeout', function (timeout: any) {
    req.setTimeout(vm.dump(timeout));
  });
  vm.setProp(reqObject, 'setTimeout', setTimeout);
  setTimeout.dispose();

  const disableParsingResponseJson = vm.newFunction('disableParsingResponseJson', function () {
    req.disableParsingResponseJson();
  });
  vm.setProp(reqObject, 'disableParsingResponseJson', disableParsingResponseJson);
  disableParsingResponseJson.dispose();

  const getTags = vm.newFunction('getTags', function () {
    return marshallToVm(req.getTags(), vm);
  });
  vm.setProp(reqObject, 'getTags', getTags);
  getTags.dispose();

  const onFail = vm.newFunction('onFail', function (callback: any) {
    req.onFail(vm.dump(callback));
  });
  vm.setProp(reqObject, 'onFail', onFail);
  onFail.dispose();

  vm.setProp(vm.global, 'req', reqObject);
  reqObject.dispose();
};

export default addBrunoRequestShimToContext;
