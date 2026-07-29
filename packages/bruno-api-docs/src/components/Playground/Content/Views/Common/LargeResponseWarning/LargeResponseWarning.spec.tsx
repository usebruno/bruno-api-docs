import React from 'react';
import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/utils/exampleResponse';
import { LargeResponseWarning } from './LargeResponseWarning';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { query, getByTestId } from '@/test-utils/dom';
import type { RunRequestResponse } from '@/runner';

describe('LargeResponseWarning', () => {
  const responseSize = 11 * 1024 * 1024;
  const response: RunRequestResponse = { data: { hello: 'world' }, base64Data: 'aGVsbG8=' };

  it('renders the warning icon', () => {
    const root = useRenderToDom(<LargeResponseWarning responseSize={responseSize} onReveal={() => {}} />);
    query(root, '.warning-icon');
  });

  it('renders the warning title', () => {
    const root = useRenderToDom(
      <LargeResponseWarning responseSize={responseSize} response={response} onReveal={() => {}} />
    );
    expect(query(root, '.large-response-title').text).toContain('Large Response Warning');
  });

  it('renders the formatted current response size', () => {
    const root = useRenderToDom(
      <LargeResponseWarning responseSize={responseSize} response={response} onReveal={() => {}} />
    );
    expect(root.text).toContain(formatBytes(responseSize));
  });

  it('renders a View button with the reveal test id', () => {
    const root = useRenderToDom(
      <LargeResponseWarning responseSize={responseSize} response={response} onReveal={() => {}} />
    );
    const view = getByTestId(root, 'large-response-view');
    expect(view.tagName).toBe('BUTTON');
    expect(view.text.trim()).toBe('View');
  });

  it('renders the Copy control', () => {
    const root = useRenderToDom(
      <LargeResponseWarning responseSize={responseSize} response={response} onReveal={() => {}} />
    );
    expect(getByTestId(root, 'large-response-copy')).toBeTruthy();
  });

  it('renders a Download button', () => {
    const root = useRenderToDom(
      <LargeResponseWarning responseSize={responseSize} response={response} onReveal={() => {}} />
    );
    const download = getByTestId(root, 'large-response-download');
    expect(download.tagName).toBe('BUTTON');
    expect(download.text.trim()).toBe('Download');
  });
});
