import {
  IconBraces,
  IconCode,
  IconFileCode,
  IconBrandJavascript,
  IconFileText,
  IconHexagons,
  IconBinaryTree,
  type TablerIcon
} from '@tabler/icons';

export type ResponseBodyView = 'preview' | 'editor';

export type ResponseBodyFormat = 'html' | 'json' | 'xml' | 'javascript' | 'base64' | 'raw' | 'hex';

export interface ResponseBodyFormatViewData {
  format: ResponseBodyFormat;
  view: ResponseBodyView;
}

export type ResponseBodyPreview = 'preview-web' | 'preview-json' | 'preview-xml' | 'preview-text' | 'preview-image' | 'preview-pdf' | 'preview-audio' | 'preview-video' | null;

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

// A response at or above this size is hidden behind a reveal warning, and its body is not
// eagerly base64-encoded at parse time (avoids holding a ~4/3× copy of a body we won't show).
export const RESPONSE_LARGE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

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
/** Example response body `type` -> Prism language. */
export const RESPONSE_LANGUAGE: Record<string, string> = {
  json: 'json',
  xml: 'markup',
  html: 'markup',
  text: 'text',
  binary: 'text'
};

/** Example response body `type` -> full MIME content type. */
export const RESPONSE_CONTENT_TYPE: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  binary: 'application/octet-stream'
};

/** HTTP status code -> reason phrase (e.g. 404 -> "Not Found"). */
export const STATUS_CODE_PHRASES: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choice',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: 'I\'m a teapot',
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required'
};

export const FORMAT_ICONS: Record<ResponseBodyFormat, TablerIcon> = {
  json: IconBraces,
  html: IconCode,
  xml: IconFileCode,
  javascript: IconBrandJavascript,
  raw: IconFileText,
  hex: IconHexagons,
  base64: IconBinaryTree
};

// Width the actions block occupies when shown as buttons; the responsive tab bar uses it to
// decide whether to expand the actions inline or collapse them into a menu.
export const RESPONSE_ACTIONS_EXPANDED_WIDTH = 135;
