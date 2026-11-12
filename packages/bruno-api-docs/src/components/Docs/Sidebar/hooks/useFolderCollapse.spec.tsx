import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import type { OpenCollection } from '@opencollection/types';
import { createOpenCollectionStore } from '@/store/store';
import { setDocsCollection, selectDocsCollection } from '@/store/slices/docs';
import { useNavModel } from '@/routing/hooks';
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
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(collection));
  const document = selectDocsCollection(store.getState());
  const seen: boolean[] = [];

  // A state update during render re-renders the same component with its hooks
  // kept, so each toggle here is a real re-render in which memos survive.
  const Probe = () => {
    useNavModel();
    const folders = useFolderCollapse(document);
    seen.push(folders.isCollapsed(document!.items![0]));
    if (seen.length <= toggles) folders.toggle('f1');
    return null;
  };

  renderToStaticMarkup(<Provider store={store}><Probe /></Provider>);
  return seen;
};

describe('useFolderCollapse', () => {
  it('toggles a folder without rebuilding the nav model', () => {
    vi.mocked(navModel.buildNavModel).mockClear();
    expect(renderToggling(2)).toEqual([true, false, true]);
    expect(navModel.buildNavModel).toHaveBeenCalledTimes(1);
  });
});
