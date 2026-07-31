import { Buffer } from 'buffer';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { RunRequestResponse } from './index';
import { getHttpMethod, getRequestUrl, getHttpHeaders, getHttpBody, getRequestAuth, getHttpParams } from '../utils/schemaHelpers';
import { buildRequestUrl } from '../utils/pathParams';
import { classifyRequestError, DEFAULT_TIMEOUT_MS } from './classifyRequestError';
import { detectContentTypeFromBytes, isByteFormatContentType } from '../utils/response';
import { RESPONSE_LARGE_THRESHOLD } from '../constants';
import stripJsonComments from 'strip-json-comments';
import { statusCodePhrase } from '@/utils/exampleResponse';

/** Methods `fetch` refuses to attach a request body to. */
const BODYLESS_METHODS = ['GET', 'HEAD'];

export const applyApiKeyToUrl = (url: string, auth: Record<string, unknown> | undefined): string => {
  if (auth?.type !== 'apikey' || auth.placement !== 'query' || !auth.key) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set(String(auth.key), String(auth.value ?? ''));
    return urlObj.toString();
  } catch {
    return url;
  }
};

export class RequestExecutor {
  async executeRequest(request: HttpRequest, options: { timeout?: number } = {}): Promise<RunRequestResponse> {
    const startTime = Date.now();
    const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
    const requestUrl = applyApiKeyToUrl(
      buildRequestUrl(getRequestUrl(request), getHttpParams(request)),
      getRequestAuth(request)
    );

    try {
      const fetchOptions = await this.buildFetchOptions(request, timeoutMs);
      const response = await fetch(requestUrl, fetchOptions);
      const endTime = Date.now();

      const responseData = await this.parseResponse(response);
      const responseHeaders = this.parseHeaders(response.headers);

      return {
        status: response.status,
        statusText: response.statusText ? response.statusText : statusCodePhrase(response.status),
        headers: responseHeaders,
        data: responseData.data,
        base64Data: responseData.base64Data,
        detectedContentType: responseData.detectedContentType,
        size: responseData.size,
        duration: endTime - startTime,
        url: response.url
      };
    } catch (error) {
      const endTime = Date.now();
      const classified = classifyRequestError(error, {
        timeoutMs,
        requestUrl,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined
      });

      return {
        error: classified.message,
        errorType: classified.type,
        errorTitle: classified.title,
        duration: endTime - startTime
      };
    }
  }

  private async buildFetchOptions(request: HttpRequest, timeout = DEFAULT_TIMEOUT_MS): Promise<RequestInit> {
    // `fetch` upper-cases only the methods it knows, so a collection storing
    // `purge` would go out lower-cased while the badge shows PURGE.
    const method = getHttpMethod(request).trim().toUpperCase();
    const options: RequestInit = {
      method,
      headers: this.buildHeaders(request),
      signal: AbortSignal.timeout(timeout)
    };

    const body = getHttpBody(request);
    if (body && !BODYLESS_METHODS.includes(method)) {
      options.body = await this.buildBody(request);
    }

    return options;
  }

