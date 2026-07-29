import { Buffer } from 'buffer';
import type { RunRequestResponse } from '../runner';
import {
  type ResponseBodyFormat,
  type ResponseBodyFormatViewData,
  BYTE_FORMAT_OPTIONS,
  ALL_FORMAT_OPTIONS,
  JSON_PATTERN,
  SVG_PATTERN,
  XML_PATTERN,
  JAVASCRIPT_PATTERN,
  SVG_CONTENT_TYPE_PATTERN,
  IMAGE_VIDEO_AUDIO_PATTERN,
  PDF_CONTENT_TYPE_PATTERN,
  ZIP_CONTENT_TYPE_PATTERN,
  MIME_TYPE_PATTERN,
  DATA_URL_PREFIX_PATTERN,
  NON_BASE64_CHARS_PATTERN,
  RESPONSE_FORMAT_RULES
} from '../constants';

// Normalize a response's content-type header into a canonical MIME type, or '' when absent.
export function getContentType(headers: RunRequestResponse['headers']): string {
  if (!headers || typeof headers !== 'object' || Object.keys(headers).length === 0) {
    return '';
  }

  const contentTypeHeader = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type');
  const contentType = contentTypeHeader && contentTypeHeader[1];
  if (!contentType || typeof contentType !== 'string') {
    return '';
  }

  if (JSON_PATTERN.test(contentType)) return 'application/ld+json';
  if (SVG_PATTERN.test(contentType)) return 'image/svg+xml';
  if (XML_PATTERN.test(contentType)) return 'application/xml';
  if (JAVASCRIPT_PATTERN.test(contentType)) return 'application/javascript';

  return contentType;
};

function extractMimeType(contentType = '') {
  const cleaned = String(contentType).trim().toLowerCase();
  const match = cleaned.match(MIME_TYPE_PATTERN);
  return match ? match[0] : cleaned;
};

// SVG is XML text and stays selectable as a structured format, unlike other image/*.
export function isByteFormatContentType(contentType: string): boolean {
  if (SVG_CONTENT_TYPE_PATTERN.test(contentType)) return false;
  return IMAGE_VIDEO_AUDIO_PATTERN.test(contentType)
    || PDF_CONTENT_TYPE_PATTERN.test(contentType)
    || ZIP_CONTENT_TYPE_PATTERN.test(contentType);
};

/**
 * The format options offered for a response body: byte formats (raw/hex/base64) only for
 * binary content, otherwise the structured decoders too. Content type is the body-sniffed
 * value when present, otherwise the declared header. Pure — safe under SSR/node.
 */
export function getResponseFormatOptions(
  detectedContentType: string | null,
  headerContentType: string
): ResponseBodyFormat[] {
  const contentType = detectedContentType ?? headerContentType;

  if (isByteFormatContentType(contentType)) {
    return [...BYTE_FORMAT_OPTIONS];
  }

  return [...ALL_FORMAT_OPTIONS];
};

// Mirrors bruno-app's packages/bruno-app/src/utils/response/index.js getDefaultResponseFormat; keep in sync.
export function getDefaultResponseFormat(contentType: string): ResponseBodyFormatViewData {
  const mime = extractMimeType(contentType);

  for (const rule of RESPONSE_FORMAT_RULES) {
    if (rule.test.test(mime)) {
      return rule.result;
    }
  }

  return { format: 'raw', view: 'editor' };
}

/**
 * Decode only the first N bytes from a Base64 string.
 * Returns an empty buffer for invalid/missing input.
 */
function decodeBase64Head(base64: RunRequestResponse['base64Data'], byteCount: number): Buffer {
  if (!base64 || typeof base64 !== 'string') {
    return Buffer.alloc(0);
  }

  try {
    // Strip a data URL prefix (e.g. "data:image/png;base64,") when present.
    const prefixMatch = base64.match(DATA_URL_PREFIX_PATTERN);
    const cleanedBase64 = prefixMatch ? base64.slice(prefixMatch[0].length) : base64;

    if (!cleanedBase64) {
      return Buffer.alloc(0);
    }

    // Base64 chars needed to reconstruct "byteCount" bytes (4 chars per 3 bytes).
    const neededChars = Math.ceil(byteCount / 3) * 4;

    let slice = cleanedBase64.slice(0, neededChars);
    // Drop any non-base64 characters (whitespace, invalid chars) before decoding.
    slice = slice.replace(NON_BASE64_CHARS_PATTERN, '');
    // Pad to a multiple of 4 so the slice is valid base64.
    const padLength = (4 - (slice.length % 4)) % 4;
    slice = slice + '='.repeat(padLength);

    return Buffer.from(slice, 'base64').subarray(0, byteCount);
  } catch {
    return Buffer.alloc(0);
  }
};

