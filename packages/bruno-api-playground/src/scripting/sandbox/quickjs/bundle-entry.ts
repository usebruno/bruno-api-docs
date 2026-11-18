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

const sandboxGlobal = globalThis as unknown as Record<string, unknown>;

sandboxGlobal.expect = expect;
sandboxGlobal.assert = assert;
sandboxGlobal.moment = moment;
sandboxGlobal.btoa = btoa;
sandboxGlobal.atob = atob;
sandboxGlobal.Buffer = Buffer;
sandboxGlobal.tv4 = tv4;
sandboxGlobal.Ajv = Ajv;
sandboxGlobal.addFormats = addFormats;
sandboxGlobal.uuid = uuid;
sandboxGlobal.nanoid = nanoid;
sandboxGlobal.path = path;

sandboxGlobal.requireObject = {
  ...((sandboxGlobal.requireObject as Record<string, unknown> | undefined) || {}),
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
