import { describe, it, expect } from 'vitest';
import {
  getResponseFormatOptions,
  getContentType,
  getDefaultResponseFormat,
  detectContentTypeFromBuffer,
  detectContentTypeFromBytes,
  detectContentTypeFromBase64,
  isByteFormatContentType
} from './response';

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

describe('getContentType', () => {
  it('canonicalizes JSON and +json types to application/ld+json', () => {
    expect(getContentType({ 'content-type': 'application/json' })).toBe('application/ld+json');
    expect(getContentType({ 'content-type': 'application/ld+json' })).toBe('application/ld+json');
    expect(getContentType({ 'content-type': 'text/json' })).toBe('application/ld+json');
  });

  it('canonicalizes SVG to image/svg+xml', () => {
    expect(getContentType({ 'content-type': 'image/svg+xml' })).toBe('image/svg+xml');
  });

  it('canonicalizes XML and +xml types to application/xml', () => {
    expect(getContentType({ 'content-type': 'application/xml' })).toBe('application/xml');
    expect(getContentType({ 'content-type': 'application/atom+xml' })).toBe('application/xml');
    expect(getContentType({ 'content-type': 'text/xml' })).toBe('application/xml');
  });

  it('canonicalizes javascript/ecmascript types to application/javascript', () => {
    expect(getContentType({ 'content-type': 'application/javascript' })).toBe('application/javascript');
    expect(getContentType({ 'content-type': 'text/ecmascript' })).toBe('application/javascript');
  });

  it('passes a plain type through unchanged', () => {
    expect(getContentType({ 'content-type': 'text/plain' })).toBe('text/plain');
  });

  it('matches the content-type header case-insensitively', () => {
    expect(getContentType({ 'Content-Type': 'application/json' })).toBe('application/ld+json');
    expect(getContentType({ 'CONTENT-TYPE': 'text/plain' })).toBe('text/plain');
  });

  it('returns "" for missing, empty, or non-string headers', () => {
    expect(getContentType(undefined as never)).toBe('');
    expect(getContentType(null as never)).toBe('');
    expect(getContentType({} as never)).toBe('');
    expect(getContentType({ 'content-type': '' } as never)).toBe('');
    expect(getContentType({ 'content-type': 123 } as never)).toBe('');
  });
});

describe('getDefaultResponseFormat', () => {
  it('maps text/html to html/preview', () => {
    expect(getDefaultResponseFormat('text/html')).toEqual({ format: 'html', view: 'preview' });
  });

  it('maps json variants to json/editor', () => {
    expect(getDefaultResponseFormat('application/json')).toEqual({ format: 'json', view: 'editor' });
    expect(getDefaultResponseFormat('text/json')).toEqual({ format: 'json', view: 'editor' });
    expect(getDefaultResponseFormat('application/vnd.api+json')).toEqual({ format: 'json', view: 'editor' });
  });

  it('maps xml variants to xml/editor', () => {
    expect(getDefaultResponseFormat('application/xml')).toEqual({ format: 'xml', view: 'editor' });
    expect(getDefaultResponseFormat('text/xml')).toEqual({ format: 'xml', view: 'editor' });
    expect(getDefaultResponseFormat('application/atom+xml')).toEqual({ format: 'xml', view: 'editor' });
  });

  it('maps javascript to javascript/editor', () => {
    expect(getDefaultResponseFormat('application/javascript')).toEqual({ format: 'javascript', view: 'editor' });
    expect(getDefaultResponseFormat('text/javascript')).toEqual({ format: 'javascript', view: 'editor' });
  });

  it('maps image/audio/video/pdf to base64/preview', () => {
    expect(getDefaultResponseFormat('image/png')).toEqual({ format: 'base64', view: 'preview' });
    expect(getDefaultResponseFormat('audio/mpeg')).toEqual({ format: 'base64', view: 'preview' });
    expect(getDefaultResponseFormat('video/mp4')).toEqual({ format: 'base64', view: 'preview' });
    expect(getDefaultResponseFormat('application/pdf')).toEqual({ format: 'base64', view: 'preview' });
  });

  it('maps other text/* to raw/editor', () => {
    expect(getDefaultResponseFormat('text/plain')).toEqual({ format: 'raw', view: 'editor' });
    expect(getDefaultResponseFormat('text/csv')).toEqual({ format: 'raw', view: 'editor' });
  });

  it('falls back to raw/editor for unknown types', () => {
    expect(getDefaultResponseFormat('application/octet-stream')).toEqual({ format: 'raw', view: 'editor' });
    expect(getDefaultResponseFormat('')).toEqual({ format: 'raw', view: 'editor' });
  });

  it('strips a charset suffix before matching (extractMimeType)', () => {
    expect(getDefaultResponseFormat('application/json; charset=utf-8')).toEqual({ format: 'json', view: 'editor' });
    expect(getDefaultResponseFormat('text/html; charset=utf-8')).toEqual({ format: 'html', view: 'preview' });
  });
});

