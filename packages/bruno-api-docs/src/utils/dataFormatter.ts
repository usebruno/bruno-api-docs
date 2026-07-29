import { Buffer } from 'buffer';
import { JSONPath } from 'jsonpath-plus';
import type { XMLFormatterOptions } from 'xml-formatter';
import xmlFormat from 'xml-formatter';
import fastJsonFormat from 'fast-json-format';
import prettierFormat from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';
import type { RunRequestResponse } from '../runner';

const applyJSONPathFilter = (data: RunRequestResponse['data'], filter: string): unknown => {
  try {
    return JSONPath({ path: filter, json: data });
  } catch (e) {
    console.warn('Could not apply JSONPath filter:', e instanceof Error ? e.message : e);
    return data;
  }
};

export const safeStringifyJSON = (obj: unknown, indent = false) => {
  if (obj == null) {
    return obj;
  }
  try {
    if (indent) {
      return JSON.stringify(obj, null, 2);
    }
    return JSON.stringify(obj);
  } catch {
    return obj;
  }
};

export const safeParseXML = (str: unknown, options?: XMLFormatterOptions) => {
  if (typeof str !== 'string' || !str.length) {
    return str;
  }
  try {
    return xmlFormat(str, options);
  } catch {
    return str;
  }
};

export const prettifyHtmlString = (htmlString: string): string => {
  if (typeof htmlString !== 'string') return htmlString;

  try {
    // xml-formatter handles HTML well enough for a readable, indented view.
    return xmlFormat(htmlString, {
      collapseContent: true,
      lineSeparator: '\n'
    });
  } catch (error) {
    console.error(error);
    return htmlString;
  }
};

export const prettifyJavaScriptString = (jsString: string): string => {
  if (typeof jsString !== 'string') return jsString;

  try {
    return prettierFormat.format(jsString, {
      parser: 'babel',
      plugins: [parserBabel],
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'none',
      printWidth: 120
    });
  } catch {
    return jsString;
  }
};

export const formatHexView = (buffer: Buffer): string => {
  const width = 16;
  let output = '';

  for (let i = 0; i < buffer.length; i += width) {
    const slice = buffer.subarray(i, i + width);
    const hex = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');

    output += `${i.toString(16).padStart(8, '0')}: ${hex.padEnd(48)} ${ascii}\n`;
  }

  return output;
};

// Detects whether a string is already a hex dump (address + bytes + ASCII) or a
// plain hex string, so already-hex payloads are returned untouched.
export const isHexFormat = (str: unknown): boolean => {
  if (typeof str !== 'string' || !str.trim()) {
    return false;
  }

  const trimmed = str.trim();

  const hexDumpPattern = /^[0-9a-fA-F]{8}:\s+([0-9a-fA-F]{2}\s+){1,16}/m;
  if (hexDumpPattern.test(trimmed)) {
    return true;
  }

  const hexOnly = trimmed.replace(/\s+/g, '');
  if (hexOnly.length > 0 && /^[0-9a-fA-F]+$/i.test(hexOnly)) {
    // Require an even length ≥ 6 with at least one digit to avoid matching short
    // numbers or all-letter words (e.g. "dead", "beef").
    if (hexOnly.length >= 6 && hexOnly.length % 2 === 0 && /[0-9]/.test(hexOnly)) {
      return true;
    }
  }

  return false;
};

// Memory threshold to prevent crashes when decoding large buffers
export const LARGE_BUFFER_THRESHOLD = 50 * 1024 * 1024; // 50 MB

