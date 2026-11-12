import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { createOpenCollectionStore } from '@/store/store';
import {
  setPlaygroundCollection,
  toggleFolderCollapse,
  updatePlaygroundItem,
  updateCollectionEnvironments,
  selectHydratedCollection
} from '@/store/slices/playground';
import * as navModel from '@/routing/navModel';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import { DocumentProvider, useNavModel } from './document';

vi.mock('@/routing/navModel', async (importOriginal) => {
  const actual = await importOriginal<typeof navModel>();
  return { ...actual, buildNavModel: vi.fn(actual.buildNavModel) };
});

const raw = {
  info: { name: 'C' },
  config: { environments: [{ name: 'Dev', variables: [] }] },
  items: [
    {
      info: { name: 'Folder', type: 'folder' },
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

  it('stays as loaded while the playground seeded from it is edited', () => {
    const document = hydrateWithUUIDs(raw);
    const before = structuredClone(document);
    const folderUuid = (document.items![0] as { uuid: string }).uuid;
    const request = (document.items![0] as { items: { uuid: string }[] }).items[0];
    const store = createOpenCollectionStore();

    store.dispatch(setPlaygroundCollection(document));
    store.dispatch(toggleFolderCollapse(folderUuid));
    store.dispatch(updatePlaygroundItem({ uuid: request.uuid, item: { ...request, http: { method: 'POST' } } as never }));
    const working = selectHydratedCollection(store.getState())!;
    store.dispatch(updateCollectionEnvironments({ ...working, config: { environments: [] } }));

    expect(document).toEqual(before);
  });
});
