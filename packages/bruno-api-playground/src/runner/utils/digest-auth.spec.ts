import { describe, it, expect } from 'vitest';
import { buildDigestAuthorization, findDigestChallenge, getDigestCredentials, parseChallenges } from './digest-auth';

const RFC_CHALLENGE = {
  realm: 'testrealm@host.com',
  qop: 'auth,auth-int',
  nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
  opaque: '5ccc069c403ebaf9f0171e9517f40e41'
};

describe('parseChallenges', () => {
  it('parses a quoted challenge with qop list and unquoted algorithm', () => {
    const header = 'Digest realm="digest-lab", nonce="abc123", opaque="deadbeef", algorithm=MD5, qop="auth"';
    expect(parseChallenges(header)).toEqual([{
      scheme: 'digest',
      params: {
        realm: 'digest-lab',
        nonce: 'abc123',
        opaque: 'deadbeef',
        algorithm: 'MD5',
        qop: 'auth'
      }
    }]);
  });

  it('keeps commas inside quoted values within one parameter', () => {
    const header = 'Digest realm="a, b", nonce="n1", qop="auth-int,auth"';
    expect(parseChallenges(header)).toEqual([{
      scheme: 'digest',
      params: { realm: 'a, b', nonce: 'n1', qop: 'auth-int,auth' }
    }]);
  });

  it('separates multiple challenges merged into one header value', () => {
    const header = 'Basic realm="basic-zone", Digest realm="digest-zone", nonce="n2", qop="auth"';
    expect(parseChallenges(header)).toEqual([
      { scheme: 'basic', params: { realm: 'basic-zone' } },
      { scheme: 'digest', params: { realm: 'digest-zone', nonce: 'n2', qop: 'auth' } }
    ]);
  });

  it('unescapes backslash escapes inside quoted values', () => {
    expect(parseChallenges('Digest realm="say \\"hi\\"", nonce="n"')).toEqual([
      { scheme: 'digest', params: { realm: 'say "hi"', nonce: 'n' } }
    ]);
  });

  it('reads a parameter with whitespace around its = as a parameter, not a scheme', () => {
    expect(parseChallenges('Digest realm="r", qop = "auth", nonce = "n"')).toEqual([
      { scheme: 'digest', params: { realm: 'r', qop: 'auth', nonce: 'n' } }
    ]);
  });
});

describe('findDigestChallenge', () => {
  it('finds the digest challenge when another scheme is listed first', () => {
    const header = 'Basic realm="basic-zone", Digest realm="digest-zone", nonce="n2", qop="auth"';
    expect(findDigestChallenge(header)).toEqual({ realm: 'digest-zone', nonce: 'n2', qop: 'auth' });
  });

  it('prefers the MD5 digest challenge when the server offers several (RFC 7616)', () => {
    const header
      = 'Digest realm="r", nonce="sha", algorithm=SHA-256, qop="auth", '
        + 'Digest realm="r", nonce="md5", algorithm=MD5, qop="auth"';
    expect(findDigestChallenge(header)).toEqual({ realm: 'r', nonce: 'md5', algorithm: 'MD5', qop: 'auth' });
  });

  it('returns the unsupported digest challenge when no MD5 variant exists', () => {
    const header = 'Digest realm="r", nonce="sha", algorithm=SHA-256';
    expect(findDigestChallenge(header)).toEqual({ realm: 'r', nonce: 'sha', algorithm: 'SHA-256' });
  });

  it('returns null when no digest challenge is offered', () => {
    expect(findDigestChallenge('Basic realm="x"')).toBeNull();
    expect(findDigestChallenge('Negotiate')).toBeNull();
  });
});

