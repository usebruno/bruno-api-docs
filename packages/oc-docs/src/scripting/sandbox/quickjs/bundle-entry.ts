import { expect, assert } from 'chai';
// todo: add all the supported libraries
(globalThis as any).requireObject = {
  ...((globalThis as any).requireObject || {}),
  'chai': { expect, assert }
};