// Mirrors bruno-app's packages/bruno-app/src/utils/response/index.js detectContentTypeFromBuffer; keep in sync.
export function detectContentTypeFromBuffer(buffer: Buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  const bytes = buffer.subarray(0, 12);

  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    && bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) {
    return 'image/avif';
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return 'image/bmp';
  }
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00)
    || (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)) {
    return 'image/tiff';
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return 'image/x-icon';
  }
  if (bytes[0] === 0x3C && bytes[1] === 0x73 && bytes[2] === 0x76 && bytes[3] === 0x67 && bytes[4] === 0x20) {
    return 'image/svg+xml';
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00
    && (bytes[3] === 0x18 || bytes[3] === 0x20)
    && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return 'video/mp4';
  }
  if ((bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3)) {
    return 'video/webm';
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) {
    return 'video/x-msvideo'; // AVI
  }

  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    return 'audio/mpeg'; // MP3 frame sync
  }
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg'; // "ID3" — MP3 with a leading ID3v2 tag
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
    return 'audio/wav';
  }
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'audio/ogg';
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    && bytes[8] === 0x4D && bytes[9] === 0x34 && bytes[10] === 0x41) {
    return 'audio/m4a';
  }

  if (bytes[0] === 0x50 && bytes[1] === 0x4B
    && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    return 'application/zip';
  }
  if (bytes[0] === 0x1F && bytes[1] === 0x8B) {
    return 'application/gzip';
  }

  return null;
};

/**
 * Helper to detect SVG content from text buffer
 * SVG files may start with XML declaration, comments, or whitespace before the <svg tag
 * @param {Buffer} buffer - The data buffer to analyze
 * @returns {boolean} - true if buffer contains SVG content
 */
const isSvgContent = (buffer: Buffer) => {
  const length = buffer.length;
  if (length < 4 || buffer[0] !== 0x3C) return false;

  // Fast path: <svg
  if (buffer[1] === 0x73 && buffer[2] === 0x76 && buffer[3] === 0x67) {
    return true;
  }

  // Slow path: <?xml or <!DOCTYPE or <!--
  if (buffer[1] !== 0x3F && buffer[1] !== 0x21) return false;

  // Search for <svg in first 512 bytes
  const limit = Math.min(512, length - 3);
  for (let i = 2; i < limit; i++) {
    if (buffer[i] === 0x3C && buffer[i + 1] === 0x73
      && buffer[i + 2] === 0x76 && buffer[i + 3] === 0x67) {
      return true;
    }
  }

  return false;
};

/**
 * Helper to detect if buffer contains text data
 */
function isLikelyText(buffer: Buffer) {
  if (!buffer || buffer.length === 0) return false;
  let textChars = 0;
  const sampleSize = Math.min(buffer.length, 512);

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    if ((byte >= 0x20 && byte <= 0x7E) // Printable ASCII
      || byte === 0x09 // Tab
      || byte === 0x0A // Line feed
      || byte === 0x0D) { // Carriage return
      textChars++;
    }
  }

  return (textChars / sampleSize) > 0.85;
};

/**
 * Sniff a content type from raw bytes: magic numbers first, then SVG, then plain text.
 * Reads only the head, so a small slice of a large body is enough.
 */
export function detectContentTypeFromBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length === 0) return null;

  // Magic numbers live in the first 12 bytes.
  const magicType = detectContentTypeFromBuffer(buffer.subarray(0, 12));
  if (magicType) return magicType;

  // Not a known binary signature: use a larger head for text/SVG heuristics.
  const textHead = buffer.subarray(0, 512);

  if (isSvgContent(textHead)) {
    return 'image/svg+xml';
  }

  if (isLikelyText(textHead)) return 'text/plain';

  return null;
}

/**
 * Sniff a content type from a base64-encoded body: magic numbers first, then SVG, then plain text.
 */
export function detectContentTypeFromBase64(base64: RunRequestResponse['base64Data']) {
  if (!base64) return null;
  return detectContentTypeFromBytes(decodeBase64Head(base64, 512));
}
