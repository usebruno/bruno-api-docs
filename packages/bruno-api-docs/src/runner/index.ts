import type { HttpRequest } from '@opencollection/types/requests/http';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Environment } from '@opencollection/types/config/environments';
import { RequestExecutor } from './RequestExecutor';
import ScriptRuntime, { type ScriptRunError } from '@/scripting/runtime/script-runtime';
import { appendScriptErrorResult, SCRIPT_ERROR_TITLES, type ScriptError } from './utils/script-errors';
import type { RunRequestCallback } from '@/scripting/utils/bru';
import AssertRuntime, { type AssertionResult } from '@/scripting/runtime/assert-runtime';
import { getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeAuth, interpolateVars, findItemByPath } from './utils';
import { getCollectionFolderRequestVariables, getCollectionVariables } from './utils/variable-merger';
import { coerceVariableValue, parseValueByDataType, type CoercedVariableValue } from '@/utils/variableDataType';
import { externalSecretValues, type ExternalSecretEntry } from '@/utils/variableResolution';
import type { Variables, JsonValue } from './utils/variable-interpolator';
import type { VariableValueOrVariants, VariableValueType } from '@opencollection/types/common/variables';
import {
  getRequestScripts, getRequestAssertions, scriptsArrayToObject,
  isHttpRequest, getItemType, getItemName, getHttpMethod, getRequestUrl, type InternalHttpRequest
} from '@/utils/schemaHelpers';
import { getItemUuid } from '@/utils/itemUtils';
import { cloneDeep, isEqual } from 'lodash-es';

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown script error');

const MAX_RUN_REQUEST_DEPTH = 25;

interface RunContext {
  collection: OpenCollectionCollection;
  environment?: Environment;
  environmentVariables: Variables;
  collectionVariables: Variables;
  runtimeVariables: Variables;
  processEnvVars: Variables;
  timeout: number;
  warnings: string[];
}

const requestKey = (item: HttpRequest): string =>
  getItemUuid(item) || `${getItemName(item) ?? ''}|${getHttpMethod(item)}|${getRequestUrl(item)}`;

const diffVariables = (
  before: Variables,
  after: Variables,
  ignore: Set<string> = new Set()
): { upserts: Variables; deleted: string[]; changed: boolean } => {
  const upserts: Variables = {};
  for (const [key, value] of Object.entries(after)) {
    if (key === '__name__' || ignore.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(before, key) || !isEqual(before[key], value)) {
      upserts[key] = value;
    }
  }
  const deleted = Object.keys(before).filter(
    (key) => key !== '__name__' && !ignore.has(key) && !Object.prototype.hasOwnProperty.call(after, key)
  );
  return { upserts, deleted, changed: Object.keys(upserts).length > 0 || deleted.length > 0 };
};

interface DeclaredEnvironmentVariable {
  name?: string;
  value?: VariableValueOrVariants;
  type?: VariableValueType;
  secret?: boolean;
  disabled?: boolean;
}

export interface RunRequestOptions {
  item: HttpRequest;
  collection: OpenCollectionCollection;
  environment?: Environment;
  runtimeVariables?: Variables;
  timeout?: number;
  validateSSL?: boolean;
}

export interface TestResultsResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: Array<{
    status: string;
    description: string;
    expected?: JsonValue;
    actual?: JsonValue;
    error?: string;
  }>;
}

export interface AssertionResultsResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: Array<{
    status: string;
    lhsExpr?: string;
    rhsExpr?: string;
    operator?: string;
    rhsOperand?: JsonValue;
    error?: string;
  }>;
}

export interface RunRequestResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: JsonValue;
  /** Present only when needed downstream — binary previews, byte views, or an unreconstructable body. */
  base64Data?: string;
  /** Content type sniffed from the response bytes at parse time (magic numbers → SVG → text), or null. */
  detectedContentType?: string | null;
  size?: number;
  duration?: number;
  url?: string;
  error?: string;
  errorType?: string;
  errorTitle?: string;
  isCancel?: boolean;
  requestId?: string;
  assertionResults?: AssertionResultsResponse;
  testResults?: TestResultsResponse;
  scriptErrors?: ScriptError[];
  warnings?: string[] | null;
  environmentVariables?: { envName: string; variables: Variables; deleted: string[] };
  collectionVariables?: { variables: Variables; deleted: string[] };
}

export class RequestRunner {
  private executor: RequestExecutor;
  private scriptRuntime: ScriptRuntime;
  private assertRuntime: AssertRuntime;

  constructor() {
    this.executor = new RequestExecutor();
    this.scriptRuntime = new ScriptRuntime();
    this.assertRuntime = new AssertRuntime();
  }

