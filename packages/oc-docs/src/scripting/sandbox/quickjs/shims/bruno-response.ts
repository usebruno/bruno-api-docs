import { marshallToVm } from '../utils';

const addBrunoResponseShimToContext = (vm: any, res: any) => {
  const resFn = vm.newFunction('res', function (exprStr: any) {
    return marshallToVm(res(vm.dump(exprStr)), vm);
  });

  const status = marshallToVm(res?.status, vm);
  const statusText = marshallToVm(res?.statusText, vm);
  const headers = marshallToVm(res?.headers, vm);
  const body = marshallToVm(res?.body, vm);
  const responseTime = marshallToVm(res?.responseTime, vm);
  const url = marshallToVm(res?.url, vm);

  vm.setProp(resFn, 'status', status);
  vm.setProp(resFn, 'statusText', statusText);
  vm.setProp(resFn, 'headers', headers);
  vm.setProp(resFn, 'body', body);
  vm.setProp(resFn, 'responseTime', responseTime);
  vm.setProp(resFn, 'url', url);

  status.dispose();
  headers.dispose();
  body.dispose();
  responseTime.dispose();
  url.dispose();
  statusText.dispose();

  const getStatusText = vm.newFunction('getStatusText', function () {
    return marshallToVm(res.getStatusText(), vm);
  });
  vm.setProp(resFn, 'getStatusText', getStatusText);
  getStatusText.dispose();

  const getStatus = vm.newFunction('getStatus', function () {
    return marshallToVm(res.getStatus(), vm);
  });
  vm.setProp(resFn, 'getStatus', getStatus);
  getStatus.dispose();

  const getHeader = vm.newFunction('getHeader', function (name: any) {
    return marshallToVm(res.getHeader(vm.dump(name)), vm);
  });
  vm.setProp(resFn, 'getHeader', getHeader);
  getHeader.dispose();

  const getHeaders = vm.newFunction('getHeaders', function () {
    return marshallToVm(res.getHeaders(), vm);
  });
  vm.setProp(resFn, 'getHeaders', getHeaders);
  getHeaders.dispose();

  const getBody = vm.newFunction('getBody', function () {
    return marshallToVm(res.getBody(), vm);
  });
  vm.setProp(resFn, 'getBody', getBody);
  getBody.dispose();

  const getResponseTime = vm.newFunction('getResponseTime', function () {
    return marshallToVm(res.getResponseTime(), vm);
  });
  vm.setProp(resFn, 'getResponseTime', getResponseTime);
  getResponseTime.dispose();

  const getUrl = vm.newFunction('getUrl', function () {
    return marshallToVm(res.getUrl(), vm);
  });
  vm.setProp(resFn, 'getUrl', getUrl);
  getUrl.dispose();

  const setBody = vm.newFunction('setBody', function (data: any) {
    res.setBody(vm.dump(data));
  });
  vm.setProp(resFn, 'setBody', setBody);
  setBody.dispose();

  const getSize = vm.newFunction('getSize', function () {
    return marshallToVm(res.getSize(), vm);
  });
  vm.setProp(resFn, 'getSize', getSize);
  getSize.dispose();

  const getDataBuffer = vm.newFunction('getDataBuffer', function () {
    return marshallToVm(res.getDataBuffer(), vm);
  });
  vm.setProp(resFn, 'getDataBuffer', getDataBuffer);
  getDataBuffer.dispose();

  vm.setProp(vm.global, 'res', resFn);
  resFn.dispose();
};

export default addBrunoResponseShimToContext;
