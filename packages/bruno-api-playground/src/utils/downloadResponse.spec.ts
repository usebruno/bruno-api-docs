import { describe, it, expect } from 'vitest';
import { getExtensionFromContentType, getResponseFilename } from './downloadResponse';

describe('getExtensionFromContentType', () => {
  it('maps common API MIME types to extensions', () => {
    expect(getExtensionFromContentType('application/json')).toBe('json');
    expect(getExtensionFromContentType('application/xml')).toBe('xml');
    expect(getExtensionFromContentType('text/html')).toBe('html');
    expect(getExtensionFromContentType('image/png')).toBe('png');
    expect(getExtensionFromContentType('application/octet-stream')).toBe('bin');
  });

  it('ignores charset parameters and is case-insensitive', () => {
    expect(getExtensionFromContentType('application/JSON; charset=utf-8')).toBe('json');
    expect(getExtensionFromContentType('  text/CSV ')).toBe('csv');
  });

  it('returns an empty string for unknown or missing types', () => {
    expect(getExtensionFromContentType('application/vnd.custom')).toBe('');
    expect(getExtensionFromContentType('')).toBe('');
  });
});

describe('getResponseFilename', () => {
  it('prefers the filename from Content-Disposition', () => {
    expect(
      getResponseFilename({ headers: { 'Content-Disposition': 'attachment; filename="report.json"' } })
    ).toBe('report.json');
  });

  it('decodes an RFC 5987 filename* value', () => {
    expect(
      getResponseFilename({ headers: { 'content-disposition': 'attachment; filename*=UTF-8\'\'na%C3%AFve.txt' } })
    ).toBe('naïve.txt');
  });

  it('falls back to the URL basename when it has an extension', () => {
    expect(getResponseFilename({ url: 'https://api.example.com/files/export.csv?token=abc' })).toBe('export.csv');
  });

  it('derives a name from the content-type extension when no disposition or URL basename', () => {
    expect(getResponseFilename({ headers: { 'Content-Type': 'application/json' } })).toBe('response.json');
  });

  it('falls back to a bare "response" when nothing is known', () => {
    expect(getResponseFilename({})).toBe('response');
  });
});
