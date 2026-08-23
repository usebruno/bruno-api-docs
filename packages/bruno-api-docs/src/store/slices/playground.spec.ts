import { describe, it, expect } from 'vitest';
import reducer, {
  setPlaygroundCollection,
  updateCollectionEnvironments,
  updatePlaygroundItem,
  resetPlaygroundEnvironments,
  selectHydratedCollection,
  selectPlaygroundCollection,
  setViewMode,
  setSelectedExampleIndex,
  clearPlaygroundCollection,
  toggleFolderCollapse,
  expandFolders,
  setPlaygroundVariable,
  applyScriptVariableChanges
} from './playground';
import { createOpenCollectionStore } from '@/store/store';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';

const makeCollection = () =>
  ({
    info: { name: 'Test', version: '1.0.0' },
    config: {
      environments: [
        { name: 'Dev', variables: [{ name: 'a', value: '1' }, { name: 'b', value: '2' }] }
      ]
    },
    items: []
  }) as any;

const envVariables = (store: ReturnType<typeof createOpenCollectionStore>) =>
  selectHydratedCollection(store.getState())!.config!.environments![0].variables!;

const envExternalSecrets = (store: ReturnType<typeof createOpenCollectionStore>) =>
  (selectHydratedCollection(store.getState())!.config!.environments![0].externalSecrets!
    .variables as unknown) as { name: string; value?: string; secretName?: string }[];

describe('resetPlaygroundEnvironments', () => {
  it('restores the original environments after an edit', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(makeCollection()));

    const edited = makeCollection();
    edited.config.environments[0].variables = [{ name: 'a', value: '1' }];
    store.dispatch(updateCollectionEnvironments(edited));
    expect(envVariables(store)).toHaveLength(1);

    store.dispatch(resetPlaygroundEnvironments());
    expect(envVariables(store).map((v: any) => v.name)).toEqual(['a', 'b']);
  });

  it('keeps the restore independent of later edits (cloned, not shared)', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(makeCollection()));

    store.dispatch(resetPlaygroundEnvironments());
    const edited = makeCollection();
    edited.config.environments[0].variables = [];
    store.dispatch(updateCollectionEnvironments(edited));

    store.dispatch(resetPlaygroundEnvironments());
    expect(envVariables(store)).toHaveLength(2);
  });
});

describe('playground example view', () => {
  it('accepts the example view mode', () => {
    const s = reducer(undefined, setViewMode('example'));
    expect(s.viewMode).toBe('example');
  });

  it('sets and resets the selected example index', () => {
    const set = reducer(undefined, setSelectedExampleIndex(3));
    expect(set.selectedExampleIndex).toBe(3);
    const cleared = reducer(set, clearPlaygroundCollection());
    expect(cleared.selectedExampleIndex).toBeNull();
  });
});

describe('updatePlaygroundItem', () => {
  const withRequest = () =>
    ({
      info: { name: 'Test', version: '1.0.0' },
      items: [{ type: 'http', uuid: 'r1', name: 'Req', http: { url: 'old', method: 'GET' } }]
    }) as unknown as OpenCollectionCollection;

  const firstItem = (store: ReturnType<typeof createOpenCollectionStore>, select: typeof selectHydratedCollection) =>
    select(store.getState())!.items![0] as unknown as { uuid: string; http: { url: string } };

  it('updates the item in the hydrated collection (what the UI renders) as well as the base collection', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withRequest()));

    const updated = { type: 'http', uuid: 'r1', name: 'Req', http: { url: 'new', method: 'GET' } };
    store.dispatch(updatePlaygroundItem({ uuid: 'r1', item: updated as unknown as HttpRequest }));

    // The tree the UI reads must reflect the edit, with the uuid preserved so findItemByUuid resolves.
    expect(firstItem(store, selectHydratedCollection).http.url).toBe('new');
    expect(firstItem(store, selectHydratedCollection).uuid).toBe('r1');
    expect(firstItem(store, selectPlaygroundCollection).http.url).toBe('new');
  });
});

