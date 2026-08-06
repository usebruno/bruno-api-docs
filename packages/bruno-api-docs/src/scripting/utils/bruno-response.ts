import { Buffer } from 'buffer';
import { cloneDeep } from 'lodash-es';
import { get } from './query-get';
import { createResponseHeaderList, type ResponseHeaderList } from './header-list';

class BrunoResponse {
  res: any;
  status: number | null;
  statusText: string | null;
  headers: any;
  body: any;
  responseTime: number | null;
  url: string | null;
  headerList: ResponseHeaderList;

  constructor(res: any) {
    this.res = res;
    this.status = res ? res.status : null;
    this.statusText = res ? res.statusText : null;
    this.headers = res ? res.headers : null;
    this.body = res ? res.data : null;
    this.responseTime = res ? (res.responseTime ?? res.duration ?? null) : null;
    this.url = res
      ? (res.url ?? (res.request ? res.request.protocol + '//' + res.request.host + res.request.path : null))
      : null;

    this.headerList = createResponseHeaderList(() => this.res?.headers);

    // Make the instance callable
    const callable = (...args: any[]) => get(this.body, args[0], ...args.slice(1));
    Object.setPrototypeOf(callable, this.constructor.prototype);
    Object.assign(callable, this);

    return callable as any;
  }

  getStatus() {
    return this.res ? this.res.status : null;
  }

  getStatusText() {
    return this.res ? this.res.statusText : null;
  }

  getHeader(name: string) {
    if (typeof name !== 'string' || !this.res?.headers) {
      return null;
    }
    const headers = this.res.headers;
    if (name.toLowerCase() in headers) return headers[name.toLowerCase()];
    const match = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    return match ? headers[match] : undefined;
  }

  getHeaders() {
    return this.res ? this.res.headers : null;
  }

  getBody() {
    return this.res ? this.res.data : null;
  }

  getResponseTime() {
    return this.res ? (this.res.responseTime ?? this.res.duration ?? null) : null;
  }

  getUrl() {
    return this.res ? this.url : null;
  }

  setBody(data: any) {
    if (!this.res) {
      return;
    }

    const clonedData = cloneDeep(data);
    this.res.data = clonedData;
    this.body = clonedData;

    if (clonedData === null || clonedData === undefined) {
      this.res.dataBuffer = Buffer.from('');
    } else if (typeof clonedData === 'string') {
      this.res.dataBuffer = Buffer.from(clonedData);
    } else {
      try {
        this.res.dataBuffer = Buffer.from(JSON.stringify(clonedData));
      } catch {
        this.res.dataBuffer = Buffer.from('');
      }
    }
  }

  // TODO: Refactor: dataBuffer size calculation should be handled in a shared utility so it can be passed and reused across the application
  getSize() {
    if (!this.res) {
      return { header: 0, body: 0, total: 0 };
    }

    const { data, dataBuffer, headers } = this.res;
    let bodySize = 0;

    // Use raw received bytes
    if (Buffer.isBuffer(dataBuffer)) {
      bodySize = dataBuffer.length;
    } else {
      // Use server-reported Content-Length
      const contentLength = headers && (headers['content-length'] || headers['Content-Length']);
      if (contentLength && !isNaN(contentLength)) {
        bodySize = parseInt(contentLength, 10);
      } else if (data != null) {
        // Manual calculation
        const raw = typeof data === 'string' ? data : JSON.stringify(data);
        bodySize = Buffer.byteLength(raw);
      }
    }

    const headerLines = [
      `HTTP/1.1 ${this.res.status} ${this.res.statusText}`,
      ...Object.entries(this.res.headers || {}).flatMap(([key, value]) =>
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
    return this.res ? this.res.dataBuffer : null;
  }
}

export default BrunoResponse;
