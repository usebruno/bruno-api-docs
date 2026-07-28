
export type ResponseBodyView = 'preview' | 'editor';

export type ResponseBodyFormat = 'html' | 'json' | 'xml' | 'javascript' | 'base64' | 'raw' | 'hex';

export interface ResponseBodyFormatViewData {
  format: ResponseBodyFormat;
  view: ResponseBodyView;
}

export type ResponseBodyPreview = "preview-web" | "preview-json" | "preview-xml" | "preview-text" | "preview-image" | "preview-pdf" | "preview-audio" | "preview-video" | null;

// Structured decoders only make sense for text-ish bodies; prepend them for those.
export const STRUCTURED_FORMAT_OPTIONS: ResponseBodyFormat[] = ['json', 'html', 'xml', 'javascript'];

// Encodings that always apply to any body, structured or not.
export const BYTE_FORMAT_OPTIONS: ResponseBodyFormat[] = ['raw', 'hex', 'base64'];

// Every format in dropdown order: structured group first, then the byte-encoding group.
export const ALL_FORMAT_OPTIONS: ResponseBodyFormat[] = [...STRUCTURED_FORMAT_OPTIONS, ...BYTE_FORMAT_OPTIONS];

export const JSON_PATTERN = /^[\w-]+\/([\w-]+\+)?json/;
export const SVG_PATTERN = /^image\/svg/i;
export const XML_PATTERN = /^[\w-]+\/([\w-]+\+)?xml/;
export const JAVASCRIPT_PATTERN = /^(application|text)\/(javascript|ecmascript)/i;
export const SVG_CONTENT_TYPE_PATTERN = /svg/i;
export const IMAGE_VIDEO_AUDIO_PATTERN = /^(image|video|audio)\//i;
export const PDF_CONTENT_TYPE_PATTERN = /pdf/i;
export const ZIP_CONTENT_TYPE_PATTERN = /zip/i;
// Everything up to the first ";" — strips parameters like "; charset=utf-8".
export const MIME_TYPE_PATTERN = /^[^;]+/;

// Data URL prefix, e.g. "data:image/png;base64,". Used only with String.match.
export const DATA_URL_PREFIX_PATTERN = /^data:[^;]*;base64,/;
// Characters that are not valid base64. Used only with String.replace (no lastIndex state).
export const NON_BASE64_CHARS_PATTERN = /[^A-Za-z0-9+/=]/g;


export const FORMAT_LABELS: Record<ResponseBodyFormat, string> = {
  json: 'JSON',
  html: 'HTML',
  xml: 'XML',
  javascript: 'Javascript',
  raw: 'Raw',
  hex: 'Hex',
  base64: 'Base64'
};

export const FORMAT_TO_MONACO: Record<ResponseBodyFormat, string> = {
  json: 'json',
  xml: 'xml',
  html: 'html',
  javascript: 'javascript',
  raw: 'plaintext',
  hex: 'plaintext',
  base64: 'plaintext'
};

// Ordered content-type → format/view rules; first match wins. Order is significant:
// the specific application/pdf etc. rules must precede the catch-all text/* rule.
export const RESPONSE_FORMAT_RULES: { test: RegExp; result: ResponseBodyFormatViewData }[] = [
  { test: /^text\/html$/, result: { format: 'html', view: 'preview' } },

  {
    test: /^application\/(json|.+\+json)$/,
    result: { format: 'json', view: 'editor' }
  },
  {
    test: /^text\/(json|.+\+json)$/,
    result: { format: 'json', view: 'editor' }
  },

  {
    test: /^application\/(xml|.+\+xml)$/,
    result: { format: 'xml', view: 'editor' }
  },
  {
    test: /^text\/(xml|.+\+xml)$/,
    result: { format: 'xml', view: 'editor' }
  },

  {
    test: /^(application|text)\/javascript$/,
    result: { format: 'javascript', view: 'editor' }
  },

  { test: /^image\//, result: { format: 'base64', view: 'preview' } },
  { test: /^audio\//, result: { format: 'base64', view: 'preview' } },
  { test: /^video\//, result: { format: 'base64', view: 'preview' } },
  {
    test: /^application\/pdf$/,
    result: { format: 'base64', view: 'preview' }
  },

  { test: /^text\//, result: { format: 'raw', view: 'editor' } }
];

export function formatToPreviewMode(format: ResponseBodyFormat, contentType?: string): ResponseBodyPreview {
  if (format === 'html') return 'preview-web';
  if (format === 'json') return 'preview-json';
  if (format === 'xml') return 'preview-xml';
  if (format === 'raw') return 'preview-text';
  if (format === 'javascript') return 'preview-web';

  if (format === 'base64' || format === 'hex') {
    if (contentType) {
      if (contentType.includes('image')) return 'preview-image';
      if (contentType.includes('pdf')) return 'preview-pdf';
      if (contentType.includes('audio')) return 'preview-audio';
      if (contentType.includes('video')) return 'preview-video';
    }
    return 'preview-text';
  }

  return 'preview-text';
}
