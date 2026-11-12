import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Folder } from '@opencollection/types/collection/item';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import {
  EMPTY_WORKSPACE,
  setCollection,
  clearCollection,
  updateRequestItem,
  updateScriptFile,
  updateFolder,
  setVariable,
  applyScriptVariableChanges,
  setResponse,
  clearResponse,
  startRequest,
  finishRequest,
  clearAllRequests,
  createWorkspace,
  type WorkspaceState
} from './workspace';

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const seeded = (collection: OpenCollectionCollection): WorkspaceState =>
  deepFreeze(setCollection(EMPTY_WORKSPACE, hydrateWithUUIDs(collection)));

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

const envVariables = (state: WorkspaceState) => state.collection!.config!.environments![0].variables!;

const envExternalSecrets = (state: WorkspaceState) =>
  (state.collection!.config!.environments![0].externalSecrets!
    .variables as unknown) as { name: string; value?: string; secretName?: string }[];

describe('updateRequestItem', () => {
  const withRequest = () =>
    ({
      info: { name: 'Test', version: '1.0.0' },
      items: [{ type: 'http', uuid: 'r1', name: 'Req', http: { url: 'old', method: 'GET' } }]
    }) as unknown as OpenCollectionCollection;

  const firstItem = (state: WorkspaceState) =>
    state.collection!.items![0] as unknown as { uuid: string; http: { url: string } };

  it('updates the item in the hydrated collection (what the UI renders)', () => {
    const state = seeded(withRequest());

    const updated = { type: 'http', uuid: 'r1', name: 'Req', http: { url: 'new', method: 'GET' } };
    const next = updateRequestItem(state, { uuid: 'r1', item: updated as unknown as HttpRequest });

    expect(firstItem(next).http.url).toBe('new');
    expect(firstItem(next).uuid).toBe('r1');
  });

  it('returns the same state when no item has the uuid', () => {
    const state = seeded(withRequest());
    expect(updateRequestItem(state, { uuid: 'missing', item: {} as HttpRequest })).toBe(state);
  });
});

describe('updateScriptFile', () => {
  const withScript = () =>
    ({
      info: { name: 'Test', version: '1.0.0' },
      items: [{ info: { name: 'helpers', type: 'script' }, uuid: 's1', script: 'const a = 1;' }]
    }) as unknown as OpenCollectionCollection;

  const scriptSource = (state: WorkspaceState) => (state.collection!.items![0] as unknown as { script: string }).script;

  it('edits the script in the hydrated collection', () => {
    const next = updateScriptFile(seeded(withScript()), { uuid: 's1', script: 'const a = 2;' });

    expect(scriptSource(next)).toBe('const a = 2;');
  });

  it('restores the original source when the collection is loaded again', () => {
    const edited = updateScriptFile(seeded(withScript()), { uuid: 's1', script: 'const a = 2;' });

    const reloaded = setCollection(edited, withScript());

    expect(scriptSource(reloaded)).toBe('const a = 1;');
  });

  it('returns the same state when the script is unchanged', () => {
    const state = seeded(withScript());
    expect(updateScriptFile(state, { uuid: 's1', script: 'const a = 1;' })).toBe(state);
  });
});

