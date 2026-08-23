import xmlFormat from 'xml-formatter';
import { interpolate as interpolateString } from '@/runner/utils/variable-interpolator';
import { VARIABLE_NAME_REGEX } from '@/constants/regex';
import { addUnsupportedWarning } from './unsupported-warning';
import type { JsonValue } from './bruno-response';

type VariableStore = Record<string, JsonValue>;
type WarningStub = () => void;

interface TestResultsResponse {
  summary: { total: number; passed: number; failed: number; skipped: number };
  results: Array<{ status: string; description: string; expected?: JsonValue; actual?: JsonValue; error?: string }>;
}

interface AssertionResultsResponse {
  summary: { total: number; passed: number; failed: number; skipped: number };
  results: Array<{
    status: string; lhsExpr?: string; rhsExpr?: string; operator?: string; rhsOperand?: JsonValue; error?: string;
  }>;
}

interface BruVariables {
  environmentVariables?: VariableStore;
  runtimeVariables?: VariableStore;
  globalEnvironmentVariables?: VariableStore;
  collectionVariables?: VariableStore;
  folderVariables?: VariableStore;
  requestVariables?: VariableStore;
  processEnvVars?: VariableStore;
}

export interface BruRunRequestResult {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: JsonValue;
  error?: string;
}

export type RunRequestCallback = (path: string) => Promise<BruRunRequestResult>;

interface BruOptions {
  collectionPath?: string;
  collectionName?: string;
  variables?: BruVariables;
  warnings?: string[];
  runRequest?: RunRequestCallback;
}

interface SendRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: JsonValue;
}

const BODYLESS_METHODS = ['GET', 'HEAD'];

const assertValidVariableName = (key: string): void => {
  if (VARIABLE_NAME_REGEX.test(key) === false) {
    throw new Error(
      `Variable name: "${key}" contains invalid characters!`
      + ' Names must only contain alpha-numeric characters, "-", "_", "."'
    );
  }
};

