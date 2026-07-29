import React from 'react';
import { describe, it, expect } from 'vitest';
import TextPreview from './TextPreview';
import HtmlPreview from './HtmlPreview/HtmlPreview';
import { useRenderToDom } from '../../../hooks/useRenderToDom';
import { query } from '../../../test-utils/dom';
import { formatToPreviewMode } from '../../../constants';

describe('formatToPreviewMode', () => {
  it('maps formats to preview modes', () => {
    expect(formatToPreviewMode('html')).toBe('preview-web');
    expect(formatToPreviewMode('json')).toBe('preview-json');
    expect(formatToPreviewMode('xml')).toBe('preview-xml');
    expect(formatToPreviewMode('javascript')).toBe('preview-web');
    expect(formatToPreviewMode('raw')).toBe('preview-text');
    expect(formatToPreviewMode('base64')).toBe('preview-text');
    expect(formatToPreviewMode('hex')).toBe('preview-text');
  });

  it('maps byte formats to binary previews by content type', () => {
    expect(formatToPreviewMode('base64', 'image/png')).toBe('preview-image');
    expect(formatToPreviewMode('base64', 'application/pdf')).toBe('preview-pdf');
    expect(formatToPreviewMode('hex', 'audio/mpeg')).toBe('preview-audio');
    expect(formatToPreviewMode('hex', 'video/mp4')).toBe('preview-video');
    expect(formatToPreviewMode('base64', 'application/octet-stream')).toBe('preview-text');
  });
});

describe('TextPreview', () => {
  it('stringifies object data', () => {
    const root = useRenderToDom(<TextPreview data={{ a: 1 }} />);
    expect(root.text).toContain('{"a":1}');
  });
});

describe('HtmlPreview', () => {
  it('renders a sandboxed iframe with an injected base href and no scripts', () => {
    const root = useRenderToDom(<HtmlPreview data="<body>hi</body>" baseUrl="https://api.example.com/" />);
    const iframe = query(root, 'iframe');
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('base href=');
  });
});