describe('setPlaygroundVariable', () => {
  it('edits an environment variable in both the hydrated and base collections', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(makeCollection()));

    store.dispatch(setPlaygroundVariable({ scope: 'environment', name: 'a', value: '99', envName: 'Dev' }));

    expect((envVariables(store).find((v) => v.name === 'a') as unknown as { value: string }).value).toBe('99');
    const base = selectPlaygroundCollection(store.getState())!.config!.environments![0].variables!;
    expect((base.find((v) => v.name === 'a') as unknown as { value: string }).value).toBe('99');
  });

  it('edits the last enabled duplicate, matching the resolver', () => {
    const collection = makeCollection();
    collection.config.environments[0].variables = [
      { name: 'dup', value: 'first' },
      { name: 'dup', value: 'shadowed', disabled: true },
      { name: 'dup', value: 'winner' }
    ];
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(collection));

    store.dispatch(setPlaygroundVariable({ scope: 'environment', name: 'dup', value: 'edited', envName: 'Dev' }));

    const values = envVariables(store)
      .filter((v: any) => v.name === 'dup')
      .map((v: any) => v.value);
    expect(values).toEqual(['first', 'shadowed', 'edited']);
  });

  it('edits a collection variable', () => {
    const collection = makeCollection();
    collection.request = { variables: [{ name: 'cv', value: 'x' }] };
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(collection));

    store.dispatch(setPlaygroundVariable({ scope: 'collection', name: 'cv', value: 'y' }));

    const vars = selectHydratedCollection(store.getState())!.request!.variables!;
    expect((vars as any).find((v: any) => v.name === 'cv').value).toBe('y');
  });

  it('edits a request variable located by item uuid', () => {
    const collection = {
      info: { name: 'Test', version: '1.0.0' },
      items: [
        { type: 'http', uuid: 'r1', name: 'Req', http: { url: 'u', method: 'GET' }, variables: [{ name: 'rv', value: '1' }] }
      ]
    } as unknown as OpenCollectionCollection;
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(collection));

    store.dispatch(setPlaygroundVariable({ scope: 'request', name: 'rv', value: '2', itemUuid: 'r1' }));

    const item = selectHydratedCollection(store.getState())!.items![0] as unknown as { variables: any[] };
    expect(item.variables.find((v) => v.name === 'rv').value).toBe('2');
  });

  it('writes a session value to a secret variable, keeping it marked secret', () => {
    const collection = makeCollection();
    collection.config.environments[0].variables.push({ name: 'sec', secret: true });
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(collection));

    store.dispatch(setPlaygroundVariable({ scope: 'environment', name: 'sec', value: 'typed', envName: 'Dev' }));

    const sec = envVariables(store).find((v) => v.name === 'sec') as { value: string; secret: boolean };
    expect(sec.value).toBe('typed');
    expect(sec.secret).toBe(true);
  });

  it('writes a session value to an external secret pointer', () => {
    const collection = makeCollection();
    collection.config.environments[0].externalSecrets = {
      type: 'aws-secrets-manager',
      variables: [{ name: 'vaultKey', secretName: 'prod/api-key' }]
    };
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(collection));

    store.dispatch(setPlaygroundVariable({ scope: '$secrets', name: 'vaultKey', value: 'typed', envName: 'Dev' }));

    const [vaultKey] = envExternalSecrets(store);
    expect(vaultKey.value).toBe('typed');
    expect(vaultKey.secretName).toBe('prod/api-key');
  });
});

describe('playground folder collapse', () => {
  const withFolder = () =>
    ({
      info: { name: 'Test', version: '1.0.0' },
      items: [{ type: 'folder', uuid: 'f1', name: 'Folder', isCollapsed: false, items: [] }]
    }) as unknown as OpenCollectionCollection;
  const folder = (store: ReturnType<typeof createOpenCollectionStore>) =>
    selectHydratedCollection(store.getState())!.items![0] as { isCollapsed?: boolean };

  it('expandFolders reveals a collapsed folder', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withFolder()));
    store.dispatch(toggleFolderCollapse('f1'));
    expect(folder(store).isCollapsed).toBe(true);

    store.dispatch(expandFolders(['f1']));
    expect(folder(store).isCollapsed).toBe(false);
  });

  it('expandFolders keeps an already-open folder open (never collapses)', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withFolder()));
    store.dispatch(expandFolders(['f1']));
    expect(folder(store).isCollapsed).toBe(false);
  });
});

