import React from 'react';
import { describe, it, expect } from 'vitest';
import ResponseBodyTab from './ResponseBodyTab';
import { useRenderToDom } from '../../../../../hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '../../../../../test-utils/dom';

describe('ResponseBodyTab', () => {
  it('renders the large-response warning instead of the body when over the threshold', () => {
    const response = { size: 11 * 1024 * 1024, base64Data: 'AAAA', data: { hello: 'world' } };
    const root = useRenderToDom(
      <ResponseBodyTab response={response} selectedFormat="json" showPreview={false} contentType="application/json" />
    );
    expect(getByTestId(root, 'large-response-warning').text).toContain('Large Response Warning');
    expect(queryByTestId(root, 'large-response-view')).not.toBeNull();
  });
});
