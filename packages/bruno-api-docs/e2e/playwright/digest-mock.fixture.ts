import crypto from 'node:crypto';
import { test as base } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

export interface DigestMockOptions {
  username?: string;
  password?: string;
  realm?: string;
  qop?: 'auth' | null;
  exposeChallenge?: boolean;
  sendChallenge?: boolean;
  challengeOverride?: string;
}

export interface RecordedRequest {
  method: string;
  authorization: string | null;
  postData: string | null;
}

const md5 = (input: string) => crypto.createHash('md5').update(input).digest('hex');

const parseAuthHeader = (header: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  header.replace(/^Digest\s+/i, '').split(',').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    fields[pair.substring(0, idx).trim().toLowerCase()] = pair.substring(idx + 1).trim().replace(/"/g, '');
  });
  return fields;
};

export class DigestMock {
  readonly requests: RecordedRequest[] = [];
  private readonly issuedNonces = new Set<string>();

  private readonly username: string;
  private readonly password: string;
  private readonly realm: string;
  private readonly qop: 'auth' | null;
  private readonly exposeChallenge: boolean;
  private readonly sendChallenge: boolean;
  private readonly challengeOverride?: string;

  constructor(options: DigestMockOptions = {}) {
    this.username = options.username ?? 'user';
    this.password = options.password ?? 'pass';
    this.realm = options.realm ?? 'digest-lab';
    this.qop = options.qop === undefined ? 'auth' : options.qop;
    this.exposeChallenge = options.exposeChallenge ?? true;
    this.sendChallenge = options.sendChallenge ?? true;
    this.challengeOverride = options.challengeOverride;
  }

  async install(page: Page, pattern = '**://localhost:8081/**'): Promise<void> {
    await page.route(pattern, (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();

    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? 'authorization, content-type'
        }
      });
    }

    const authorization = request.headers()['authorization'] ?? null;
    this.requests.push({ method: request.method(), authorization, postData: request.postData() });

    if (authorization && this.verify(authorization, request.method(), new URL(request.url()))) {
      return route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticated: true })
      });
    }

    return this.challenge(route);
  }

  private challenge(route: Route): Promise<void> {
    const nonce = crypto.randomBytes(16).toString('hex');
    this.issuedNonces.add(nonce);
    const overrideNonce = this.challengeOverride && /nonce="([^"]+)"/.exec(this.challengeOverride);
    if (overrideNonce) this.issuedNonces.add(overrideNonce[1]);
    const digestChallenge
      = `Digest realm="${this.realm}", nonce="${nonce}", opaque="deadbeef", algorithm=MD5`
        + (this.qop ? ', qop="auth"' : '');
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };
    if (this.sendChallenge) {
      headers['WWW-Authenticate'] = this.challengeOverride ?? digestChallenge;
    }
    if (this.exposeChallenge) {
      headers['Access-Control-Expose-Headers'] = 'WWW-Authenticate';
    }
    return route.fulfill({ status: 401, headers, body: JSON.stringify({ challenged: true }) });
  }

  private verify(authorization: string, method: string, url: URL): boolean {
    const fields = parseAuthHeader(authorization);
    if (!fields.nonce || !this.issuedNonces.has(fields.nonce)) return false;
    const uri = url.pathname + url.search;
    const ha1 = md5(`${this.username}:${this.realm}:${this.password}`);
    const ha2 = md5(`${method}:${uri}`);
    const expected = fields.qop
      ? md5(`${ha1}:${fields.nonce}:${fields.nc}:${fields.cnonce}:auth:${ha2}`)
      : md5(`${ha1}:${fields.nonce}:${ha2}`);
    return fields.response === expected && fields.username === this.username;
  }
}

export const test = base.extend<{
  digestMock: (options?: DigestMockOptions) => Promise<DigestMock>;
}>({
  digestMock: async ({ page }, use) => {
    await use(async (options?: DigestMockOptions) => {
      const mock = new DigestMock(options);
      await mock.install(page);
      return mock;
    });
  }
});