describe('applyScriptVariableChanges', () => {
  type NamedValue = { name: string; value: string };
  interface CollectionView {
    config: { environments: { name: string; variables: NamedValue[] }[] };
    request: { variables: NamedValue[] };
    items: { uuid: string; body: { data: string } }[];
  }

  const withRequestAndEnv = () =>
    ({
      info: { name: 'Test', version: '1.0.0' },
      config: { environments: [{ name: 'Dev', variables: [{ name: 'a', value: '1' }] }] },
      request: { variables: [{ name: 'c', value: 'keep' }] },
      items: [{ type: 'http', uuid: 'r1', name: 'req', method: 'GET', url: 'https://example.com', body: { type: 'text', data: 'original' } }]
    }) as unknown as OpenCollectionCollection;

  const view = (store: ReturnType<typeof createOpenCollectionStore>): CollectionView => {
    const collection = selectHydratedCollection(store.getState());
    if (!collection) throw new Error('expected a hydrated collection');
    return collection as unknown as CollectionView;
  };

  const devEnvVariables = (store: ReturnType<typeof createOpenCollectionStore>): NamedValue[] =>
    view(store).config.environments[0].variables;

  it('reconciles environment variables onto the current collection', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withRequestAndEnv()));

    store.dispatch(applyScriptVariableChanges({
      environmentVariables: { envName: 'Dev', variables: { a: 'updated', added: 'x' }, deleted: [] }
    }));

    expect(devEnvVariables(store)).toEqual([{ name: 'a', value: 'updated' }, { name: 'added', value: 'x' }]);
  });

  it('reconciles collection variables onto the current collection', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withRequestAndEnv()));

    store.dispatch(applyScriptVariableChanges({ collectionVariables: { variables: { c: 'changed', d: '2' }, deleted: [] } }));

    expect(view(store).request.variables).toEqual([{ name: 'c', value: 'changed' }, { name: 'd', value: '2' }]);
  });

  it('deletes only the variables named in deleted and leaves the rest', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withRequestAndEnv()));

    store.dispatch(applyScriptVariableChanges({
      environmentVariables: { envName: 'Dev', variables: {}, deleted: ['a'] },
      collectionVariables: { variables: { d: '2' }, deleted: ['c'] }
    }));

    expect(devEnvVariables(store)).toEqual([]);
    expect(view(store).request.variables).toEqual([{ name: 'd', value: '2' }]);
  });

  it('leaves store variables the delta never mentions untouched (upsert-only, not a full replace)', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withRequestAndEnv()));

    store.dispatch(applyScriptVariableChanges({
      environmentVariables: { envName: 'Dev', variables: { added: 'x' }, deleted: [] },
      collectionVariables: { variables: { d: '2' }, deleted: [] }
    }));

    expect(devEnvVariables(store)).toEqual([{ name: 'a', value: '1' }, { name: 'added', value: 'x' }]);
    expect(view(store).request.variables).toEqual([{ name: 'c', value: 'keep' }, { name: 'd', value: '2' }]);
  });

  it('keeps a request edit made while the request was in flight', () => {
    const store = createOpenCollectionStore();
    store.dispatch(setPlaygroundCollection(withRequestAndEnv()));

    const inFlightItem = view(store).items[0];
    store.dispatch(updatePlaygroundItem({
      uuid: inFlightItem.uuid,
      item: { ...inFlightItem, body: { type: 'text', data: 'edited while loading' } } as unknown as HttpRequest
    }));

    store.dispatch(applyScriptVariableChanges({
      environmentVariables: { envName: 'Dev', variables: { a: 'fromScript' }, deleted: [] }
    }));

    expect(view(store).items[0].body.data).toBe('edited while loading');
    expect(devEnvVariables(store)).toEqual([{ name: 'a', value: 'fromScript' }]);
  });
});