describe('setVariable', () => {
  it('edits an environment variable in the hydrated collection', () => {
    const next = setVariable(seeded(makeCollection()), { scope: 'environment', name: 'a', value: '99', envName: 'Dev' });

    expect((envVariables(next).find((v) => v.name === 'a') as unknown as { value: string }).value).toBe('99');
  });

  it('edits the last enabled duplicate, matching the resolver', () => {
    const collection = makeCollection();
    collection.config.environments[0].variables = [
      { name: 'dup', value: 'first' },
      { name: 'dup', value: 'shadowed', disabled: true },
      { name: 'dup', value: 'winner' }
    ];

    const next = setVariable(seeded(collection), { scope: 'environment', name: 'dup', value: 'edited', envName: 'Dev' });

    const values = envVariables(next)
      .filter((v: any) => v.name === 'dup')
      .map((v: any) => v.value);
    expect(values).toEqual(['first', 'shadowed', 'edited']);
  });

  it('edits a collection variable', () => {
    const collection = makeCollection();
    collection.request = { variables: [{ name: 'cv', value: 'x' }] };

    const next = setVariable(seeded(collection), { scope: 'collection', name: 'cv', value: 'y' });

    expect((next.collection!.request!.variables as any).find((v: any) => v.name === 'cv').value).toBe('y');
  });

  it('edits a request variable located by item uuid', () => {
    const collection = {
      info: { name: 'Test', version: '1.0.0' },
      items: [
        { type: 'http', uuid: 'r1', name: 'Req', http: { url: 'u', method: 'GET' }, variables: [{ name: 'rv', value: '1' }] }
      ]
    } as unknown as OpenCollectionCollection;

    const next = setVariable(seeded(collection), { scope: 'request', name: 'rv', value: '2', itemUuid: 'r1' });

    const item = next.collection!.items![0] as unknown as { variables: any[] };
    expect(item.variables.find((v) => v.name === 'rv').value).toBe('2');
  });

  it('edits a request variable in the runtime block', () => {
    const collection = {
      info: { name: 'Test', version: '1.0.0' },
      items: [{ type: 'http', uuid: 'r1', runtime: { variables: [{ name: 'rv', value: '1' }] } }]
    } as unknown as OpenCollectionCollection;

    const next = setVariable(seeded(collection), { scope: 'request', name: 'rv', value: '2', itemUuid: 'r1' });

    expect((next.collection!.items![0] as any).runtime.variables[0].value).toBe('2');
  });

  it('edits a folder variable on the folder request', () => {
    const collection = {
      info: { name: 'Test', version: '1.0.0' },
      items: [{ info: { name: 'F', type: 'folder' }, uuid: 'f1', request: { variables: [{ name: 'fv', value: '1' }] }, items: [] }]
    } as unknown as OpenCollectionCollection;

    const next = setVariable(seeded(collection), { scope: 'folder', name: 'fv', value: '2', itemUuid: 'f1' });

    expect((next.collection!.items![0] as any).request.variables[0].value).toBe('2');
  });

  it('writes a session value to a secret variable, keeping it marked secret', () => {
    const collection = makeCollection();
    collection.config.environments[0].variables.push({ name: 'sec', secret: true });

    const next = setVariable(seeded(collection), { scope: 'environment', name: 'sec', value: 'typed', envName: 'Dev' });

    const sec = envVariables(next).find((v) => v.name === 'sec') as { value: string; secret: boolean };
    expect(sec.value).toBe('typed');
    expect(sec.secret).toBe(true);
  });

  it('writes a session value to an external secret pointer', () => {
    const collection = makeCollection();
    collection.config.environments[0].externalSecrets = {
      type: 'aws-secrets-manager',
      variables: [{ name: 'vaultKey', secretName: 'prod/api-key' }]
    };

    const next = setVariable(seeded(collection), { scope: '$secrets', name: 'vaultKey', value: 'typed', envName: 'Dev' });

    const [vaultKey] = envExternalSecrets(next);
    expect(vaultKey.value).toBe('typed');
    expect(vaultKey.secretName).toBe('prod/api-key');
  });

  it('writes root-level environments where they live', () => {
    const collection = { info: { name: 'T' }, environments: [{ name: 'Dev', variables: [{ name: 'a', value: '1' }] }] } as any;

    const next = setVariable(seeded(collection), { scope: 'environment', name: 'a', value: '2', envName: 'Dev' });

    expect((next.collection as any).environments[0].variables[0].value).toBe('2');
    expect((next.collection as any).config).toBeUndefined();
  });

  it('returns the same state when the value, variable, env or item is not there to change', () => {
    const state = seeded(makeCollection());
    expect(setVariable(state, { scope: 'environment', name: 'a', value: '1', envName: 'Dev' })).toBe(state);
    expect(setVariable(state, { scope: 'environment', name: 'nope', value: '1', envName: 'Dev' })).toBe(state);
    expect(setVariable(state, { scope: 'environment', name: 'a', value: '9', envName: 'Prod' })).toBe(state);
    expect(setVariable(state, { scope: 'collection', name: 'a', value: '9' })).toBe(state);
    expect(setVariable(state, { scope: 'request', name: 'a', value: '9', itemUuid: 'r1' })).toBe(state);
    expect(setVariable(EMPTY_WORKSPACE, { scope: 'collection', name: 'a', value: '9' })).toBe(EMPTY_WORKSPACE);
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

  const view = (state: WorkspaceState): CollectionView => {
    if (!state.collection) throw new Error('expected a hydrated collection');
    return state.collection as unknown as CollectionView;
  };

  const devEnvVariables = (state: WorkspaceState): NamedValue[] => view(state).config.environments[0].variables;

  it('reconciles environment variables onto the current collection', () => {
    const next = applyScriptVariableChanges(seeded(withRequestAndEnv()), {
      environmentVariables: { envName: 'Dev', variables: { a: 'updated', added: 'x' }, deleted: [] }
    });

    expect(devEnvVariables(next)).toEqual([{ name: 'a', value: 'updated' }, { name: 'added', value: 'x' }]);
  });

  it('reconciles collection variables onto the current collection', () => {
    const next = applyScriptVariableChanges(seeded(withRequestAndEnv()), {
      collectionVariables: { variables: { c: 'changed', d: '2' }, deleted: [] }
    });

    expect(view(next).request.variables).toEqual([{ name: 'c', value: 'changed' }, { name: 'd', value: '2' }]);
  });

  it('deletes only the variables named in deleted and leaves the rest', () => {
    const next = applyScriptVariableChanges(seeded(withRequestAndEnv()), {
      environmentVariables: { envName: 'Dev', variables: {}, deleted: ['a'] },
      collectionVariables: { variables: { d: '2' }, deleted: ['c'] }
    });

    expect(devEnvVariables(next)).toEqual([]);
    expect(view(next).request.variables).toEqual([{ name: 'd', value: '2' }]);
  });

  it('leaves store variables the delta never mentions untouched (upsert-only, not a full replace)', () => {
    const next = applyScriptVariableChanges(seeded(withRequestAndEnv()), {
      environmentVariables: { envName: 'Dev', variables: { added: 'x' }, deleted: [] },
      collectionVariables: { variables: { d: '2' }, deleted: [] }
    });

    expect(devEnvVariables(next)).toEqual([{ name: 'a', value: '1' }, { name: 'added', value: 'x' }]);
    expect(view(next).request.variables).toEqual([{ name: 'c', value: 'keep' }, { name: 'd', value: '2' }]);
  });

  it('keeps a request edit made while the request was in flight', () => {
    const state = seeded(withRequestAndEnv());

    const inFlightItem = view(state).items[0];
    const edited = updateRequestItem(state, {
      uuid: inFlightItem.uuid,
      item: { ...inFlightItem, body: { type: 'text', data: 'edited while loading' } } as unknown as HttpRequest
    });

    const next = applyScriptVariableChanges(edited, {
      environmentVariables: { envName: 'Dev', variables: { a: 'fromScript' }, deleted: [] }
    });

    expect(view(next).items[0].body.data).toBe('edited while loading');
    expect(devEnvVariables(next)).toEqual([{ name: 'a', value: 'fromScript' }]);
  });

  it('creates the collection request block when there is none', () => {
    const next = applyScriptVariableChanges(seeded(makeCollection()), {
      collectionVariables: { variables: { d: '2' }, deleted: [] }
    });

    expect(next.collection!.request!.variables).toEqual([{ name: 'd', value: '2' }]);
  });

  it('returns the same state when there is nothing to apply it to', () => {
    const state = seeded(withRequestAndEnv());
    expect(applyScriptVariableChanges(state, {})).toBe(state);
    expect(applyScriptVariableChanges(state, {
      environmentVariables: { envName: 'Prod', variables: { a: 'x' }, deleted: [] }
    })).toBe(state);
    expect(applyScriptVariableChanges(EMPTY_WORKSPACE, { collectionVariables: { variables: {}, deleted: [] } }))
      .toBe(EMPTY_WORKSPACE);
  });
});

describe('updateFolder', () => {
  const withNested = () =>
    ({
      info: { name: 'Test' },
      items: [
        {
          info: { name: 'Outer', type: 'folder' },
          uuid: 'f1',
          items: [
            { info: { name: 'Inner', type: 'folder' }, uuid: 'f2', request: { headers: [] }, items: [] },
            { type: 'http', uuid: 'r1', http: { url: 'u' } }
          ]
        },
        { type: 'http', uuid: 'r2', http: { url: 'v' } }
      ]
    }) as unknown as OpenCollectionCollection;

  it('merges the folder into the one with the uuid and copies only its path', () => {
    const state = seeded(withNested());
    const [outer, sibling] = state.collection!.items as any[];
    const folder = { ...outer.items[0], request: { headers: [{ name: 'h', value: '1' }] } } as Folder;

    const next = updateFolder(state, { uuid: 'f2', folder });

    const [nextOuter, nextSibling] = next.collection!.items as any[];
    expect(nextOuter.items[0].request.headers).toEqual([{ name: 'h', value: '1' }]);
    expect(nextOuter).not.toBe(outer);
    expect(nextOuter.items[1]).toBe(outer.items[1]);
    expect(nextSibling).toBe(sibling);
    expect(next.collection!.info).toBe(state.collection!.info);
  });

  it('returns the same state when every field is already the same', () => {
    const state = seeded(withNested());
    const inner = (state.collection!.items![0] as any).items[0];
    expect(updateFolder(state, { uuid: 'f2', folder: { ...inner } })).toBe(state);
  });
});

describe('setCollection and clearCollection', () => {
  it('swaps in the edited collection and bails out when it is the same one', () => {
    const state = seeded(makeCollection());
    const edited = { ...state.collection!, request: { headers: [] } } as OpenCollectionCollection;

    expect(setCollection(state, edited).collection).toBe(edited);
    expect(setCollection(state, state.collection!)).toBe(state);
  });

  it('keeps responses and run starts across a re-seed', () => {
    const state = startRequest(setResponse(seeded(makeCollection()), { uuid: 'r1', response: { status: 200 } }), {
      uuid: 'r1',
      startedAt: 1
    });
    const next = setCollection(state, hydrateWithUUIDs(makeCollection()));

    expect(next.responses).toBe(state.responses);
    expect(next.requestStartedAt).toBe(state.requestStartedAt);
  });

  it('a null collection empties it, and is a no-op when already empty', () => {
    expect(setCollection(seeded(makeCollection()), null).collection).toBeNull();
    expect(setCollection(EMPTY_WORKSPACE, null)).toBe(EMPTY_WORKSPACE);
  });

  it('clearing drops the collection, responses and run starts', () => {
    expect(clearCollection()).toEqual(EMPTY_WORKSPACE);
  });
});

describe('responses and run starts', () => {
  it('sets and clears a response by uuid, bailing out on no-ops', () => {
    const response = { status: 200 };
    const withResponse = deepFreeze(setResponse(EMPTY_WORKSPACE, { uuid: 'r1', response }));

    expect(withResponse.responses).toEqual({ r1: response });
    expect(setResponse(withResponse, { uuid: 'r1', response })).toBe(withResponse);
    expect(clearResponse(withResponse, 'r1').responses).toEqual({});
    expect(clearResponse(withResponse, 'r2')).toBe(withResponse);
  });

  it('sets and clears a run start by uuid, bailing out on no-ops', () => {
    const started = deepFreeze(startRequest(EMPTY_WORKSPACE, { uuid: 'r1', startedAt: 5 }));

    expect(started.requestStartedAt).toEqual({ r1: 5 });
    expect(startRequest(started, { uuid: 'r1', startedAt: 5 })).toBe(started);
    expect(finishRequest(started, 'r1').requestStartedAt).toEqual({});
    expect(finishRequest(started, 'r2')).toBe(started);
    expect(clearAllRequests(started).requestStartedAt).toEqual({});
    expect(clearAllRequests(started).responses).toBe(started.responses);
  });
});

describe('purity', () => {
  it('never mutates the seed, and keeps untouched branches by identity', () => {
    const collection = deepFreeze({
      info: { name: 'T' },
      config: { environments: [{ name: 'Dev', variables: [{ name: 'a', value: '1' }] }] },
      request: { variables: [{ name: 'c', value: '1' }] },
      items: [
        { info: { name: 'F', type: 'folder' }, uuid: 'f1', items: [{ type: 'http', uuid: 'r1', variables: [{ name: 'rv', value: '1' }] }] },
        { type: 'http', uuid: 'r2', http: { url: 'u' } }
      ]
    }) as unknown as OpenCollectionCollection;
    const before = structuredClone(collection);
    const state = seeded(collection);
    const [folder, request] = state.collection!.items as any[];

    const edited = setVariable(state, { scope: 'request', name: 'rv', value: '2', itemUuid: 'r1' });
    expect((edited.collection!.items![1])).toBe(request);
    expect(edited.collection!.config).toBe(state.collection!.config);
    expect((edited.collection!.items![0] as any)).not.toBe(folder);

    const env = setVariable(edited, { scope: 'environment', name: 'a', value: '2', envName: 'Dev' });
    expect(env.collection!.items).toBe(edited.collection!.items);
    expect(env.collection!.request).toBe(edited.collection!.request);

    applyScriptVariableChanges(env, {
      environmentVariables: { envName: 'Dev', variables: { a: '3' }, deleted: [] },
      collectionVariables: { variables: { c: '3' }, deleted: [] }
    });
    updateScriptFile(env, { uuid: 'r2', script: 'x' });
    updateRequestItem(env, { uuid: 'r2', item: { http: { url: 'v' } } as unknown as HttpRequest });

    expect(collection).toEqual(before);
  });
});

describe('createWorkspace', () => {
  it('runs the updaters on its own state and notifies only when something changed', () => {
    const workspace = createWorkspace();
    const listener = vi.fn();
    workspace.subscribe(listener);

    workspace.seed(hydrateWithUUIDs({ info: { name: 'T' }, items: [{ type: 'http', uuid: 'r1' }] } as any));
    workspace.setResponse({ uuid: 'r1', response: { status: 200 } });
    workspace.startRequest({ uuid: 'r1', startedAt: 1 });
    expect(listener).toHaveBeenCalledTimes(3);

    workspace.clearResponse('missing');
    workspace.finishRequest('missing');
    workspace.updateScriptFile({ uuid: 'missing', script: '' });
    expect(listener).toHaveBeenCalledTimes(3);

    workspace.clearAllRequests();
    expect(workspace.get().requestStartedAt).toEqual({});
    expect(workspace.get().responses).toEqual({ r1: { status: 200 } });

    workspace.clear();
    expect(workspace.get()).toEqual(EMPTY_WORKSPACE);
  });

  it('two workspaces do not share state', () => {
    const a = createWorkspace();
    const b = createWorkspace();
    a.setResponse({ uuid: 'r1', response: 1 });
    expect(b.get().responses).toEqual({});
  });
});

describe('workspace freezing', () => {
  it('freezes the seeded collection, including objects the host still holds, as the redux store did', () => {
    const hostInfo = { name: 'Host' };
    const workspace = createWorkspace();
    workspace.seed({ info: hostInfo, items: [] } as unknown as Parameters<typeof workspace.seed>[0]);
    expect(Object.isFrozen(hostInfo)).toBe(true);
    expect(() => {
      (hostInfo as { name: string }).name = 'changed';
    }).toThrow(TypeError);
  });
});
