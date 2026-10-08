import * as _ from 'lodash';
import bruToJsonV2 from '@usebruno/lang/v2/src/bruToJson.js';
import bruToEnvJsonV2 from '@usebruno/lang/v2/src/envToJson.js';
import _collectionBruToJson from '@usebruno/lang/v2/src/collectionBruToJson.js';
import { getOauth2AdditionalParameters } from './oauth2-additional-params';

export const parseBruRequest = (data: string | any, parsed: boolean = false): any => {
  try {
    const json = parsed ? data : bruToJsonV2(data);

    if (_.get(json, 'meta.type') === 'app') {
      const seq = _.get(json, 'meta.seq');
      const tags = _.get(json, 'meta.tags', []);
      return {
        type: 'app',
        name: _.get(json, 'meta.name'),
        seq: !_.isNaN(seq) ? Number(seq) : 1,
        tags: Array.isArray(tags) ? tags : [],
        settings: _.get(json, 'settings', {}),
        app: { code: _.get(json, 'app.code', null) },
        request: null
      };
    }

    let requestType = _.get(json, 'meta.type');
    switch (requestType) {
      case 'http':
        requestType = 'http-request';
        break;
      case 'graphql':
        requestType = 'graphql-request';
        break;
      case 'grpc':
        requestType = 'grpc-request';
        break;
      case 'ws':
        requestType = 'ws-request';
        break;
      default:
        requestType = 'http-request';
    }

    const sequence = _.get(json, 'meta.seq');
    const tags = _.get(json, 'meta.tags', []);
    const urlPath: Record<typeof requestType, string> = {
      'grpc-request': 'grpc.url',
      'ws-request': 'ws.url',
      'default': 'http.url'
    };

    const appData = _.get(json, 'app');
    const app = appData
      ? { code: _.get(appData, 'code', null), enabled: _.get(appData, 'enabled', false) === true }
      : null;

    const transformedJson = {
      type: requestType,
      name: _.get(json, 'meta.name'),
      seq: !_.isNaN(sequence) ? Number(sequence) : 1,
      settings: _.get(json, 'settings', {}),
      app,
      tags: Array.isArray(tags) ? tags : [],
      request: {
        // Preserving special characters in custom methods. Using _.upperCase strips special characters.
        method:
          requestType === 'grpc-request'
            ? _.get(json, 'grpc.method', '')
            : String(_.get(json, 'http.method') ?? '').toUpperCase(),
        url: _.get(json, urlPath[requestType], _.get(json, urlPath.default)),
        headers: requestType === 'grpc-request' ? _.get(json, 'metadata', []) : _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        body: _.get(json, 'body', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        assertions: _.get(json, 'assertions', []),
        tests: _.get(json, 'tests', ''),
        docs: _.get(json, 'docs', '')
      },
      examples: _.get(json, 'examples', []).map((e: any) => {
        return bruExampleToJson(e, true, requestType, _.get(json, 'http.method'));
      })
    } as any;

    // Add request type specific fields
    if (requestType === 'grpc-request') {
      const selectedMethodType = _.get(json, 'grpc.methodType');
      selectedMethodType && ((transformedJson.request as any).methodType = selectedMethodType);
      const protoPath = _.get(json, 'grpc.protoPath');
      protoPath && ((transformedJson.request as any).protoPath = protoPath);
      transformedJson.request.auth.mode = _.get(json, 'grpc.auth', 'none');
      transformedJson.request.body = _.get(json, 'body', {
        mode: 'grpc',
        grpc: _.get(json, 'body.grpc', [
          {
            name: 'message 1',
            content: '{}'
          }
        ])
      });
    } else if (requestType === 'ws-request') {
      transformedJson.request.auth.mode = _.get(json, 'ws.auth', 'none');
      transformedJson.request.body = _.get(json, 'body', {
        mode: 'ws',
        ws: _.get(json, 'body.ws', [
          {
            name: 'message 1',
            content: '{}'
          }
        ])
      });
    } else {
      // For HTTP and GraphQL
      (transformedJson.request as any).params = _.get(json, 'params', []);
      transformedJson.request.auth.mode = _.get(json, 'http.auth', 'none');
      transformedJson.request.body.mode = _.get(json, 'http.body', 'none');
    }

    // add oauth2 additional parameters if they exist
    const hasOauth2GrantType = json?.auth?.oauth2?.grantType;
    if (hasOauth2GrantType) {
      const additionalParameters = getOauth2AdditionalParameters(json);
      const hasAdditionalParameters = Object.keys(additionalParameters || {}).length > 0;
      if (hasAdditionalParameters) {
        transformedJson.request.auth.oauth2.additionalParameters = additionalParameters;
      }
    }
    return transformedJson;
  } catch (error) {
    console.log('parseBruRequest error', error);
    throw error;
  }
};

export const parseBruCollection = (data: string | any, parsed: boolean = false): any => {
  try {
    const json = parsed ? data : _collectionBruToJson(data);

    const transformedJson: any = {
      request: {
        headers: _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        tests: _.get(json, 'tests', '')
      },
      settings: _.get(json, 'settings', {}),
      docs: _.get(json, 'docs', '')
    };

    // add meta if it exists
    // this is only for folder bru file
    if (json.meta) {
      transformedJson.meta = {
        name: json.meta.name
      };

      // Include seq if it exists
      if (json.meta.seq !== undefined) {
        const sequence = json.meta.seq;
        transformedJson.meta.seq = !isNaN(sequence) ? Number(sequence) : 1;
      }
    }

    // add oauth2 additional parameters if they exist
    const hasOauth2GrantType = json?.auth?.oauth2?.grantType;
    if (hasOauth2GrantType) {
      const additionalParameters = getOauth2AdditionalParameters(json);
      const hasAdditionalParameters = Object.keys(additionalParameters).length > 0;
      if (hasAdditionalParameters) {
        transformedJson.request.auth.oauth2.additionalParameters = additionalParameters;
      }
    }

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const parseBruEnvironment = (bru: string): any => {
  try {
    const json = bruToEnvJsonV2(bru);

    // the app env format requires each variable to have a type
    // this need to be evaluated and safely removed
    // i don't see it being used in schema validation
    if (json && json.variables && json.variables.length) {
      _.each(json.variables, (v: any) => (v.type = 'text'));
    }

    return json;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const bruExampleToJson = (data: string | any, parsed: boolean = false, parentType?: string, parentMethod?: string): any => {
  try {
    const json = parsed ? data : bruToJsonV2(data);

    // Use parent request's type and method if provided
    const requestType = parentType || _.get(json, 'meta.type', 'http');
    const requestMethod = parentMethod || _.get(json, 'http.method', 'GET');

    let transformedType = requestType;
    switch (requestType) {
      case 'http':
        transformedType = 'http-request';
        break;
      case 'graphql':
        transformedType = 'graphql-request';
        break;
      case 'grpc':
        transformedType = 'grpc-request';
        break;
      case 'ws':
        transformedType = 'ws-request';
        break;
      default:
        transformedType = 'http-request';
    }

    /**
     * Backward compatibility (pre-v3.0.2 - v3.2.0): Postman imports before PR #6876 stored status/statusText swapped
     * (code: "OK", text: "202" instead of code: 202, text: "OK"). Detect and swap back.
     * TODO(Sid / Shubh): Remove after v5 — all collections should be migrated by then.
     */
    let status = _.get(json, 'response.status', '200');
    let statusText = _.get(json, 'response.statusText', 'OK');
    if (isNaN(Number(status)) && !isNaN(Number(statusText))) {
      [status, statusText] = [statusText, status];
    }

    // Follow the same structure as the main request, but with missing fields for examples
    const transformedJson = {
      type: transformedType,
      name: _.get(json, 'name'),
      description: _.get(json, 'description', ''),
      // Examples don't have seq, settings, tags
      request: {
        method: _.get(json, 'request.method') || requestMethod,
        url: _.get(json, 'request.url'),
        headers: _.get(json, 'request.headers', []),
        body: _.get(json, 'request.body', {
          mode: 'none'
        }),
        // Examples don't have script, vars, assertions, tests, docs
        params: _.get(json, 'request.params', [])
      },
      response: {
        headers: _.get(json, 'response.headers', []).map((header: any) => ({
          name: header.name,
          value: header.value
        })),
        status: Number(status) || 200,
        statusText: statusText || 'OK',
        body: {
          type: _.get(json, 'response.body.type', 'json'),
          content: _.get(json, 'response.body.content', '')
        }
      }
    } as any;

    return transformedJson;
  } catch (error) {
    console.log('bruExampleToJson error', error);
    throw error;
  }
};