export const formatResponse = (
  data: RunRequestResponse['data'],
  dataBufferString: string,
  mode: string,
  filter?: string,
  bufferThreshold = LARGE_BUFFER_THRESHOLD
): string => {
  if (!mode || (data === undefined && !dataBufferString)) {
    return '';
  }

  // Cheapest safe stringification for a large body: keep strings as-is, coerce
  // null/undefined via String, and JSON-encode objects without indentation.
  const stringifyLargeBody = (body: RunRequestResponse['data']): string => {
    if (typeof body === 'string') {
      return body;
    }
    if (body == null) {
      return String(body);
    }
    if (typeof body === 'object') {
      const stringified = safeStringifyJSON(body, false);
      return typeof stringified === 'string' ? stringified : String(body);
    }
    return String(body);
  };

  // Source the raw text from the base64 bytes when present, otherwise from `data` itself —
  // text responses carry their bytes in `data` and skip the redundant base64 copy.
  let bufferSize = 0, rawData = '', isVeryLargeResponse = false;
  try {
    if (dataBufferString) {
      const dataBuffer = Buffer.from(dataBufferString, 'base64');
      bufferSize = dataBuffer.length;
      isVeryLargeResponse = bufferSize > bufferThreshold;
      if (!isVeryLargeResponse) {
        rawData = dataBuffer.toString();
      }
    } else if (typeof data === 'string') {
      bufferSize = Buffer.byteLength(data);
      isVeryLargeResponse = bufferSize > bufferThreshold;
      if (!isVeryLargeResponse) {
        rawData = data;
      }
    } else if (data != null) {
      const stringified = safeStringifyJSON(data, false);
      rawData = typeof stringified === 'string' ? stringified : String(data);
      bufferSize = Buffer.byteLength(rawData);
      isVeryLargeResponse = bufferSize > bufferThreshold;
      if (isVeryLargeResponse) {
        rawData = '';
      }
    }
  } catch (error) {
    console.warn('Failed to read response body:', error);
  }

  if (mode.includes('json')) {
    // A binary/empty body requested as JSON has no parsed value to render.
    if (data === undefined) {
      return '';
    }

    try {
      if (filter) {
        const filtered = safeStringifyJSON(applyJSONPathFilter(data, filter), true);
        return typeof filtered === 'string' ? filtered : String(filtered);
      }
    } catch {
      // fall back to unfiltered formatting
    }

    if (isVeryLargeResponse) {
      return stringifyLargeBody(data);
    }

    try {
      return fastJsonFormat(rawData);
    } catch {
      // fall through to safeStringifyJSON below
    }

    if (typeof data === 'string') {
      return data;
    }
    const stringified = safeStringifyJSON(data, false);
    return typeof stringified === 'string' ? stringified : String(data);
  }

  if (mode.includes('xml')) {
    if (isVeryLargeResponse) {
      return stringifyLargeBody(data);
    }

    const parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }
    const stringified = safeStringifyJSON(parsed, true);
    return typeof stringified === 'string' ? stringified : String(parsed);
  }

  if (mode.includes('html')) {
    if (isVeryLargeResponse) {
      return stringifyLargeBody(data);
    }

    try {
      return prettifyHtmlString(rawData);
    } catch {
      return rawData;
    }
  }

  if (mode.includes('javascript')) {
    if (isVeryLargeResponse) {
      return stringifyLargeBody(data);
    }

    try {
      return prettifyJavaScriptString(rawData);
    } catch {
      return rawData;
    }
  }

  if (mode.includes('hex')) {
    if (typeof data === 'string' && isHexFormat(data)) {
      return data;
    }

    try {
      // Prefer the base64 bytes (faithful for binary); fall back to encoding the text body.
      const dataBuffer = dataBufferString
        ? Buffer.from(dataBufferString, 'base64')
        : typeof data === 'string'
          ? Buffer.from(data, 'utf8')
          : Buffer.alloc(0);
      return formatHexView(dataBuffer);
    } catch {
      return '';
    }
  }

  if (mode.includes('base64')) {
    if (dataBufferString) {
      return dataBufferString;
    }
    return typeof data === 'string' ? Buffer.from(data, 'utf8').toString('base64') : '';
  }

  if (mode.includes('text') || mode.includes('raw')) {
    if (isVeryLargeResponse) {
      return stringifyLargeBody(data);
    }
    return rawData;
  }

  if (typeof data === 'string') {
    return data;
  }

  const stringified = safeStringifyJSON(data, !isVeryLargeResponse);
  return typeof stringified === 'string' ? stringified : String(data);
};
