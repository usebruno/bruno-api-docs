export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer | null;
}

export interface Conditional {
  ifNoneMatch?: string;
}
