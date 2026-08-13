import type { HttpRequestHeader, HttpRequestParam, HttpRequestBody } from '@opencollection/types/requests/http';
import type { Tag } from '@opencollection/types/common/tags';
import {
  getRequestUrl,
  getHttpMethod,
  getHttpHeaders,
  getHttpBody,
  getHttpParams,
  getRequestAuth,
  getItemName,
  type InternalHttpRequest
} from '../../utils/schemaHelpers';
import { createRequestHeaderList, type HeaderList } from './header-list';
import type { JsonValue } from './bruno-response';

const RAW_BODY_TYPES = ['json', 'text', 'xml', 'sparql'] as const;

const sameName = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

class BrunoRequest {
  req: InternalHttpRequest;
  url: string;
  method: string;
  timeout: number | 'inherit' | undefined;
  name: string | undefined;
  pathParams: Array<{ name: string; value: string; type: string }>;
  tags: Tag[];
  body: JsonValue | undefined;
  headerList: HeaderList;
  private warnings: string[] | undefined;

  constructor(req: InternalHttpRequest, warnings?: string[]) {
    this.req = req;
    this.warnings = warnings;
    this.headerList = createRequestHeaderList(() => this.headersArray());
    this.url = getRequestUrl(req);
    this.method = getHttpMethod(req);
    this.timeout = this.getTimeout();
    this.name = this.getName();
    this.pathParams = this.getPathParams();
    this.tags = this.getTags();

    if (this.isJsonBody()) {
      const raw = this.getBodyData();
      if (typeof raw === 'string') this.body = this.__safeParseJSON(raw) as JsonValue;
    }
  }

  getUrl() {
    return getRequestUrl(this.req);
  }

  setUrl(url: string) {
    this.url = url;
    this.http().url = url;
  }

  getHost() {
    try {
      return new URL(this.getUrl()).host;
    } catch {
      return '';
    }
  }

  getPath() {
    try {
      const url = new URL(this.getUrl());
      const pathParams = this.pathParamList();
      if (!pathParams.length) return url.pathname;

      return url.pathname
        .split('/')
        .map((segment) => {
          if (!segment.startsWith(':')) return segment;
          const param = pathParams.find((p) => p.name === segment.slice(1));
          const usable = param
            && param.disabled !== true
            && param.value != null
            && (typeof param.value !== 'string' || param.value.trim() !== '');
          return usable ? param.value : segment;
        })
        .join('/');
    } catch {
      return '';
    }
  }

  getQueryString() {
    try {
      const { search } = new URL(this.getUrl());
      return search ? search.substring(1) : '';
    } catch {
      return '';
    }
  }

  getMethod() {
    return getHttpMethod(this.req);
  }

