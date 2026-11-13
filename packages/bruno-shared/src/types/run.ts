export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Variables = Record<string, JsonValue>;

export type ScriptErrorPhase = 'pre-request' | 'post-response' | 'tests';

export interface ScriptError {
  phase: Exclude<ScriptErrorPhase, 'pre-request'>;
  message: string;
}

export interface TestResultsResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: Array<{
    status: string;
    description: string;
    expected?: JsonValue;
    actual?: JsonValue;
    error?: string;
  }>;
}

export interface AssertionResultsResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: Array<{
    status: string;
    lhsExpr?: string;
    rhsExpr?: string;
    operator?: string;
    rhsOperand?: JsonValue;
    error?: string;
  }>;
}

export interface RunRequestResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: JsonValue;
  /** Present only when needed downstream — binary previews, byte views, or an unreconstructable body. */
  base64Data?: string;
  /** Content type sniffed from the response bytes at parse time (magic numbers → SVG → text), or null. */
  detectedContentType?: string | null;
  size?: number;
  duration?: number;
  url?: string;
  error?: string;
  errorType?: string;
  errorTitle?: string;
  isCancel?: boolean;
  requestId?: string;
  assertionResults?: AssertionResultsResponse;
  testResults?: TestResultsResponse;
  scriptErrors?: ScriptError[];
  warnings?: string[] | null;
  environmentVariables?: { envName: string; variables: Variables; deleted: string[] };
  collectionVariables?: { variables: Variables; deleted: string[] };
}
