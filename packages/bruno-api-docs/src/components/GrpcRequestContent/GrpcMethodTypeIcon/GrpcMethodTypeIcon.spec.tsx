import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { GrpcMethodTypeIcon } from './GrpcMethodTypeIcon';

describe('GrpcMethodTypeIcon', () => {
  it('colours each method type from its theme variable', () => {
    expect(renderToStaticMarkup(<GrpcMethodTypeIcon methodType="unary" />)).toContain(
      'color:var(--oc-request-methods-get)'
    );
    expect(renderToStaticMarkup(<GrpcMethodTypeIcon methodType="server-streaming" />)).toContain(
      'color:var(--oc-request-methods-put)'
    );
    expect(renderToStaticMarkup(<GrpcMethodTypeIcon methodType="client-streaming" />)).toContain(
      'color:var(--oc-request-methods-head)'
    );
    expect(renderToStaticMarkup(<GrpcMethodTypeIcon methodType="bidi-streaming" />)).toContain(
      'color:var(--oc-request-methods-post)'
    );
  });

  it('renders nothing when the method type is missing or unknown', () => {
    expect(renderToStaticMarkup(<GrpcMethodTypeIcon />)).toBe('');
    expect(renderToStaticMarkup(<GrpcMethodTypeIcon methodType={'oneway' as never} />)).toBe('');
  });
});
