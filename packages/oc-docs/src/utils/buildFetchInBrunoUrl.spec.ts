import { describe, it, expect } from 'vitest';
import { buildFetchInBrunoUrl } from './buildFetchInBrunoUrl';

describe('buildFetchInBrunoUrl', () => {
  it('builds an https fetch.usebruno.com link carrying the git url', () => {
    expect(buildFetchInBrunoUrl('https://github.com/usebruno/bruno-testbench.git')).toBe(
      'https://fetch.usebruno.com?url=https%3A%2F%2Fgithub.com%2Fusebruno%2Fbruno-testbench.git'
    );
  });

  it('url-encodes query-string-breaking characters', () => {
    expect(buildFetchInBrunoUrl('https://host/repo.git?token=a&b=c')).toContain(
      encodeURIComponent('https://host/repo.git?token=a&b=c')
    );
  });

  it('returns undefined for nullish / empty / whitespace input', () => {
    expect(buildFetchInBrunoUrl(undefined)).toBeUndefined();
    expect(buildFetchInBrunoUrl(null)).toBeUndefined();
    expect(buildFetchInBrunoUrl('')).toBeUndefined();
    expect(buildFetchInBrunoUrl('   ')).toBeUndefined();
  });

  it('trims surrounding whitespace before encoding', () => {
    expect(buildFetchInBrunoUrl('  https://h/r.git  ')).toBe(
      'https://fetch.usebruno.com?url=https%3A%2F%2Fh%2Fr.git'
    );
  });
});
