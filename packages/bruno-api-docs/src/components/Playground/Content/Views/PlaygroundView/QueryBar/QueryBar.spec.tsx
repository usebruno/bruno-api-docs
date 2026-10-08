import React from 'react';
import { describe, it, expect } from 'vitest';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { queryByTestId } from '@/test-utils/dom';
import { getHttpParams, getRequestUrl } from '@/utils/schemaHelpers';
import QueryBar, { applyUrlChange } from './QueryBar';

const item: HttpRequest = {
  info: { name: 'Get Customer', type: 'http' },
  http: {
    method: 'get',
    url: '{{baseUrl}}/billing/customers/:customerId',
    headers: [{ name: 'Accept', value: 'application/json' }],
    params: [{ name: 'customerId', value: '42', type: 'path' }]
  }
} as HttpRequest;

const queryBar = <QueryBar item={item} onSendRequest={() => {}} isLoading={false} onItemChange={() => {}} />;

describe('Playground QueryBar: code snippet', () => {
  it('offers the code-snippet control alongside the copy-url action', () => {
    const root = useRenderToDom(queryBar);

    expect(queryByTestId(root, 'query-bar-code-snippet-trigger')).not.toBeNull();
    expect(queryByTestId(root, 'query-bar-copy-url')).not.toBeNull();
  });
});

describe('Playground QueryBar: editing the url', () => {
  const original = 'https://www.httpfaker.org/api/random/json?size=10mb';
  const withLegacyUrl = () =>
    ({ url: original, http: { method: 'get', url: original, params: [] } }) as unknown as HttpRequest;

  it('leaves the box empty when the user clears it, instead of putting the old url back', () => {
    expect(getRequestUrl(applyUrlChange(withLegacyUrl(), ''))).toBe('');
  });

  it('lets the user clear the box and type a completely new url', () => {
    let request = applyUrlChange(withLegacyUrl(), '');
    for (const character of 'https://api.new/v1') {
      request = applyUrlChange(request, getRequestUrl(request) + character);
    }
    expect(getRequestUrl(request)).toBe('https://api.new/v1');
  });

  it('saves a url the user types over the top of the old one', () => {
    expect(getRequestUrl(applyUrlChange(withLegacyUrl(), 'https://api.test/v2'))).toBe('https://api.test/v2');
  });

  it('still picks up path parameters as the user types them into the url', () => {
    const request = applyUrlChange(withLegacyUrl(), 'https://api.test/users/:userId');
    expect(getHttpParams(request)).toContainEqual(expect.objectContaining({ name: 'userId', type: 'path' }));
  });
});
