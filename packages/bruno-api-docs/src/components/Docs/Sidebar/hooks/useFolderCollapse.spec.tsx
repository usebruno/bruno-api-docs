import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { DocumentProvider, useDocument, useNavModel } from '@/document/document';
import * as navModel from '@/routing/navModel';
import { useFolderCollapse } from './useFolderCollapse';

vi.mock('@/routing/navModel', async (importOriginal) => {
  const actual = await importOriginal<typeof navModel>();
  return { ...actual, buildNavModel: vi.fn(actual.buildNavModel) };
});

const collection = {
  info: { name: 'C' },
  items: [{ uuid: 'f1', info: { name: 'Folder', type: 'folder' }, items: [] }]
} as unknown as OpenCollection;

const renderToggling = (toggles: number) => {
  const seen: boolean[] = [];

  // A state update during render re-renders the same component with its hooks
  // kept, so each toggle here is a real re-render in which memos survive.
  const Probe = () => {
    useNavModel();
    const document = useDocument();
    const folders = useFolderCollapse(document);
    seen.push(folders.isCollapsed(document.items![0]));
    if (seen.length <= toggles) folders.toggle('f1');
    return null;
  };

  renderToStaticMarkup(<DocumentProvider document={collection}><Probe /></DocumentProvider>);
  return seen;
};

describe('useFolderCollapse', () => {
  it('toggles a folder without rebuilding the nav model', () => {
    vi.mocked(navModel.buildNavModel).mockClear();
    expect(renderToggling(2)).toEqual([true, false, true]);
    expect(navModel.buildNavModel).toHaveBeenCalledTimes(1);
  });
});
