import { describe, it, expect } from 'vitest';
import { Buffer } from 'buffer';
import { getResponseFormatOptions } from './response';

const BYTE_ONLY = ['raw', 'hex', 'base64'];
const ALL = ['json', 'html', 'xml', 'javascript', 'raw', 'hex', 'base64'];

const toBase64 = (bytes: number[] | string) =>
  Buffer.from(typeof bytes === 'string' ? bytes : bytes).toString('base64');

const contentTypeHeaders = (value: string) => ({ 'Content-Type': value });

describe('getResponseFormatOptions', () => {
  it('offers only byte formats for sniffed binary bodies (png, pdf, zip, mp4, mp3)', () => {
    const png = toBase64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const pdf = toBase64([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x00, 0x00]);
    const zip = toBase64([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00]);
    const mp4 = toBase64([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x00, 0x00, 0x00, 0x00]);
    const mp3 = toBase64([0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    for (const body of [png, pdf, zip, mp4, mp3]) {
      expect(getResponseFormatOptions(body, {})).toEqual(BYTE_ONLY);
    }
  });

  it('offers only byte formats when the header declares a binary type and body is not sniffable', () => {
    for (const type of ['image/jpeg', 'video/webm', 'audio/wav', 'application/pdf', 'application/zip']) {
      expect(getResponseFormatOptions(null, contentTypeHeaders(type))).toEqual(BYTE_ONLY);
    }
  });

  it('treats SVG as text and offers all formats', () => {
    const svg = toBase64('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(getResponseFormatOptions(svg, {})).toEqual(ALL);
    expect(getResponseFormatOptions(null, contentTypeHeaders('image/svg+xml'))).toEqual(ALL);
  });

  it('offers all formats for structured text types', () => {
    const json = toBase64('{"hello":"world"}');
    expect(getResponseFormatOptions(json, contentTypeHeaders('application/json'))).toEqual(ALL);
    expect(getResponseFormatOptions(null, contentTypeHeaders('text/html'))).toEqual(ALL);
    expect(getResponseFormatOptions(null, contentTypeHeaders('application/xml'))).toEqual(ALL);
  });

  it('offers all formats when there is no sniffable body and no/empty headers', () => {
    expect(getResponseFormatOptions(null, {})).toEqual(ALL);
    expect(getResponseFormatOptions(undefined, undefined)).toEqual(ALL);
    expect(getResponseFormatOptions('', {})).toEqual(ALL);
  });
});