const minifyJson = (json: JsonValue): string => {
  if (json === null || json === undefined) {
    throw new Error('Failed to minify');
  }
  if (typeof json === 'object') {
    try {
      return JSON.stringify(json);
    } catch (err) {
      throw new Error(`Failed to minify: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (typeof json === 'string') {
    const trimmed = json.trim();
    if (trimmed === '') return trimmed;
    try {
      return JSON.stringify(JSON.parse(trimmed));
    } catch (err) {
      throw new Error(`Failed to minify: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new TypeError('minifyJson expects a string or object');
};

const minifyXml = (xml: JsonValue): string => {
  if (xml === null || xml === undefined) {
    throw new Error('Failed to minify');
  }
  if (typeof xml === 'string') {
    try {
      return xmlFormat(xml, { collapseContent: false, indentation: '', lineSeparator: '' });
    } catch (err) {
      throw new Error(`Failed to minify: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new TypeError('minifyXml expects a string');
};

class Bru {
  environmentVariables: VariableStore;
  runtimeVariables: VariableStore;
  globalEnvironmentVariables: VariableStore;
  collectionVariables: VariableStore;
  folderVariables: VariableStore;
  requestVariables: VariableStore;
  processEnvVars: VariableStore;
  collectionPath: string | undefined;
  collectionName: string | undefined;
  runner: {
    setNextRequest: WarningStub;
    skipRequest: WarningStub;
    stopExecution: WarningStub;
    iterationData: Record<string, WarningStub>;
  };

  cookies: Record<string, WarningStub>;
  utils: { minifyJson: (json: JsonValue) => string; minifyXml: (xml: JsonValue) => string };

  getTestResults?: () => Promise<TestResultsResponse>;
  getAssertionResults?: () => Promise<AssertionResultsResponse>;

  private warnings: string[] | undefined;
  private runRequestCallback: RunRequestCallback | undefined;

  constructor({ collectionPath, collectionName, variables, warnings, runRequest }: BruOptions) {
    const vars = variables || {};
    this.environmentVariables = vars.environmentVariables || {};
    this.runtimeVariables = vars.runtimeVariables || {};
    this.globalEnvironmentVariables = vars.globalEnvironmentVariables || {};
    this.collectionVariables = vars.collectionVariables || {};
    this.folderVariables = vars.folderVariables || {};
    this.requestVariables = vars.requestVariables || {};
    this.processEnvVars = vars.processEnvVars || {};
    this.collectionPath = collectionPath;
    this.collectionName = collectionName;
    this.warnings = warnings;
    this.runRequestCallback = runRequest;
    this.runner = this.createRunnerStubs();
    this.cookies = this.createCookieStubs();
    this.utils = { minifyJson, minifyXml };
  }

  private addWarning(api: string) {
    addUnsupportedWarning(this.warnings, api);
  }

  warnUnsupported(api: string) {
    this.addWarning(api);
  }

  private createRunnerStubs() {
    const runnerStub = (name: string): WarningStub => () => this.addWarning(`bru.runner.${name}`);
    const iterationStub = (name: string): WarningStub => () => this.addWarning(`bru.runner.iterationData.${name}`);
    return {
      setNextRequest: runnerStub('setNextRequest'),
      skipRequest: runnerStub('skipRequest'),
      stopExecution: runnerStub('stopExecution'),
      iterationData: {
        has: iterationStub('has'),
        get: iterationStub('get'),
        set: iterationStub('set'),
        stringify: iterationStub('stringify'),
        unset: iterationStub('unset')
      }
    };
  }

  private createCookieStubs(): Record<string, WarningStub> {
    const methods = [
      'get', 'has', 'one', 'all', 'count', 'idx', 'indexOf', 'find', 'filter', 'each', 'map',
      'reduce', 'toObject', 'toString', 'add', 'upsert', 'remove', 'delete', 'clear', 'jar'
    ];
    const stubs: Record<string, WarningStub> = {};
    for (const name of methods) {
      stubs[name] = () => this.addWarning(`bru.cookies.${name}`);
    }
    return stubs;
  }

  private combinedVariables(): VariableStore {
    return {
      ...this.globalEnvironmentVariables,
      ...this.collectionVariables,
      ...this.environmentVariables,
      ...this.folderVariables,
      ...this.requestVariables,
      ...this.runtimeVariables,
      process: { env: { ...this.processEnvVars } }
    };
  }

  interpolate = (strOrObj: JsonValue): JsonValue => {
    if (!strOrObj) return strOrObj;
    if (typeof strOrObj === 'object') {
      return JSON.parse(interpolateString(JSON.stringify(strOrObj), this.combinedVariables()));
    }
    if (typeof strOrObj === 'string') {
      return interpolateString(strOrObj, this.combinedVariables());
    }
    return strOrObj;
  };

  cwd() {
    this.addWarning('bru.cwd');
    return '';
  }

  getEnvName() {
    return this.environmentVariables.__name__;
  }

  getProcessEnv() {
    this.addWarning('bru.getProcessEnv');
    return undefined;
  }

  hasEnvVar(key: string) {
    return Object.prototype.hasOwnProperty.call(this.environmentVariables, key);
  }

  getEnvVar(key: string) {
    return this.interpolate(this.environmentVariables[key]);
  }

  setEnvVar(key: string, value: JsonValue) {
    if (!key) {
      throw new Error('Creating a env variable without specifying a name is not allowed.');
    }
    assertValidVariableName(key);
    this.environmentVariables[key] = value;
  }

  deleteEnvVar(key: string) {
    if (key === '__name__') return;
    delete this.environmentVariables[key];
  }

  getAllEnvVars() {
    const vars = { ...this.environmentVariables };
    delete vars.__name__;
    return vars;
  }

  deleteAllEnvVars() {
    for (const key of Object.keys(this.environmentVariables)) {
      if (key === '__name__') continue;
      delete this.environmentVariables[key];
    }
  }

  hasGlobalEnvVar() {
    this.addWarning('bru.hasGlobalEnvVar');
    return false;
  }

  getGlobalEnvVar() {
    this.addWarning('bru.getGlobalEnvVar');
    return undefined;
  }

  setGlobalEnvVar() {
    this.addWarning('bru.setGlobalEnvVar');
  }

  deleteGlobalEnvVar() {
    this.addWarning('bru.deleteGlobalEnvVar');
  }

  getAllGlobalEnvVars() {
    this.addWarning('bru.getAllGlobalEnvVars');
    return {};
  }

  deleteAllGlobalEnvVars() {
    this.addWarning('bru.deleteAllGlobalEnvVars');
  }

  hasVar(key: string) {
    return Object.prototype.hasOwnProperty.call(this.runtimeVariables, key);
  }

  setVar(key: string, value: JsonValue) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }
    assertValidVariableName(key);
    this.runtimeVariables[key] = value;
  }

  getVar(key: string) {
    assertValidVariableName(key);
    return this.interpolate(this.runtimeVariables[key]);
  }

  deleteVar(key: string) {
    delete this.runtimeVariables[key];
  }

  deleteAllVars() {
    for (const key of Object.keys(this.runtimeVariables)) {
      delete this.runtimeVariables[key];
    }
  }

  getAllVars() {
    return { ...this.runtimeVariables };
  }

  getCollectionVar(key: string) {
    return this.interpolate(this.collectionVariables[key]);
  }

  setCollectionVar(key: string, value: JsonValue) {
    if (!key) {
      throw new Error('Creating a variable without specifying a name is not allowed.');
    }
    assertValidVariableName(key);
    this.collectionVariables[key] = value;
  }

  hasCollectionVar(key: string) {
    return Object.prototype.hasOwnProperty.call(this.collectionVariables, key);
  }

  deleteCollectionVar(key: string) {
    delete this.collectionVariables[key];
  }

  deleteAllCollectionVars() {
    for (const key of Object.keys(this.collectionVariables)) {
      delete this.collectionVariables[key];
    }
  }

  getAllCollectionVars() {
    return { ...this.collectionVariables };
  }

  getFolderVar(key: string) {
    return this.interpolate(this.folderVariables[key]);
  }

  getRequestVar(key: string) {
    return this.interpolate(this.requestVariables[key]);
  }

  getSecretVar(key: string) {
    return this.interpolate(this.environmentVariables[key]);
  }

  getCollectionName() {
    return this.collectionName;
  }

  isSafeMode() {
    return true;
  }

  sleep(ms: number) {
    return new Promise<void>((resolve) => { setTimeout(() => resolve(), ms); });
  }

  sendRequest = async (config: JsonValue): Promise<SendRequestResult> => {
    const asObject = config !== null && typeof config === 'object' && !Array.isArray(config) ? config : {};
    const url = typeof config === 'string' ? config : String(asObject.url ?? '');
    const method = String(asObject.method ?? 'GET').toUpperCase();

    if (asObject.httpsAgent !== undefined) {
      this.addWarning('bru.sendRequest httpsAgent option');
    }
    if (asObject.proxy !== undefined) {
      this.addWarning('bru.sendRequest proxy option');
    }

    const headers: Record<string, string> = {};
    const rawHeaders = asObject.headers;
    if (rawHeaders !== null && typeof rawHeaders === 'object' && !Array.isArray(rawHeaders)) {
      for (const [name, value] of Object.entries(rawHeaders)) {
        headers[name] = String(value);
      }
    }

    const rawData = asObject.data ?? asObject.body;
    const body = rawData === null || rawData === undefined
      ? undefined
      : (typeof rawData === 'string' ? rawData : JSON.stringify(rawData));

    const init: RequestInit = { method, headers };
    if (body !== undefined && !BODYLESS_METHODS.includes(method)) {
      init.body = body;
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`bru.sendRequest could not reach ${method} ${url}: ${reason}`);
    }
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => { responseHeaders[name] = value; });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let data: JsonValue = text;
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data
    };
  };

  visualize() {
    this.addWarning('bru.visualize');
  }

  clearVisualizations() {
    this.addWarning('bru.clearVisualizations');
  }

  getOauth2CredentialVar() {
    this.addWarning('bru.getOauth2CredentialVar');
  }

  resetOauth2Credential() {
    this.addWarning('bru.resetOauth2Credential');
  }

  runRequest(path: string): Promise<BruRunRequestResult> {
    if (this.runRequestCallback) {
      return this.runRequestCallback(path);
    }
    this.addWarning('bru.runRequest');
    return Promise.resolve({});
  }

  setNextRequest() {
    this.addWarning('bru.setNextRequest');
  }
}

export default Bru;
