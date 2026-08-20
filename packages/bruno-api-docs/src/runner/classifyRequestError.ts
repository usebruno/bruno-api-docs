/**
 * Classifies a failed try-it request (one that never produced an HTTP response)
 * into a user-facing title + message.
 *
 * Browser `fetch` collapses CORS, DNS, connection-refused, offline, and TLS into
 * one opaque failure with no detail — the real cause lives only in devtools and
 * is unreadable by the page. So we classify from the REQUEST CONTEXT (did it time
 * out, the page vs target scheme, and same-origin vs cross-origin / file) rather
 * than from the error text.
 *
 * Origin (scheme + host + port), not site, is what decides cross-origin: a request
 * from https://docs.example.com to https://api.example.com is cross-origin and
 * triggers CORS even though both share the site example.com. Comparing by origin
 * matches how the browser actually enforces CORS.
 *
 * NOTE: 4xx/5xx responses are NOT failures — they never reach this function.
 */

import type { DigestBuildFailure } from './utils/digest-auth';

export type RequestErrorType
  = | 'timeout'
    | 'mixed-content'
    | 'browser-blocked'
    | 'unreachable'
    | 'unknown'
    | 'digest-challenge-unreadable'
    | 'digest-malformed-challenge'
    | 'digest-unsupported-algorithm'
    | 'digest-unsupported-qop'
    | 'digest-redirected-challenge';

export interface ClassifiedRequestError {
  type: RequestErrorType;
  title: string;
  message: string;
}

interface ClassifyOptions {
  /** The request timeout in milliseconds (reserved for future use / parity). */
  timeoutMs?: number;
  /** The fully-resolved request URL passed to fetch (after variable interpolation). */
  requestUrl?: string;
  /** The page URL the docs are running on, typically window.location.href. */
  pageUrl?: string;
}

export type DigestFailureReason = DigestBuildFailure | 'challenge-unreadable' | 'redirected-challenge';

export class DigestAuthError extends Error {
  readonly reason: DigestFailureReason;

  constructor(reason: DigestFailureReason) {
    super(`Digest authentication failed: ${reason}`);
    this.name = 'DigestAuthError';
    this.reason = reason;
  }
}

export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * `AbortSignal.timeout()` rejects with a DOMException named `TimeoutError`.
 * A manual `AbortController.abort()` rejects with one named `AbortError`.
 * Older engines surface neither name cleanly, so we also sniff the message.
 */
const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;
  const msg = error.message.toLowerCase();
  return msg.includes('timed out') || msg.includes('timeout');
};

/**
 * The opaque network failure, one phrase per engine (plus undici's `fetch
 * failed`, for a non-DOM runtime).
 *
 * Matched as whole phrases rather than by sniffing for "fetch", because not
 * every `TypeError` mentioning fetch is a network failure. A forbidden method
 * (TRACE/CONNECT/TRACK) is rejected before any connection is made, and the
 * browser says exactly why: "Failed to execute 'fetch' on 'Window': 'TRACE'
 * HTTP method is unsupported." (Chrome), "Window.fetch: Invalid request method
 * TRACE." (Firefox), "Method is forbidden." (Safari). Those must reach the
 * reader rather than be replaced by a guess about CORS.
 */
const OPAQUE_FETCH_FAILURE_MESSAGES = [
  'failed to fetch',
  'networkerror when attempting to fetch resource',
  'load failed',
  'fetch failed'
];

const isOpaqueFetchFailure = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name !== 'TypeError') return false;
  const msg = error.message.toLowerCase();
  return OPAQUE_FETCH_FAILURE_MESSAGES.some((opaqueMessage) => msg.includes(opaqueMessage));
};

const safeParseUrl = (url?: string): URL | null => {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const TIMEOUT: ClassifiedRequestError = {
  type: 'timeout',
  title: 'Request timed out',
  message: 'Request timed out. The server didn\'t respond in time.'
};

const MIXED_CONTENT: ClassifiedRequestError = {
  type: 'mixed-content',
  title: 'Request blocked',
  message:
    'Request blocked: this page is secure (https) but the URL is insecure (http). '
    + 'Use an https URL, or run it from the Bruno desktop app.'
};

const BROWSER_BLOCKED: ClassifiedRequestError = {
  type: 'browser-blocked',
  title: 'Request blocked',
  message:
    'Request blocked by your browser, usually CORS: the API didn\'t allow requests '
    + 'from this page. Try it in the Bruno desktop app.'
};

const UNREACHABLE: ClassifiedRequestError = {
  type: 'unreachable',
  title: 'Couldn\'t reach the server',
  message: 'Couldn\'t reach the server. It may be down, or the URL may be wrong.'
};

const DIGEST_FAILURES: Record<DigestFailureReason, ClassifiedRequestError> = {
  'challenge-unreadable': {
    type: 'digest-challenge-unreadable',
    title: 'Couldn\'t read the digest challenge',
    message:
      'The browser couldn\'t read a WWW-Authenticate header on this response — either the '
      + 'server didn\'t send one, or it sent one without exposing it. If the server does use '
      + 'digest auth, it must send "Access-Control-Expose-Headers: WWW-Authenticate". '
      + 'Try it in the Bruno desktop app.'
  },
  'malformed-challenge': {
    type: 'digest-malformed-challenge',
    title: 'Couldn\'t complete digest auth',
    message: 'The server\'s digest challenge was missing its realm or nonce, so a response couldn\'t be computed.'
  },
  'unsupported-algorithm': {
    type: 'digest-unsupported-algorithm',
    title: 'Unsupported digest algorithm',
    message: 'Only MD5 digest auth is supported. The server asked for a different algorithm.'
  },
  'unsupported-qop': {
    type: 'digest-unsupported-qop',
    title: 'Unsupported digest protection',
    message: 'The server only accepts a digest protection mode other than qop="auth" (such as auth-int), which is not supported. Try it in the Bruno desktop app.'
  },
  'redirected-challenge': {
    type: 'digest-redirected-challenge',
    title: 'Digest challenge came from another origin',
    message:
      'The request was redirected to a different origin before the digest challenge arrived. '
      + 'Answering it would send credential material to a server other than the one requested, so the attempt was stopped.'
  }
};

export const classifyRequestError = (
  error: unknown,
  options: ClassifyOptions = {}
): ClassifiedRequestError => {
  if (error instanceof DigestAuthError) {
    return DIGEST_FAILURES[error.reason];
  }

  if (isTimeoutError(error)) {
    return TIMEOUT;
  }

  if (isOpaqueFetchFailure(error)) {
    const target = safeParseUrl(options.requestUrl);
    const page = safeParseUrl(options.pageUrl);

    // Without a parseable target URL we can't reason about scheme/origin, so we
    // fall through to the underlying message rather than guess.
    if (target && page) {
      // Secure page requesting an insecure URL -> the browser blocks it as mixed content.
      if (page.protocol === 'https:' && target.protocol === 'http:') {
        return MIXED_CONTENT;
      }

      // Docs opened from a file have origin "null"; any cross-origin request is
      // subject to CORS. Same-origin failures can't be CORS, so the server is
      // unreachable (down, or wrong URL).
      const openedFromFile = page.origin === 'null' || page.protocol === 'file:';
      if (openedFromFile || target.origin !== page.origin) {
        return BROWSER_BLOCKED;
      }

      return UNREACHABLE;
    }
  }

  // Anything else (or an unparseable URL): surface the underlying error message.
  const rawMessage
    = error instanceof Error && error.message ? error.message : 'The request could not be completed.';

  return {
    type: 'unknown',
    title: 'Couldn\'t complete the request',
    message: rawMessage
  };
};