  getAuthMode(): string {
    const auth = getRequestAuth(this.req);
    if (auth && typeof auth === 'object' && typeof auth.type === 'string' && auth.type !== 'none') {
      return auth.type;
    }
    const authHeader = this.getHeader('Authorization');
    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer')) return 'bearer';
      if (authHeader.startsWith('Basic')) return 'basic';
    }
    if (this.getHeader('X-WSSE') != null) return 'wsse';
    return 'none';
  }

  setMethod(method: string) {
    this.method = method;
    this.http().method = method;
  }

  get headers(): Record<string, string> {
    return this.getHeaders();
  }

  getHeaders() {
    return this.headerList.toObject(true) as Record<string, string>;
  }

  setHeaders(headers: Record<string, string>) {
    const list = this.headersArray();
    const disabled = list.filter((h) => h.disabled);
    list.length = 0;
    disabled.forEach((h) => list.push(h));
    Object.entries(headers || {}).forEach(([name, value]) => list.push({ name, value: String(value ?? '') }));
  }

  getHeader(name: string) {
    const header = getHttpHeaders(this.req).find((h) => !h.disabled && sameName(h.name, name));
    return header ? header.value : undefined;
  }

  setHeader(name: string, value: string) {
    const list = this.headersArray();
    const existing = list.find((h) => !h.disabled && sameName(h.name, name));
    if (existing) {
      existing.value = String(value ?? '');
    } else {
      list.push({ name, value: String(value ?? '') });
    }
  }

  deleteHeader(name: string) {
    const list = this.headersArray();
    for (let i = list.length - 1; i >= 0; i--) {
      if (sameName(list[i].name, name)) list.splice(i, 1);
    }
  }

  deleteHeaders(names: string[]) {
    names.forEach((name) => this.deleteHeader(name));
  }

  getBody(options: { raw?: boolean } = {}): JsonValue | HttpRequestBody['data'] | undefined {
    const data = this.getBodyData();
    if (options.raw) return data;
    if (this.isJsonBody() && typeof data === 'string') return this.__safeParseJSON(data) as JsonValue;
    return data;
  }

  setBody(data: JsonValue, options: { raw?: boolean } = {}) {
    const asObject = !options.raw && this.__isObject(data);
    const isJson = asObject || this.isJsonBody();
    const serialized = asObject || typeof data !== 'string' ? this.__safeStringifyJSON(data) : data;
    this.writeBodyData(serialized, isJson);
    this.body = data;
  }

  setMaxRedirects() {
    this.addWarning('req.setMaxRedirects');
  }

  onFail() {
    this.addWarning('req.onFail');
  }

  getTimeout() {
    return this.req.settings?.timeout ?? this.req.timeout;
  }

  setTimeout(timeout: number) {
    this.timeout = timeout;
    this.settings().timeout = timeout;
  }

  disableParsingResponseJson() {
    this.req.__brunoDisableParsingResponseJson = true;
  }

  getExecutionMode() {
    return this.req.__bruno__executionMode;
  }

  getName() {
    return getItemName(this.req);
  }

  getPathParams() {
    return this.pathParamList().map((p) => ({ name: p.name, value: p.value, type: p.type }));
  }

  private pathParamList(): HttpRequestParam[] {
    return (getHttpParams(this.req) as HttpRequestParam[]).filter((p) => p.type === 'path');
  }

  getTags(): Tag[] {
    return this.req.info?.tags ?? (this.req as { tags?: Tag[] }).tags ?? [];
  }

  private addWarning(api: string) {
    if (!this.warnings) return;
    const message = `${api} is not currently supported in the Bruno playground. Please use the Bruno desktop app.`;
    if (!this.warnings.includes(message)) {
      this.warnings.push(message);
    }
  }

  private http() {
    this.req.http ??= {};
    return this.req.http;
  }

  private settings() {
    this.req.settings ??= {};
    return this.req.settings;
  }

  private headersArray(): HttpRequestHeader[] {
    const http = this.http();
    if (!Array.isArray(http.headers)) http.headers = [];
    return http.headers;
  }

  private isJsonBody(): boolean {
    const body = getHttpBody(this.req);
    if (body && !Array.isArray(body) && body.type === 'json') return true;
    const contentType = getHttpHeaders(this.req)
      .find((h) => !h.disabled && h.name.toLowerCase() === 'content-type')?.value;
    return typeof contentType === 'string' && contentType.toLowerCase().includes('json');
  }

  private getBodyData(): HttpRequestBody['data'] | undefined {
    const body = getHttpBody(this.req);
    return body && !Array.isArray(body) ? body.data : undefined;
  }

  private writeBodyData(data: string, isJson: boolean) {
    const http = this.http();
    const body = http.body;
    if (body && !Array.isArray(body) && (RAW_BODY_TYPES as readonly string[]).includes(body.type)) {
      (body as { data: string }).data = data;
    } else {
      http.body = { type: isJson ? 'json' : 'text', data };
    }
  }

  private __safeParseJSON(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  private __safeStringifyJSON(obj: JsonValue): string {
    try {
      const json = JSON.stringify(obj);
      return json === undefined ? '' : json;
    } catch {
      return String(obj);
    }
  }

  private __isObject(obj: JsonValue): boolean {
    return obj !== null && typeof obj === 'object';
  }
}

export default BrunoRequest;
