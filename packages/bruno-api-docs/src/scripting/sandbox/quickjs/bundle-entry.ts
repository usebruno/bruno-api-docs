import { expect, assert } from 'chai';
import { Buffer } from 'buffer';
import moment from 'moment';
import btoa from 'btoa';
// import atob's node file directly: the default 'atob' import is a browser build that
// reads window, and window does not exist inside the QuickJS sandbox
import atob from 'atob/node-atob';
import CryptoJS from 'crypto-js';
import tv4 from 'tv4';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as uuid from 'uuid';
import * as nanoid from 'nanoid';
import browserPath from 'path-browserify';

// path-browserify reads process.cwd() to resolve relative paths and the sandbox has no process.
// Treat '/' as the working directory instead.
const path = {
  ...browserPath,
  resolve: (...segments: string[]) => browserPath.resolve('/', ...segments),
  relative: (from: string, to: string) =>
    browserPath.relative(browserPath.resolve('/', from), browserPath.resolve('/', to))
};

(globalThis as any).expect = expect;
(globalThis as any).assert = assert;
(globalThis as any).moment = moment;
(globalThis as any).btoa = btoa;
(globalThis as any).atob = atob;
(globalThis as any).Buffer = Buffer;
(globalThis as any).tv4 = tv4;
(globalThis as any).Ajv = Ajv;
(globalThis as any).addFormats = addFormats;
(globalThis as any).uuid = uuid;
(globalThis as any).nanoid = nanoid;
(globalThis as any).path = path;

(globalThis as any).requireObject = {
  ...((globalThis as any).requireObject || {}),
  'chai': { expect, assert },
  'moment': moment,
  'buffer': { Buffer },
  'btoa': btoa,
  'atob': atob,
  'crypto-js': CryptoJS,
  'tv4': tv4,
  'ajv': Ajv,
  'ajv-formats': addFormats,
  'uuid': uuid,
  'nanoid': nanoid,
  'path': path
};