  async runRequest(options: RunRequestOptions): Promise<RunRequestResponse> {
    const { item, collection, environment, runtimeVariables = {}, timeout = 30000 } = options;
    const context: RunContext = {
      collection,
      environment,
      environmentVariables: this.getEnvironmentVariables(environment),
      collectionVariables: getCollectionVariables(collection),
      processEnvVars: (typeof process !== 'undefined' && process.env ? process.env : {}) as Record<string, string>,
      runtimeVariables,
      timeout,
      warnings: []
    };

    const initialEnvVariables = cloneDeep(context.environmentVariables);
    const initialCollectionVariables = cloneDeep(context.collectionVariables);
    const response = await this.runRequestWithContext(item, context, 0, []);

    const declaredEnvNames = new Set(
      (environment?.variables ?? [])
        .filter((variable) => !variable.disabled)
        .map((variable) => variable.name)
        .filter((name): name is string => Boolean(name))
    );
    const externalNames = new Set(
      ((environment?.externalSecrets?.variables ?? []) as { name?: string }[])
        .map((entry) => entry.name)
        .filter((name): name is string => Boolean(name))
        .filter((name) => !declaredEnvNames.has(name))
    );
    const envDelta = diffVariables(initialEnvVariables, context.environmentVariables, externalNames);
    if (envDelta.changed) {
      if (environment?.name) {
        response.environmentVariables = {
          envName: environment.name,
          variables: envDelta.upserts,
          deleted: envDelta.deleted
        };
      } else {
        context.warnings.push('bru.setEnvVar: no environment is selected, so the changes were not saved.');
        response.warnings = context.warnings;
      }
    }

    const collectionDelta = diffVariables(initialCollectionVariables, context.collectionVariables);
    if (collectionDelta.changed) {
      response.collectionVariables = { variables: collectionDelta.upserts, deleted: collectionDelta.deleted };
    }

    return response;
  }

  private makeNestedRunRequest(
    context: RunContext,
    depth: number,
    chain: string[],
    currentItem: HttpRequest
  ): RunRequestCallback {
    return async (rawPath: string) => {
      if (depth >= MAX_RUN_REQUEST_DEPTH) {
        throw new Error(`bru.runRequest: exceeded the maximum nesting depth of ${MAX_RUN_REQUEST_DEPTH}`);
      }
      const target = findItemByPath(context.collection, rawPath);
      if (!target) {
        throw new Error(`bru.runRequest: invalid request path - ${rawPath}`);
      }
      if (!isHttpRequest(target)) {
        throw new Error(`bru.runRequest does not support ${getItemType(target) || 'non-http'} requests`);
      }
      const nextChain = [...chain, requestKey(currentItem)];
      if (nextChain.includes(requestKey(target))) {
        throw new Error(`bru.runRequest: circular reference detected for "${rawPath}"`);
      }

      const response = await this.runRequestWithContext(target, context, depth + 1, nextChain);
      if (response.error) {
        throw new Error(response.error);
      }
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
    };
  }

