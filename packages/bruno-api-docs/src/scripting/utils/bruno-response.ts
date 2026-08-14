import { Buffer } from 'buffer';
import { cloneDeep } from 'lodash-es';
import { get } from './query-get';
import { createResponseHeaderList, type HeaderList, type HeadersRecord } from './header-list';
import type { RunRequestResponse } from '../../runner';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ResponseData = RunRequestResponse;

export type QueryArg = ((item: JsonValue) => boolean | JsonValue) | Record<string, JsonValue>;

class BrunoResponse {
  res: ResponseData | null;
  status: number | null;
  statusText: string | null;
  headers: HeadersRecord | null;
  body: JsonValue | null;
  responseTime: number | null;
  url: string | null;
  headerList: HeaderList;
  private bodyReplaced: boolean;

  constructor(res: ResponseData | null | undefined) {
    this.res = res ?? null;
    this.status = res ? (res.status ?? null) : null;
    this.statusText = res ? (res.statusText ?? null) : null;
    this.headers = res ? (res.headers ?? null) : null;
    this.body = res ? (res.data ?? null) : null;
    this.responseTime = res ? (res.duration ?? null) : null;
    this.url = res?.url ?? null;
    this.bodyReplaced = false;

    this.headerList = createResponseHeaderList(() => this.res?.headers);

    const callable = (path: string, ...fns: QueryArg[]): JsonValue | undefined => get(this.getBody(), path, ...fns);
    Object.setPrototypeOf(callable, this.constructor.prototype);
    return Object.assign(callable, this);
  }

  getStatus() {
    return this.res ? (this.res.status ?? null) : null;
  }

  getStatusText() {
    return this.res ? (this.res.statusText ?? null) : null;
  }

  getHeader(name: string) {
    if (typeof name !== 'string') {
      return null;
    }
    return this.headerList.get(name) ?? null;
  }

  getHeaders() {
    return this.res ? (this.res.headers ?? null) : null;
  }

  getBody() {
    return this.res ? (this.res.data ?? null) : null;
  }

  getResponseTime() {
    return this.res ? (this.res.duration ?? null) : null;
  }

  getUrl() {
    return this.res ? this.url : null;
  }

  setBody(data: JsonValue) {
    const res = this.res;
    if (!res) {
      return;
    }

    const clonedData = cloneDeep(data);
    res.data = clonedData;
    this.body = clonedData;
    this.bodyReplaced = true;
    res.base64Data = undefined;
    res.size = this.bodyByteLength(clonedData);
  }

  private bodyByteLength(value: JsonValue | undefined): number {
    if (value == null) return 0;
    try {
      return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
    } catch {
      return 0;
    }
  }

  getSize() {
    const res = this.res;
    if (!res) {
      return { header: 0, body: 0, total: 0 };
    }

    const { data, headers } = res;

    let bodySize = 0;
    if (this.bodyReplaced) {
      bodySize = this.bodyByteLength(data);
    } else {
      const contentLength = this.headerList.get('content-length');
      const parsedLength = contentLength != null ? parseInt(String(contentLength), 10) : NaN;
      if (!isNaN(parsedLength)) {
        bodySize = parsedLength;
      } else if (data != null) {
        bodySize = this.bodyByteLength(data);
      }
    }

    const headerLines = [
      `HTTP/1.1 ${res.status} ${res.statusText}`,
      ...Object.entries(headers || {}).flatMap(([key, value]) =>
        Array.isArray(value)
          ? value.map((v) => `${key}: ${v}`)
          : [`${key}: ${value}`]
      ),
      '',
      ''
    ];
    const headerSize = Buffer.byteLength(headerLines.join('\r\n'));

    return { header: headerSize, body: bodySize, total: headerSize + bodySize };
  }
}

export type CallableResponse = BrunoResponse & ((path: string, ...fns: QueryArg[]) => JsonValue | undefined);

export default BrunoResponse;
