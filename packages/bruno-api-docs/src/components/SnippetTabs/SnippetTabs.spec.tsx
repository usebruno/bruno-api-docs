import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import { SnippetTabs, type Snippet } from './SnippetTabs';

const snippets: Snippet[] = [
  { id: 'grpcurl', label: 'grpcURL', language: 'bash', code: 'grpcurl -plaintext {{host}} pkg.Svc/Do' },
  { id: 'javascript', label: 'JavaScript', language: 'javascript', code: 'const grpc = require(\'@grpc/grpc-js\');' }
];

describe('SnippetTabs', () => {
  it('renders a tab per snippet and shows the first one', () => {
    const root = useRenderToDom(<SnippetTabs snippets={snippets} />);

    expect(getByTestId(root, 'request-code-snippet-tab-grpcurl').text).toBe('grpcURL');
    expect(getByTestId(root, 'request-code-snippet-tab-javascript').text).toBe('JavaScript');
    const code = getByTestId(root, 'request-code-snippet-code');
    expect(code.text).toContain('pkg.Svc/Do');
    expect(code.text).not.toContain('@grpc/grpc-js');
  });

  it('renders nothing when there are no snippets', () => {
    const root = useRenderToDom(<SnippetTabs snippets={[]} />);
    expect(queryByTestId(root, 'request-code-snippet')).toBeNull();
  });

  it('derives every child test id from the testId it is given', () => {
    const root = useRenderToDom(<SnippetTabs snippets={snippets} testId="grpc-request-code-snippet" />);

    expect(queryByTestId(root, 'grpc-request-code-snippet')).not.toBeNull();
    expect(queryByTestId(root, 'grpc-request-code-snippet-tab-grpcurl')).not.toBeNull();
    expect(queryByTestId(root, 'grpc-request-code-snippet-tab-javascript')).not.toBeNull();
    expect(queryByTestId(root, 'grpc-request-code-snippet-expand')).not.toBeNull();
    expect(queryByTestId(root, 'grpc-request-code-snippet-code')).not.toBeNull();
  });

  it('falls back to the request base when no testId is given', () => {
    const root = useRenderToDom(<SnippetTabs snippets={snippets} />);
    expect(queryByTestId(root, 'request-code-snippet-tab-grpcurl')).not.toBeNull();
  });

  it('marks the active tab as selected', () => {
    const root = useRenderToDom(<SnippetTabs snippets={snippets} />);

    expect(getByTestId(root, 'request-code-snippet-tab-grpcurl').attributes['aria-selected']).toBe('true');
    expect(getByTestId(root, 'request-code-snippet-tab-javascript').attributes['aria-selected']).toBe('false');
  });

  it('collapses to a trigger instead of the code box when embedded', () => {
    const root = useRenderToDom(
      <SnippetTabs snippets={snippets} variant="embedded" testId="example-code-snippet" />
    );

    expect(getByTestId(root, 'example-code-snippet-trigger').text).toContain('Code Snippet');
    expect(queryByTestId(root, 'example-code-snippet-code')).toBeNull();
    expect(queryByTestId(root, 'example-code-snippet-expand')).toBeNull();
  });

  it('renders variables in the code as hover tokens', () => {
    const root = useRenderToDom(<SnippetTabs snippets={snippets} />);

    const code = getByTestId(root, 'request-code-snippet-code');
    const token = code.querySelector('[data-var-name="host"]');
    expect(token).not.toBeNull();
    expect(code.text).toContain('{{host}}');
  });

  it('passes the snippet language through to the highlighter', () => {
    const root = useRenderToDom(
      <SnippetTabs snippets={[{ id: 'json', label: 'JSON', language: 'json', code: '{"a":1}' }]} />
    );

    const code = getByTestId(root, 'request-code-snippet-code');
    expect(code.querySelector('code.language-json')).not.toBeNull();
  });
});
