import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import * as navModel from '../routing/navModel';
import { DocumentProvider, useNavModel } from './document';

vi.mock('../routing/navModel', async (importOriginal) => {
  const actual = await importOriginal<typeof navModel>();
  return { ...actual, buildNavModel: vi.fn(actual.buildNavModel) };
});

const raw = {
  info: { name: 'C' },
  config: { environments: [{ name: 'Dev', variables: [{ name: 'v', value: '1' }] }] },
  items: [
    {
      info: { name: 'Folder', type: 'folder' },
      request: { variables: [{ name: 'fv', value: '1' }] },
      items: [{ info: { name: 'Ping', type: 'http' }, http: { method: 'GET', url: 'https://x.test' } }]
    }
  ]
} as unknown as OpenCollection;

describe('document', () => {
  it('builds the nav model once for every reader of a document', () => {
    vi.mocked(navModel.buildNavModel).mockClear();
    const Reader = () => {
      useNavModel();
      return null;
    };
    renderToStaticMarkup(
      <DocumentProvider document={raw}>
        <Reader />
        <Reader />
        <Reader />
      </DocumentProvider>
    );
    expect(navModel.buildNavModel).toHaveBeenCalledTimes(1);
  });
});
