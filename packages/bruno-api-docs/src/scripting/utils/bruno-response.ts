import { Buffer } from 'buffer';
import { cloneDeep } from 'lodash-es';
import { get } from './query-get';
import { createResponseHeaderList, type ResponseHeaderList, type HeadersRecord } from './header-list';
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
  headerList: ResponseHeaderList;

  constructor(res: ResponseData | null | undefined) {
    this.res = res ?? null;
    this.status = res ? (res.status ?? null) : null;
    this.statusText = res ? (res.statusText ?? null) : null;
    this.headers = res ? (res.headers ?? null) : null;
    this.body = res ? (res.data ?? null) : null;
    this.responseTime = res ? (res.duration ?? null) : null;
    this.url = res?.url ?? null;

    this.headerList = createResponseHeaderList(() => this.res?.headers);

    const callable = (path: string, ...fns: QueryArg[]): JsonValue | undefined => get(this.body, path, ...fns);
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
    const headers = this.res?.headers;
    if (typeof name !== 'string' || !headers) {
      return null;
    }
    const match = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return match ? headers[match] : null;
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

    let dataBuffer: Buffer;
    if (clonedData == null) {
      dataBuffer = Buffer.from('');
    } else if (typeof clonedData === 'string') {
      dataBuffer = Buffer.from(clonedData);
    } else {
      try {
        dataBuffer = Buffer.from(JSON.stringify(clonedData));
      } catch {
        dataBuffer = Buffer.from('');
      }
    }

    res.dataBuffer = dataBuffer;
    res.base64Data = dataBuffer.toString('base64');
    res.size = dataBuffer.length;
  }

  getSize() {
    const res = this.res;
    if (!res) {
      return { header: 0, body: 0, total: 0 };
    }

    const { data, dataBuffer, headers } = res;
    let bodySize = 0;

    if (Buffer.isBuffer(dataBuffer)) {
      bodySize = dataBuffer.length;
    } else {
      const contentLength = headers?.['content-length'] ?? headers?.['Content-Length'];
      if (contentLength != null && !isNaN(Number(contentLength))) {
        bodySize = parseInt(String(contentLength), 10);
      } else if (data != null) {
        const raw = typeof data === 'string' ? data : JSON.stringify(data);
        bodySize = Buffer.byteLength(raw);
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

  getDataBuffer() {
    return this.res ? (this.res.dataBuffer ?? null) : null;
  }
}

export type CallableResponse = BrunoResponse & ((path: string, ...fns: QueryArg[]) => JsonValue | undefined);

export default BrunoResponse;