describe('detectContentTypeFromBuffer', () => {
  const buf = (bytes: number[]) => Buffer.from(bytes);

  it('detects png', () => {
    expect(detectContentTypeFromBuffer(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
  });

  it('detects jpeg', () => {
    expect(detectContentTypeFromBuffer(buf([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects gif', () => {
    expect(detectContentTypeFromBuffer(buf([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('image/gif');
  });

  it('detects webp via WEBP at bytes 8-11', () => {
    // RIFF....WEBP
    expect(detectContentTypeFromBuffer(buf([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
  });

  it('detects avif via ftyp+avif at bytes 4-11', () => {
    expect(detectContentTypeFromBuffer(buf([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]))).toBe('image/avif');
  });

  it('detects mp4 via 0x18/0x20 length + ftyp', () => {
    expect(detectContentTypeFromBuffer(buf([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]))).toBe('video/mp4');
    expect(detectContentTypeFromBuffer(buf([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]))).toBe('video/mp4');
  });

  it('detects m4a via ftyp+M4A at bytes 4-10', () => {
    expect(detectContentTypeFromBuffer(buf([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]))).toBe('audio/m4a');
  });

  it('detects mp3 via 0xFF frame-sync bitmask (0xE0)', () => {
    expect(detectContentTypeFromBuffer(buf([0xff, 0xe0, 0x00, 0x00]))).toBe('audio/mpeg');
    expect(detectContentTypeFromBuffer(buf([0xff, 0xfb, 0x00, 0x00]))).toBe('audio/mpeg');
  });

  it('detects mp3 with a leading ID3v2 tag ("ID3")', () => {
    expect(detectContentTypeFromBuffer(buf([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]))).toBe('audio/mpeg');
  });

  it('detects tiff little-endian and big-endian', () => {
    expect(detectContentTypeFromBuffer(buf([0x49, 0x49, 0x2a, 0x00]))).toBe('image/tiff');
    expect(detectContentTypeFromBuffer(buf([0x4d, 0x4d, 0x00, 0x2a]))).toBe('image/tiff');
  });

  it('detects zip across 0x03/0x05/0x07 third-byte variants', () => {
    expect(detectContentTypeFromBuffer(buf([0x50, 0x4b, 0x03, 0x04]))).toBe('application/zip');
    expect(detectContentTypeFromBuffer(buf([0x50, 0x4b, 0x05, 0x06]))).toBe('application/zip');
    expect(detectContentTypeFromBuffer(buf([0x50, 0x4b, 0x07, 0x08]))).toBe('application/zip');
  });

  it('returns null for buffers shorter than 4 bytes', () => {
    expect(detectContentTypeFromBuffer(buf([0x89, 0x50, 0x4e]))).toBeNull();
    expect(detectContentTypeFromBuffer(buf([]))).toBeNull();
  });

  it('returns null for an unknown signature', () => {
    expect(detectContentTypeFromBuffer(buf([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]))).toBeNull();
  });
});

describe('detectContentTypeFromBytes', () => {
  it('detects binary magic numbers from raw bytes (png, pdf, mp3-ID3, zip)', () => {
    expect(detectContentTypeFromBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectContentTypeFromBytes(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('application/pdf');
    expect(detectContentTypeFromBytes(Buffer.from([0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0]))).toBe('audio/mpeg');
    expect(detectContentTypeFromBytes(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe('application/zip');
  });

  it('detects SVG and plain text from raw bytes', () => {
    expect(detectContentTypeFromBytes(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('image/svg+xml');
    expect(detectContentTypeFromBytes(Buffer.from('hello world, this is plenty of plain text content'))).toBe('text/plain');
  });

  it('sniffs only the head of a large body', () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(5000)]);
    expect(detectContentTypeFromBytes(png)).toBe('image/png');
  });

  it('returns null for empty input', () => {
    expect(detectContentTypeFromBytes(Buffer.alloc(0))).toBeNull();
  });
});

describe('isByteFormatContentType', () => {
  it('treats image/video/audio/pdf/zip as byte formats', () => {
    for (const ct of ['image/png', 'video/mp4', 'audio/mpeg', 'application/pdf', 'application/zip']) {
      expect(isByteFormatContentType(ct)).toBe(true);
    }
  });

  it('treats SVG and text/structured types as non-byte (text) formats', () => {
    for (const ct of ['image/svg+xml', 'text/plain', 'application/json', 'application/xml', '']) {
      expect(isByteFormatContentType(ct)).toBe(false);
    }
  });
});

describe('detectContentTypeFromBase64', () => {
  it('detects a base64-encoded PNG magic head', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64');
    expect(detectContentTypeFromBase64(png)).toBe('image/png');
  });

  it('detects base64-encoded plain text as text/plain', () => {
    const text = Buffer.from('hello world, this is plenty of plain text content').toString('base64');
    expect(detectContentTypeFromBase64(text)).toBe('text/plain');
  });

  it('detects a base64-encoded <svg> document as image/svg+xml', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
    expect(detectContentTypeFromBase64(svg)).toBe('image/svg+xml');
  });

  it('returns null for empty or undefined input', () => {
    expect(detectContentTypeFromBase64('')).toBeNull();
    expect(detectContentTypeFromBase64(undefined as never)).toBeNull();
  });
});
