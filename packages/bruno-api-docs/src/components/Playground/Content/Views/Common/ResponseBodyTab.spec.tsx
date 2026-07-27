import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import ResponseBodyTab from './ResponseBodyTab';

describe('ResponseBodyTab', () => {
  it('renders the large-response warning instead of the body when over the threshold', () => {
    const response = { size: 11 * 1024 * 1024, base64Data: 'AAAA', data: { hello: 'world' } };
    const html = renderToStaticMarkup(
      <ResponseBodyTab response={response} selectedFormat="json" showPreview={false} contentType="application/json" />
    );
    expect(html).toContain('data-testid="large-response-warning"');
    expect(html).toContain('Large Response Warning');
    expect(html).toContain('data-testid="large-response-view"');
  });
});
