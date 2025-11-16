import type { HttpRequest } from '@opencollection/types/requests/http';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { Environment } from '@opencollection/types/config/environments';
import { RequestExecutor } from './RequestExecutor';
import { VariableInterpolator } from './VariableInterpolator';
import ScriptRuntime from '../scripting/runtime/script-runtime';

export interface RunRequestOptions {
  item: HttpRequest;
  collection: OpenCollectionCollection;
  environment?: Environment;
  runtimeVariables?: Record<string, any>;
}

export interface RunRequestResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, any>;
  data?: any;
  size?: number;
  duration?: number;
  url?: string;
  error?: string;
  isCancel?: boolean;
}

export class RequestRunner {
  private executor: RequestExecutor;
  private interpolator: VariableInterpolator;
  private scriptRuntime: ScriptRuntime;

  constructor() {
    this.executor = new RequestExecutor();
    this.interpolator = new VariableInterpolator();
    this.scriptRuntime = new ScriptRuntime();
  }

  async runRequest(options: RunRequestOptions): Promise<RunRequestResponse> {
    const { item, collection, environment, runtimeVariables = {} } = options;
    
    try {
      const envVars = this.getEnvironmentVariables(environment);
      const allVars = { ...envVars, ...runtimeVariables };
      
      const processedRequest = await this.preprocessRequest(item, collection, allVars);
      
      if (processedRequest.scripts?.preRequest) {
        await this.scriptRuntime.runScript({
          script: processedRequest.scripts.preRequest,
          request: processedRequest,
          variables: {
            envVariables: envVars,
            runtimeVariables: runtimeVariables,
            globalEnvironmentVariables: {},
            collectionVariables: {},
            folderVariables: {},
            requestVariables: {}
          },
          collectionName: collection.name,
          collectionPath: ""
        });
      }
      
      const interpolatedRequest = this.interpolator.interpolateRequest(processedRequest, allVars);
      const response = await this.executor.executeRequest(interpolatedRequest);
      
      if (processedRequest.scripts?.postResponse) {
        await this.scriptRuntime.runScript({
          script: processedRequest.scripts.postResponse,
          request: interpolatedRequest,
          response,
          variables: {
            envVariables: envVars,
            runtimeVariables: runtimeVariables,
            globalEnvironmentVariables: {},
            collectionVariables: {},
            folderVariables: {},
            requestVariables: {}
          },
          collectionName: collection.name,
          collectionPath: ""
        });
      }
      
      if (processedRequest.scripts?.tests) {
        await this.scriptRuntime.runScript({
          script: processedRequest.scripts.tests,
          request: interpolatedRequest,
          response,
          variables: {
            envVariables: envVars,
            runtimeVariables: runtimeVariables,
            globalEnvironmentVariables: {},
            collectionVariables: {},
            folderVariables: {},
            requestVariables: {}
          },
          collectionName: collection.name,
          collectionPath: ""
        });
      }
      
      return response;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private getEnvironmentVariables(environment?: Environment): Record<string, any> {
    if (!environment?.variables) return {};
    
    return environment.variables.reduce((vars, variable) => {
      if (variable.name && !variable.disabled) {
        vars[variable.name] = variable.value || variable.default || '';
      }
      return vars;
    }, {} as Record<string, any>);
  }

  private async preprocessRequest(
    item: HttpRequest, 
    _collection: OpenCollectionCollection, 
    _variables: Record<string, any>
  ): Promise<HttpRequest> {
    const processed = { ...item };
    
    return processed;
  }

  getGlobalVariables(): Record<string, any> {
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