export const BODY_TYPES = {
  JSON: 'json',
  XML: 'xml',
  TEXT: 'text',
  HTML: 'html',
  SPARQL: 'sparql',
  FORM_URLENCODED: 'form-urlencoded',
  MULTIPART_FORM: 'multipart-form',
  FILE: 'file',
  BINARY: 'binary'
} as const;

export type BodyType = (typeof BODY_TYPES)[keyof typeof BODY_TYPES];

export const CONTENT_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  TEXT: 'text/plain',
  HTML: 'text/html',
  SPARQL: 'application/sparql-query',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM: 'multipart/form-data',
  OCTET_STREAM: 'application/octet-stream'
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

export const STANDARD_HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
  'TRACE',
  'CONNECT'
] as const;

export const PROTOCOL_BADGE_LABELS: Record<string, string> = {
  GRAPHQL: 'GQL',
  GRPC: 'GRPC',
  WEBSOCKET: 'WS'
};

export const REQUEST_TYPE_LABELS: Record<string, { shortName: string; fullName: string }> = {
  websocket: {
    shortName: PROTOCOL_BADGE_LABELS['WEBSOCKET'],
    fullName: 'Websocket'
  },
  graphql: {
    shortName: PROTOCOL_BADGE_LABELS['GRAPHQL'],
    fullName: 'GraphQL'
  },
  grpc: {
    shortName: PROTOCOL_BADGE_LABELS['GRPC'],
    fullName: 'gRPC'
  }
};

export const BODY_LANGUAGE: Record<string, string> = { json: 'json', xml: 'markup', text: 'text', sparql: 'text' };

export const BODY_CONTENT_TYPE: Record<string, string> = {
  'json': 'application/json',
  'xml': 'application/xml',
  'text': 'text/plain',
  'sparql': 'application/sparql-query',
  'form-urlencoded': 'application/x-www-form-urlencoded',
  'multipart-form': 'multipart/form-data',
  'file': 'application/octet-stream'
};
