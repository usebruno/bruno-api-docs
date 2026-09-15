import crypto from 'node:crypto';

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer | null;
}

export interface Conditional {
  ifNoneMatch?: string;
}

/** Both halves validate the same way: hash what will be served, compare it next time. */
export const etagOf = (data: string | Buffer): string =>
  '"' + crypto.createHash('sha256').update(data).digest('hex').slice(0, 32) + '"';