  private buildHeaders(request: HttpRequest): HeadersInit {
    const headers: Record<string, string> = {};
    const requestHeaders = getHttpHeaders(request);
    const body = getHttpBody(request);
    const auth = getRequestAuth(request);

    if (requestHeaders) {
      requestHeaders.forEach((header) => {
        if (!header.disabled && header.name && header.value) {
          headers[header.name] = header.value;
        }
      });
    }

    // Auto-set Content-Type for JSON bodies if not already set
    if (body && 'type' in body && body.type === 'json') {
      const hasContentType = requestHeaders?.some((h) =>
        !h.disabled && h.name.toLowerCase() === 'content-type'
      );
      if (!hasContentType) {
        headers['Content-Type'] = 'application/json';
      }
    }

    // Let the browser set multipart/form-data with its boundary — drop any manual one.
    if (body && 'type' in body && body.type === 'multipart-form') {
      Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() === 'content-type') delete headers[key];
      });
    }

    if (auth) {
      this.setAuthHeaders(headers, auth);
    }

    return headers;
  }

  private setAuthHeaders(headers: Record<string, string>, auth: any) {
    switch (auth.type) {
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = btoa(`${auth.username}:${auth.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'bearer':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        break;
      case 'apikey':
        if (auth.key && auth.value) {
          if (auth.placement === 'header') {
            headers[auth.key] = auth.value;
          }
        }
        break;
    }
  }

  private async buildBody(request: HttpRequest): Promise<BodyInit | null> {
    const body = getHttpBody(request);
    const headers = getHttpHeaders(request);

    if (!body) return null;

    if ('type' in body) {
      switch (body.type) {
        case 'json':
          return stripJsonComments(body.data).replace(/,(\s*[\]}])/g, '$1');
        case 'text':
        case 'xml':
        case 'sparql':
          return body.data;
        case 'form-urlencoded':
          if ('data' in body && Array.isArray(body.data)) {
            return this.buildUrlEncodedBody(body.data);
          }
          return null;
        case 'multipart-form':
          if ('data' in body && Array.isArray(body.data)) {
            return this.buildMultipartBody(body.data);
          }
          return null;
        case 'file':
          // Browser can't read a local file path — send no file body.
          return null;
        default:
          return null;
      }
    } else if (Array.isArray(body)) {
      if (headers?.some((h) => h.name.toLowerCase() === 'content-type' && h.value === 'application/x-www-form-urlencoded')) {
        return this.buildUrlEncodedBody(body);
      } else {
        return this.buildFormDataBody(body);
      }
    }

    return null;
  }

  private buildUrlEncodedBody(data: any[]): string {
    const params = new URLSearchParams();
    data.forEach((item) => {
      if (item.disabled !== true && item.name) {
        params.append(item.name, item.value || '');
      }
    });
    return params.toString();
  }

  private buildFormDataBody(data: any[]): FormData {
    const formData = new FormData();
    data.forEach((item) => {
      if (item.disabled !== true && item.name) {
        if (item.type === 'file' && item.value instanceof File) {
          formData.append(item.name, item.value);
        } else {
          formData.append(item.name, item.value || '');
        }
      }
    });
    return formData;
  }

  private buildMultipartBody(entries: any[]): FormData {
    const formData = new FormData();
    entries.forEach((entry) => {
      // File fields only carry a local path the browser can't read — omit them.
      if (entry.disabled === true || !entry.name || entry.type === 'file') return;
      const values = Array.isArray(entry.value) ? entry.value : [entry.value];
      values.forEach((value: any) => formData.append(entry.name, value ?? ''));
    });
    return formData;
  }

  private async parseResponse(response: Response) {
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    // Read the size off the ArrayBuffer directly — no full Buffer copy needed just to measure.
    const size = arrayBuffer.byteLength;
    const buffer = Buffer.from(arrayBuffer);

    // Sniff the real type from the bytes (the header can be absent or wrong).
    const detectedContentType = detectContentTypeFromBytes(buffer);
    const isBinary = detectedContentType != null && isByteFormatContentType(detectedContentType);
    const isLarge = size > RESPONSE_LARGE_THRESHOLD;

    // Binary bytes don't decode to meaningful text — previews read `base64Data` instead.
    let data: any;
    if (!isBinary) {
      const text = buffer.toString('utf-8');
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      } else {
        data = text;
      }
    }

    // base64 backs binary previews/byte views and the download/copy actions, and is the faithful
    // source when `data` can't reproduce the bytes (parsed JSON loses precision; non-ASCII bodies
    // aren't round-trippable). A small plain-text/SVG string body carries its own bytes, so skip the
    // redundant copy — but oversized bodies are still encoded here, since they're actioned
    // (download/copy) from the reveal warning; only their formatting is deferred.
    const isReconstructableText
      = (detectedContentType === 'text/plain' || detectedContentType === 'image/svg+xml')
        && typeof data === 'string';
    const base64Data = isReconstructableText && !isLarge ? undefined : buffer.toString('base64');

    return { data, size, base64Data, detectedContentType };
  }

  private parseHeaders(headers: Headers): Record<string, any> {
    const result: Record<string, any> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