  private async runRequestWithContext(
    item: HttpRequest,
    context: RunContext,
    depth: number,
    chain: string[]
  ): Promise<RunRequestResponse> {
    const {
      collection, environmentVariables, collectionVariables, runtimeVariables, processEnvVars, timeout, warnings
    } = context;
    const requestId = this.generateRequestId();

    try {
      const processedRequest: InternalHttpRequest = await this.preprocessRequest(item, collection);
      processedRequest.__bruno__executionMode = 'standalone';

      const { folderVariables, requestVariables } = getCollectionFolderRequestVariables(collection, processedRequest);

      const allVariables = {
        environmentVariables,
        runtimeVariables,
        processEnvVars,
        collectionVariables,
        folderVariables,
        requestVariables
      };

      const runRequest = this.makeNestedRunRequest(context, depth, chain, item);

      // Get scripts in object format for easier access
      const scriptsObj = scriptsArrayToObject(getRequestScripts(processedRequest));
      const assertions = getRequestAssertions(processedRequest);

      const scriptErrors: ScriptError[] = [];

      // Pre-request script
      if (scriptsObj.preRequest) {
        try {
          await this.scriptRuntime.runScript({
            script: scriptsObj.preRequest,
            request: processedRequest,
            variables: allVariables,
            collectionName: collection.info?.name || '',
            collectionPath: '',
            warnings,
            runRequest
          });
        } catch (scriptError) {
          return {
            requestId,
            error: errorMessage(scriptError),
            errorTitle: SCRIPT_ERROR_TITLES['pre-request'],
            warnings: warnings.length ? warnings : null
          };
        }
      }

      const interpolatedRequest = interpolateVars(processedRequest, allVariables);

      const response = await this.executor.executeRequest(interpolatedRequest, { timeout });

      // Post-response script
      if (scriptsObj.postResponse) {
        try {
          await this.scriptRuntime.runScript({
            script: scriptsObj.postResponse,
            request: interpolatedRequest,
            response,
            variables: allVariables,
            collectionName: collection.info?.name || '',
            collectionPath: '',
            warnings,
            runRequest
          });
        } catch (scriptError) {
          console.warn('Post-response script error:', scriptError);
          scriptErrors.push({ phase: 'post-response', message: errorMessage(scriptError) });
        }
      }
      let assertionResults: AssertionResult[] | undefined;
      let assertionResultsResponse: AssertionResultsResponse | undefined;
      let testResultsResponse: TestResultsResponse | undefined;

      // Run assertions
      if (assertions && assertions.length > 0) {
        try {
          assertionResults = this.assertRuntime.runAssertions(
            assertions,
            interpolatedRequest,
            response,
            allVariables
          );
        } catch (assertError) {
          // Don't fail the request for assertion errors, just log them
          console.warn('Assertion error:', assertError);
        }
      }

      // Tests
      if (scriptsObj.tests) {
        try {
          const bru = await this.scriptRuntime.runScript({
            script: scriptsObj.tests,
            request: interpolatedRequest,
            response,
            variables: allVariables,
            collectionName: collection.info?.name || '',
            collectionPath: '',
            assertionResults,
            warnings,
            runRequest
          });

          // Capture test results and assertion results from bru object
          if (bru && typeof bru.getTestResults === 'function') {
            testResultsResponse = await bru.getTestResults();
          }
          if (bru && typeof bru.getAssertionResults === 'function') {
            assertionResultsResponse = await bru.getAssertionResults();
          }
        } catch (scriptError) {
          console.warn('Test script error:', scriptError);
          scriptErrors.push({ phase: 'tests', message: errorMessage(scriptError) });
          testResultsResponse = (scriptError as ScriptRunError).partialTestResults;
        }
      }

      for (const scriptError of scriptErrors) {
        testResultsResponse = appendScriptErrorResult(testResultsResponse, scriptError.phase, scriptError.message);
      }

      return {
        ...response,
        requestId,
        assertionResults: assertionResultsResponse,
        testResults: testResultsResponse,
        scriptErrors: scriptErrors.length ? scriptErrors : undefined,
        warnings: warnings.length ? warnings : null
      };
    } catch (error) {
      return {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        warnings: warnings.length ? warnings : null
      };
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEnvironmentVariables(environment?: Environment): Variables {
    // External secrets are referenced as ordinary `{{name}}` variables, so they
    // go in first and a variable declared on the environment with the same name
    // takes precedence over them.
    const externalSecrets = externalSecretValues(
      environment?.externalSecrets?.variables as ExternalSecretEntry[] | undefined
    );
    const vars: Variables = { ...externalSecrets };
    if (environment?.name) {
      vars.__name__ = environment.name;
    }
    if (!environment?.variables) return vars;

    const declared = environment.variables as DeclaredEnvironmentVariable[];
    const secretsLast = [...declared.filter((v) => !v.secret), ...declared.filter((v) => v.secret)];

    return secretsLast.reduce((acc, variable) => {
      const name = variable.name;
      if (name && !variable.disabled) {
        // Coerce typed values (number/boolean/object) to native, like folder/collection/request vars.
        // A secret carries its data type as a sibling `type` (value is a plain string), whereas a
        // non-secret nests it inside the value — so coerce each from the right place.
        acc[name] = (variable.secret
          ? parseValueByDataType(variable.value as CoercedVariableValue, variable.type)
          : coerceVariableValue(variable.value)) as JsonValue;
      }
      return acc;
    }, vars);
  }

  private async preprocessRequest(
    item: HttpRequest,
    collection: OpenCollectionCollection
  ): Promise<HttpRequest> {
    // Create a deep copy of the request to avoid mutating the original
    const processed = JSON.parse(JSON.stringify(item)) as HttpRequest;

    // Get the tree path from collection to this item
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);

    // Apply collection and folder defaults in the correct order
    mergeHeaders(collection, processed, requestTreePath);
    mergeAuth(collection, processed, requestTreePath);
    mergeScripts(collection, processed, requestTreePath, 'sandwich'); // Default to sandwich flow

    return processed;
  }

  getGlobalVariables(): Variables {
    // todo
    return {};
  }

  clearGlobalVariables(): void {
    // todo
  }
}

export const createRequestRunner = () => new RequestRunner();

export const requestRunner = new RequestRunner();

export const getGlobalVariables = () => requestRunner.getGlobalVariables();
export const clearGlobalVariables = () => requestRunner.clearGlobalVariables();
