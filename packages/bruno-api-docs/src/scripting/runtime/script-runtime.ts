import * as chai from 'chai';
import Bru, { type RunRequestCallback } from '@/scripting/utils/bru';
import BrunoRequest from '@/scripting/utils/bruno-request';
import BrunoResponse from '@/scripting/utils/bruno-response';
import { executeQuickJsVmAsync } from '@/scripting/sandbox/quickjs';
import type { AssertionResult } from '@/scripting/utils/test';
import { createBruTestResultMethods, type BruTestResultMethods, type TestResultsResponse } from '@/scripting/utils/test';

interface RunScriptOptions {
  script: string;
  request?: any;
  response?: any;
  collectionName?: string;
  collectionPath?: string;
  variables?: any;
  assertionResults?: AssertionResult[];
  warnings?: string[];
  runRequest?: RunRequestCallback;
}

export interface ScriptRunError extends Error {
  partialTestResults?: TestResultsResponse;
}

class ScriptRuntime {
  constructor() { }

  async runScript({
    script,
    request,
    response,
    collectionName,
    collectionPath,
    variables,
    assertionResults,
    warnings,
    runRequest
  }: RunScriptOptions): Promise<Bru> {
    const bru = new Bru({ collectionPath, collectionName, variables, warnings, runRequest });
    let req, res;
    if (request) {
      req = new BrunoRequest(request, warnings);
    }
    if (response) {
      res = new BrunoResponse(response);
    }

    // extend bru with result getter methods
    const { __brunoTestResults, test }: BruTestResultMethods = createBruTestResultMethods(bru, assertionResults || [], chai);

    interface ScriptContext {
      bru: any;
      req?: any;
      res?: any;
      test: (description: string, callback: () => Promise<void> | void) => Promise<void>;
      __brunoTestResults: any;
      console: {
        log: typeof console.log;
        debug: typeof console.debug;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
      };
    }

    const context: ScriptContext = {
      bru,
      req,
      res,
      test,
      __brunoTestResults: __brunoTestResults,
      console: {
        log: console.log,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error
      }
    };

    try {
      await executeQuickJsVmAsync({
        script: script,
        context: context,
        collectionPath
      });
    } catch (error) {
      const scriptError: ScriptRunError = error instanceof Error ? error : new Error(String(error));
      if (bru.getTestResults) scriptError.partialTestResults = await bru.getTestResults();
      throw scriptError;
    }

    // Return bru object so caller can access test results
    return bru;
  }
}

export default ScriptRuntime;