describe('buildDigestAuthorization', () => {
  it('reproduces the RFC 2617 worked example byte-for-byte', () => {
    const result = buildDigestAuthorization({
      challenge: RFC_CHALLENGE,
      method: 'GET',
      uri: '/dir/index.html',
      username: 'Mufasa',
      password: 'Circle Of Life',
      cnonce: '0a4f113b'
    });
    expect(result).toEqual({
      ok: true,
      header:
        'Digest username="Mufasa", realm="testrealm@host.com", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", '
        + 'uri="/dir/index.html", response="6629fae49393a05397450978507c4ef1", qop=auth, algorithm=MD5, '
        + 'nc=00000001, cnonce="0a4f113b", opaque="5ccc069c403ebaf9f0171e9517f40e41"'
    });
  });

  it('escapes quotes and backslashes in quoted header fields', () => {
    const result = buildDigestAuthorization({
      challenge: { realm: 'realm "x"', nonce: 'n\\1', qop: 'auth' },
      method: 'GET',
      uri: '/',
      username: 'user"with\\quirks',
      password: 'p',
      cnonce: '0a4f113b'
    });
    expect(result.ok).toBe(true);
    const header = (result as { ok: true; header: string }).header;
    expect(header).toContain('username="user\\"with\\\\quirks"');
    expect(header).toContain('realm="realm \\"x\\""');
    expect(header).toContain('nonce="n\\\\1"');
  });

  it('rejects a qop list that does not offer auth', () => {
    expect(buildDigestAuthorization({
      challenge: { ...RFC_CHALLENGE, qop: 'auth-int' },
      method: 'GET',
      uri: '/',
      username: 'u',
      password: 'p'
    })).toEqual({ ok: false, reason: 'unsupported-qop' });
  });

  it('uses the legacy no-qop form when the challenge omits qop', () => {
    const result = buildDigestAuthorization({
      challenge: { realm: RFC_CHALLENGE.realm, nonce: RFC_CHALLENGE.nonce, opaque: RFC_CHALLENGE.opaque },
      method: 'GET',
      uri: '/dir/index.html',
      username: 'Mufasa',
      password: 'Circle Of Life'
    });
    expect(result).toEqual({
      ok: true,
      header:
        'Digest username="Mufasa", realm="testrealm@host.com", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", '
        + 'uri="/dir/index.html", response="670fd8c2df070c60b045671b8b24ff02", opaque="5ccc069c403ebaf9f0171e9517f40e41"'
    });
  });

  it('rejects a challenge missing realm or nonce', () => {
    expect(buildDigestAuthorization({
      challenge: { nonce: 'abc' },
      method: 'GET',
      uri: '/',
      username: 'u',
      password: 'p'
    })).toEqual({ ok: false, reason: 'malformed-challenge' });
    expect(buildDigestAuthorization({
      challenge: { realm: 'r' },
      method: 'GET',
      uri: '/',
      username: 'u',
      password: 'p'
    })).toEqual({ ok: false, reason: 'malformed-challenge' });
  });

  it('rejects non-MD5 algorithms like the desktop app does', () => {
    expect(buildDigestAuthorization({
      challenge: { ...RFC_CHALLENGE, algorithm: 'SHA-256' },
      method: 'GET',
      uri: '/',
      username: 'u',
      password: 'p'
    })).toEqual({ ok: false, reason: 'unsupported-algorithm' });
  });

  it('generates a 48-char hex cnonce when none is injected', () => {
    const result = buildDigestAuthorization({
      challenge: RFC_CHALLENGE,
      method: 'GET',
      uri: '/',
      username: 'u',
      password: 'p'
    });
    expect(result.ok).toBe(true);
    expect((result as { ok: true; header: string }).header).toMatch(/cnonce="[0-9a-f]{48}"/);
  });

  it('hashes non-ASCII credentials as UTF-8 bytes, matching the desktop app', () => {
    const result = buildDigestAuthorization({
      challenge: { realm: 'digest-lab', nonce: 'abc123def', qop: 'auth' },
      method: 'GET',
      uri: '/data',
      username: 'grüße',
      password: 'päss123',
      cnonce: '0a4f113b'
    });
    expect(result.ok).toBe(true);
    expect((result as { ok: true; header: string }).header).toContain('response="ee64327486c840299318b6c95455fb54"');
  });

  it('rejects a challenge whose echoed values carry control characters', () => {
    expect(buildDigestAuthorization({
      challenge: { ...RFC_CHALLENGE, realm: 'evil\r\nX-Injected: 1' },
      method: 'GET',
      uri: '/',
      username: 'u',
      password: 'p'
    })).toEqual({ ok: false, reason: 'malformed-challenge' });
  });
});

describe('getDigestCredentials', () => {
  it('returns the credentials for a digest config', () => {
    expect(getDigestCredentials({ type: 'digest', username: 'u', password: 'p' }))
      .toEqual({ username: 'u', password: 'p' });
  });

  it('normalizes an absent password to an empty string instead of disabling the flow', () => {
    expect(getDigestCredentials({ type: 'digest', username: 'u' }))
      .toEqual({ username: 'u', password: '' });
  });

  it('returns null for other auth types and for an unusable username', () => {
    expect(getDigestCredentials(undefined)).toBeNull();
    expect(getDigestCredentials({ type: 'basic', username: 'u', password: 'p' })).toBeNull();
    expect(getDigestCredentials({ type: 'digest', username: '', password: 'p' })).toBeNull();
    expect(getDigestCredentials({ type: 'digest', password: 'p' })).toBeNull();
  });
});
