import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { createWorkspace } from '../session/workspace';
import * as navModel from '../routing/navModel';
import { hydrateWithUUIDs } from '../utils/fileUtils';
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

  it('stays as loaded while the playground seeded from it is edited', () => {
    const document = hydrateWithUUIDs(raw);
    const before = structuredClone(document);
    const folder = document.items![0] as { uuid: string; items: { uuid: string }[] };
    const request = folder.items[0];
    const workspace = createWorkspace();

    workspace.replaceCollection(document);
    workspace.updateRequestItem({ uuid: request.uuid, item: { ...request, http: { method: 'POST' } } as never });
    workspace.setVariable({ scope: 'environment', name: 'v', value: 'edited', envName: 'Dev' });
    workspace.applyScriptVariableChanges({
      environmentVariables: { envName: 'Dev', variables: { v: 'script', added: 'x' }, deleted: [] },
      collectionVariables: { variables: { c: 'script' }, deleted: [] }
    });
    workspace.setVariable({ scope: 'folder', name: 'fv', value: 'edited', itemUuid: folder.uuid });
    workspace.updateFolder({ uuid: folder.uuid, folder: { ...folder, request: { headers: [] } } as never });
    const working = workspace.get().collection!;
    workspace.replaceCollection({ ...working, config: { environments: [] } });

    expect(document).toEqual(before);
    expect(workspace.get().collection).not.toEqual(before);
  });
});
