import { describe, it, expect } from 'vitest';
import { getResponseFormatOptions } from './response';

const BYTE_ONLY = ['raw', 'hex', 'base64'];
const ALL = ['json', 'html', 'xml', 'javascript', 'raw', 'hex', 'base64'];

describe('getResponseFormatOptions', () => {
  it('offers only byte formats for sniffed binary bodies (png, pdf, zip, mp4, mp3)', () => {
    for (const detected of ['image/png', 'application/pdf', 'application/zip', 'video/mp4', 'audio/mpeg']) {
      expect(getResponseFormatOptions(detected, '')).toEqual(BYTE_ONLY);
    }
  });

  it('offers only byte formats when the header declares a binary type and body is not sniffable', () => {
    for (const type of ['image/jpeg', 'video/webm', 'audio/wav', 'application/pdf', 'application/zip']) {
      expect(getResponseFormatOptions(null, type)).toEqual(BYTE_ONLY);
    }
  });

  it('treats SVG as text and offers all formats', () => {
    expect(getResponseFormatOptions('image/svg+xml', '')).toEqual(ALL);
    expect(getResponseFormatOptions(null, 'image/svg+xml')).toEqual(ALL);
  });

  it('offers all formats for structured text types', () => {
    expect(getResponseFormatOptions('text/plain', 'application/ld+json')).toEqual(ALL);
    expect(getResponseFormatOptions(null, 'text/html')).toEqual(ALL);
    expect(getResponseFormatOptions(null, 'application/xml')).toEqual(ALL);
  });

  it('offers all formats when there is no sniffable body and no/empty headers', () => {
    expect(getResponseFormatOptions(null, '')).toEqual(ALL);
  });
});
