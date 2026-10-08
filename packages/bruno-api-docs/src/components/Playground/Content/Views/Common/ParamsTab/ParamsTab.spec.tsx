import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { headerTexts } from '@/test-utils/dom';
import { ParamsTab } from './ParamsTab';

const noop = () => {};

describe('ParamsTab — descriptions', () => {
  it('shows a Description column with authored query-param descriptions', () => {
    const root = useRenderToDom(
      <ParamsTab
        params={[{ name: 'page', value: '1', type: 'query', description: 'Page number, 1-based' }]}
        onParamsChange={noop}
      />
    );
    expect(headerTexts(root)).toContain('Description');
    expect(root.text).toContain('Page number, 1-based');
  });

  it('normalizes an object-form ({content}) param description to its text', () => {
    const root = useRenderToDom(
      <ParamsTab
        params={[{ name: 'q', value: 'cats', type: 'query', description: { content: 'Search query', type: 'text' } }]}
        onParamsChange={noop}
      />
    );
    expect(root.text).toContain('Search query');
  });
});

describe('ParamsTab, column labels', () => {
  it('labels the first query column Name, matching the app', () => {
    const root = useRenderToDom(<ParamsTab params={[{ name: 'page', value: '1', type: 'query' }]} onParamsChange={noop} />);
    expect(headerTexts(root)[0]).toBe('Name');
  });
});
