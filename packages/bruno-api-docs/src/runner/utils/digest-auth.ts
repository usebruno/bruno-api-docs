import { md5 } from 'js-md5';

export interface DigestChallenge {
  [key: string]: string | undefined;
  realm?: string;
  nonce?: string;
  qop?: string;
  opaque?: string;
  algorithm?: string;
}

export type DigestBuildFailure = 'malformed-challenge' | 'unsupported-algorithm' | 'unsupported-qop';

export type DigestAuthResult
  = | { ok: true; header: string }
    | { ok: false; reason: DigestBuildFailure };

export interface BuildDigestOptions {
  challenge: DigestChallenge;
  method: string;
  uri: string;
  username: string;
  password: string;
  cnonce?: string;
}

export interface DigestCredentials {
  username: string;
  password: string;
}

export const getDigestCredentials = (auth: Record<string, unknown> | undefined): DigestCredentials | null => {
  if (auth?.type !== 'digest' || typeof auth.username !== 'string' || auth.username === '') {
    return null;
  }
  return { username: auth.username, password: typeof auth.password === 'string' ? auth.password : '' };
};

export interface ParsedChallenge {
  scheme: string;
  params: DigestChallenge;
}

// A WWW-Authenticate value is a comma-separated list, but commas can also appear
// inside quoted values (realm="a, b" or qop="auth-int,auth"). A plain split(',')
// would cut those values apart, so this only splits on commas that sit outside quotes.
const splitOnUnquotedCommas = (input: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === '\\' && inQuotes && i + 1 < input.length) {
      // Backslash escapes the next character (e.g. \" inside a quoted value), so
      // take both characters now and skip ahead — the quote must not end the string.
      current += ch + input[i + 1];
      i += 1;
    } else if (ch === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
};

const unquote = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  return trimmed;
};

const SCHEME_PREFIX = /^([A-Za-z][A-Za-z0-9._~+/-]*)\s+(.*)$/;

export const parseChallenges = (header: string): ParsedChallenge[] => {
  const challenges: ParsedChallenge[] = [];
  let current: ParsedChallenge | null = null;

  const addParam = (target: ParsedChallenge | null, pair: string): void => {
    const idx = pair.indexOf('=');
    if (idx === -1 || target === null) return;
    const key = pair.substring(0, idx).trim().toLowerCase();
    if (key) target.params[key] = unquote(pair.substring(idx + 1));
  };

  splitOnUnquotedCommas(header).forEach((part) => {
    const prefixed = SCHEME_PREFIX.exec(part);
    if (prefixed && !prefixed[2].startsWith('=') && prefixed[2].includes('=')) {
      current = { scheme: prefixed[1].toLowerCase(), params: {} };
      challenges.push(current);
      addParam(current, prefixed[2]);
    } else if (!part.includes('=')) {
      current = { scheme: part.toLowerCase(), params: {} };
      challenges.push(current);
    } else {
      addParam(current, part);
    }
  });

  return challenges;
};

const isSupportedAlgorithm = (challenge: DigestChallenge): boolean =>
  !challenge.algorithm || challenge.algorithm.toUpperCase() === 'MD5';

export const findDigestChallenge = (header: string): DigestChallenge | null => {
  const digests = parseChallenges(header).filter((challenge) => challenge.scheme === 'digest');
  if (digests.length === 0) return null;
  const supported = digests.find((challenge) => isSupportedAlgorithm(challenge.params));
  return (supported ?? digests[0]).params;
};

const hasQopAuth = (qop: string | undefined): boolean =>
  Boolean(qop && qop.split(',').map((q) => q.trim().toLowerCase()).includes('auth'));

const randomCnonce = (): string => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const quote = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const hasControlChars = (value: string): boolean =>
  Array.from(value).some((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f;
  });

export const buildDigestAuthorization = (options: BuildDigestOptions): DigestAuthResult => {
  const { challenge, method, uri, username, password, cnonce = randomCnonce() } = options;

  if (!challenge.realm || !challenge.nonce) {
    return { ok: false, reason: 'malformed-challenge' };
  }

  if ([challenge.realm, challenge.nonce, challenge.opaque ?? ''].some(hasControlChars)) {
    return { ok: false, reason: 'malformed-challenge' };
  }

  if (challenge.algorithm && challenge.algorithm.toUpperCase() !== 'MD5') {
    return { ok: false, reason: 'unsupported-algorithm' };
  }

  const useQop = hasQopAuth(challenge.qop);
  if (challenge.qop && !useQop) {
    return { ok: false, reason: 'unsupported-qop' };
  }

  const nc = '00000001';
  const ha1 = md5(`${username}:${challenge.realm}:${password}`);
  const ha2 = md5(`${method.toUpperCase()}:${uri}`);
  const response = useQop
    ? md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`)
    : md5(`${ha1}:${challenge.nonce}:${ha2}`);

  const fields = [
    `username=${quote(username)}`,
    `realm=${quote(challenge.realm)}`,
    `nonce=${quote(challenge.nonce)}`,
    `uri=${quote(uri)}`,
    `response=${quote(response)}`
  ];

  if (useQop) {
    fields.push('qop=auth', 'algorithm=MD5', `nc=${nc}`, `cnonce=${quote(cnonce)}`);
  }

  if (challenge.opaque) {
    fields.push(`opaque=${quote(challenge.opaque)}`);
  }

  return { ok: true, header: `Digest ${fields.join(', ')}` };
};
