import { describe, it, expect } from 'vitest';
import {
  humanizeAuthMode,
  resolveInheritedAuth,
  getBodyView,
  selectBodyVariant,
  buildScriptChain,
  getScriptFlow,
  getPreRequestVars,
  getPostResponseVars,
  actionsToPostResponseVars,
  postResponseVarsToActions,
  getCollectionVariables,
  getInheritedHeaders,
  getInheritedPreRequestVars,
  getInheritedPostResponseVars,
  getInheritedConfig,
  folderSource,
  collectionSource,
  inheritedSourceLabel,
  canNavigateToSource,
  inheritedCountLabel,
  getShortMethod,
  getVariableType
} from './request';
import { AUTH_MODE_LABELS } from '../constants';
import { COLLECTION_ROOT_CRUMB } from './common';

describe('requestAuth', () => {
  it('humanizes auth modes with fallbacks', () => {
    expect(humanizeAuthMode(undefined, AUTH_MODE_LABELS)).toBe('No Auth');
    expect(humanizeAuthMode('inherit', AUTH_MODE_LABELS)).toBe('Inherit');
    expect(humanizeAuthMode({ type: 'basic' } as any, AUTH_MODE_LABELS)).toBe('Basic Auth');
  });

  it('returns own auth when it is not inherit', () => {
    const item: any = { runtime: { auth: { type: 'bearer', token: 't' } } };
    expect(resolveInheritedAuth(null, [], item).auth).toMatchObject({ type: 'bearer' });
  });

  it('resolves inherited auth from the nearest concrete ancestor, else collection', () => {
    const item: any = { runtime: { auth: 'inherit' } };
    const folder: any = { info: { type: 'folder', name: 'F' }, request: { auth: { type: 'apikey', key: 'k' } } };
    const resolved = resolveInheritedAuth({ info: { name: 'C' } } as any, [folder], item);
    expect(resolved.auth).toMatchObject({ type: 'apikey' });
    expect(resolved.source).toEqual({ level: 'folder', name: 'F', uuid: '' });
  });

  it('falls back to collection auth when no ancestor defines one', () => {
    const item: any = { runtime: { auth: 'inherit' } };
    const collection: any = { info: { name: 'C' }, request: { auth: { type: 'bearer', token: 't' } } };
    const resolved = resolveInheritedAuth(collection, [], item);
    expect(resolved.auth).toMatchObject({ type: 'bearer' });
    expect(resolved.source).toEqual({ level: 'collection', name: 'C', uuid: COLLECTION_ROOT_CRUMB });
  });

  it('lets an explicit No-Auth folder block a parent folder auth (closest choice wins)', () => {
    const item: any = { runtime: { auth: 'inherit' } };
    const outer: any = { info: { type: 'folder', name: 'outer' }, request: { auth: { type: 'bearer', token: 't' } } };
    const inner: any = { info: { type: 'folder', name: 'inner' }, request: { auth: undefined } }; // No Auth
    const resolved = resolveInheritedAuth({ info: { name: 'C' } } as any, [outer, inner], item);
    expect(resolved.auth).toBeUndefined();
    expect(resolved.source).toEqual({ level: 'folder', name: 'inner', uuid: '' });
  });

  it('is transparent through an inherit folder to a shallower concrete folder', () => {
    const item: any = { runtime: { auth: 'inherit' } };
    const outer: any = { info: { type: 'folder', name: 'outer' }, request: { auth: { type: 'bearer', token: 't' } } };
    const inner: any = { info: { type: 'folder', name: 'inner' }, request: { auth: 'inherit' } };
    const resolved = resolveInheritedAuth({ info: { name: 'C' } } as any, [outer, inner], item);
    expect(resolved.auth).toMatchObject({ type: 'bearer' });
    expect(resolved.source).toEqual({ level: 'folder', name: 'outer', uuid: '' });
  });

  it('resolves to No Auth (never the literal "inherit") when nothing up the chain configures auth', () => {
    const item: any = { runtime: { auth: 'inherit' } };
    const folder: any = { info: { type: 'folder', name: 'F' }, request: { auth: 'inherit' } };
    const resolved = resolveInheritedAuth({ info: { name: 'C' }, request: { auth: 'inherit' } } as any, [folder], item);
    expect(resolved.auth).toBeUndefined();
  });

  it('resolves and labels an unknown/future auth type without a per-type change (scalable)', () => {
    const future: any = { type: 'future-scheme-v9', token: 't' };
    const item: any = { runtime: { auth: 'inherit' } };
    const folder: any = { info: { type: 'folder', name: 'F' }, request: { auth: future } };
    const resolved = resolveInheritedAuth({ info: { name: 'C' } } as any, [folder], item);
    expect(resolved.auth).toMatchObject(future); // resolved through untouched, whatever the type
    // The label falls back to the raw type when no friendly label exists yet, so it never breaks.
    expect(humanizeAuthMode(future, AUTH_MODE_LABELS)).toBe('future-scheme-v9');
  });
});

describe('inherited request config', () => {
  const collection: any = {
    info: { name: 'My Collection' },
    request: {
      headers: [
        { name: 'X-Collection', value: 'c' },
        { name: 'Authorization', value: 'from-collection' }
      ],
      variables: [{ name: 'colVar', value: 'cv' }],
      actions: [
        { type: 'set-variable', phase: 'after-response', variable: { name: 'colPost', scope: 'runtime' }, selector: { expression: 'body.a' } }
      ]
    }
  };
  const folder: any = {
    uuid: 'folder-uid',
    info: { type: 'folder', name: 'Folder A' },
    request: {
      headers: [
        { name: 'X-Folder', value: 'f' },
        { name: 'authorization', value: 'from-folder' } // overrides collection's Authorization (case-insensitive)
      ],
      variables: [{ name: 'folderVar', value: 'fv' }],
      actions: [
        { type: 'set-variable', phase: 'after-response', variable: { name: 'folderPost', scope: 'runtime' }, selector: { expression: 'body.b' } }
      ]
    }
  };

  it('collects headers from collection + folders, nearest parent wins on case-insensitive name', () => {
    const item: any = { http: { headers: [] } };
    const rows = getInheritedHeaders(collection, [folder], item);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    // Authorization is defined by both; the nearer folder wins and is the only one kept.
    expect(rows.filter((r) => r.name.toLowerCase() === 'authorization')).toHaveLength(1);
    expect(byName['authorization'].value).toBe('from-folder');
    expect(byName['authorization'].source).toEqual({ level: 'folder', name: 'Folder A', uuid: 'folder-uid' });
    // Distinct headers from each level are all present.
    expect(byName['X-Collection'].source).toEqual({ level: 'collection', name: 'My Collection', uuid: COLLECTION_ROOT_CRUMB });
    expect(byName['X-Folder'].source).toEqual({ level: 'folder', name: 'Folder A', uuid: 'folder-uid' });
    expect(rows).toHaveLength(3); // X-Collection, X-Folder, Authorization(folder)
  });

  it('excludes headers the request defines itself (own value wins, no inherited row)', () => {
    const item: any = { http: { headers: [{ name: 'x-collection', value: 'own' }] } };
    const rows = getInheritedHeaders(collection, [folder], item);
    expect(rows.map((r) => r.name.toLowerCase())).not.toContain('x-collection');
    expect(rows).toHaveLength(2); // X-Folder + Authorization(folder)
  });

  it('collects pre-request and post-response variables with their source', () => {
    const item: any = { runtime: { variables: [], actions: [] } };
    const pre = getInheritedPreRequestVars(collection, [folder], item);
    const post = getInheritedPostResponseVars(collection, [folder], item);
    expect(pre.map((v) => v.name)).toEqual(['colVar', 'folderVar']);
    expect(pre.find((v) => v.name === 'colVar')!.source.level).toBe('collection');
    expect(pre.find((v) => v.name === 'folderVar')!.source).toEqual({ level: 'folder', name: 'Folder A', uuid: 'folder-uid' });
    expect(post.map((v) => v.name)).toEqual(['colPost', 'folderPost']);
    expect(post.find((v) => v.name === 'folderPost')!.source.level).toBe('folder');
  });

  it('excludes variables the request redefines, and a folder var overrides the collection var', () => {
    const item: any = { runtime: { variables: [{ name: 'colVar', value: 'own' }], actions: [] } };
    const rows = getInheritedPreRequestVars(collection, [folder], item);
    expect(rows.map((v) => v.name)).toEqual(['folderVar']); // colVar hidden by own, folderVar remains

    const shadowing: any = { ...folder, request: { ...folder.request, variables: [{ name: 'colVar', value: 'fv' }] } };
    const rows2 = getInheritedPreRequestVars(collection, [shadowing], { runtime: { variables: [], actions: [] } } as any);
    expect(rows2).toHaveLength(1);
    expect(rows2[0]).toMatchObject({ name: 'colVar', value: 'fv', source: { level: 'folder' } });
  });

  it('returns [] when there is no collection or ancestry', () => {
    const item: any = { http: { headers: [] }, runtime: { variables: [], actions: [] } };
    expect(getInheritedHeaders(null, [], item)).toEqual([]);
    expect(getInheritedPreRequestVars(null, [], item)).toEqual([]);
    expect(getInheritedPostResponseVars(null, [], item)).toEqual([]);
  });

  it('builds a pluralized count-chip label', () => {
    expect(inheritedCountLabel(7, 'header')).toBe('7 headers inherited');
    expect(inheritedCountLabel(1, 'header')).toBe('1 header inherited');
    expect(inheritedCountLabel(8, 'var')).toBe('8 vars inherited');
    expect(inheritedCountLabel(1, 'var')).toBe('1 var inherited');
  });
});

describe('requestBody', () => {
  it('renders raw json as a code view', () => {
    expect(getBodyView({ type: 'json', data: '{"a":1}' } as any)).toMatchObject({
      render: 'code',
      language: 'json',
      contentTypeLabel: 'application/json',
      code: '{"a":1}'
    });
  });

  it('treats empty raw data as none', () => {
    expect(getBodyView({ type: 'json', data: '   ' } as any).render).toBe('none');
  });

  it('renders form-urlencoded as a table', () => {
    expect(getBodyView({ type: 'form-urlencoded', data: [{ name: 'a', value: '1' }] } as any)).toMatchObject({
      render: 'table',
      variant: 'urlencoded',
      contentTypeLabel: 'application/x-www-form-urlencoded'
    });
  });

  it('treats an empty / all-blank form-urlencoded body as none', () => {
    expect(getBodyView({ type: 'form-urlencoded', data: [] } as any).render).toBe('none');
    expect(getBodyView({ type: 'form-urlencoded', data: [{ name: '', value: '' }] } as any).render).toBe('none');
  });

  it('treats an empty / all-blank multipart body as none', () => {
    expect(getBodyView({ type: 'multipart-form', data: [] } as any).render).toBe('none');
    expect(getBodyView({ type: 'multipart-form', data: [{ name: '', value: '' }] } as any).render).toBe('none');
  });

  it('carries entry descriptions through to the table rows', () => {
    const view = getBodyView({
      type: 'form-urlencoded',
      data: [{ name: 'a', value: '1', description: 'the a field' }]
    } as any) as any;
    expect(view.rows[0].description).toBe('the a field');
  });

  it('renders multipart preserving text/file part types and per-part content types', () => {
    const view = getBodyView({
      type: 'multipart-form',
      data: [{ name: 'file', type: 'file', value: '/x.pdf', contentType: 'application/pdf' }]
    } as any) as any;
    expect(view.render).toBe('table');
    expect(view.variant).toBe('multipart');
    expect(view.rows[0].partType).toBe('file');
    expect(view.rows[0].contentType).toBe('application/pdf');
  });

  it('reports every file-body variant with its content type and selected flag', () => {
    const view = getBodyView({
      type: 'file',
      data: [
        { filePath: '/a.json', contentType: 'application/json', selected: true, description: 'Primary payload' },
        { filePath: '/b.xml', contentType: 'application/xml', selected: false }
      ]
    } as any) as any;
    expect(view.render).toBe('file');
    expect(view.files).toHaveLength(2);
    expect(view.files[0]).toMatchObject({
      filePath: '/a.json',
      contentType: 'application/json',
      selected: true,
      description: 'Primary payload'
    });
  });

  it('treats an empty file body as none', () => {
    expect(getBodyView({ type: 'file', data: [] } as any).render).toBe('none');
  });

  it('selects the chosen body variant and reports variants', () => {
    const selected = selectBodyVariant([
      { title: 'A', body: { type: 'json', data: '1' } },
      { title: 'B', selected: true, body: { type: 'text', data: 'b' } }
    ] as any);
    expect(selected.body).toMatchObject({ type: 'text' });
    expect(selected.variants?.length).toBe(2);
  });

  it('returns none for an undefined body', () => {
    expect(getBodyView(undefined).render).toBe('none');
  });
});

describe('getScriptFlow', () => {
  it('reads extensions.config.scripts.flow', () => {
    expect(getScriptFlow({ extensions: { config: { scripts: { flow: 'sequential' } } } } as any)).toBe('sequential');
    expect(getScriptFlow({ extensions: { config: { scripts: { flow: 'sandwich' } } } } as any)).toBe('sandwich');
  });

  it('falls back to the typed config.scripts.flow', () => {
    expect(getScriptFlow({ config: { scripts: { flow: 'sequential' } } } as any)).toBe('sequential');
    expect(getScriptFlow({ config: { scripts: { flow: 'sandwich' } } } as any)).toBe('sandwich');
  });

  it('prefers extensions.config.scripts.flow over the typed config.scripts.flow', () => {
    expect(
      getScriptFlow({
        extensions: { config: { scripts: { flow: 'sequential' } } },
        config: { scripts: { flow: 'sandwich' } }
      } as any)
    ).toBe('sequential');
  });

  // Always resolves to exactly one flow — anything that isn't `sequential` is `sandwich`.
  it('defaults to sandwich for every other case', () => {
    expect(getScriptFlow(null)).toBe('sandwich');
    expect(getScriptFlow(undefined)).toBe('sandwich');
    expect(getScriptFlow({} as any)).toBe('sandwich');
    expect(getScriptFlow({ extensions: {} } as any)).toBe('sandwich');
    expect(getScriptFlow({ extensions: { config: {} } } as any)).toBe('sandwich');
    expect(getScriptFlow({ extensions: { config: { scripts: {} } } } as any)).toBe('sandwich');
    expect(getScriptFlow({ config: {} } as any)).toBe('sandwich');
    expect(getScriptFlow({ config: { scripts: {} } } as any)).toBe('sandwich');
    // Unknown / malformed values never leak through.
    expect(getScriptFlow({ extensions: { config: { scripts: { flow: 'parallel' } } } } as any)).toBe('sandwich');
    expect(getScriptFlow({ extensions: { config: 'oops' } } as any)).toBe('sandwich');
    expect(getScriptFlow({ extensions: 'oops' } as any)).toBe('sandwich');
  });
});

describe('buildScriptChain', () => {
  it('orders pre-request collection→folder→request, then post-response reversed', () => {
    const collection: any = {
      info: { name: 'C' },
      request: { scripts: [{ type: 'before-request', code: 'coll pre' }, { type: 'after-response', code: 'coll post' }] }
    };
    const folder: any = {
      info: { type: 'folder', name: 'F' },
      request: { scripts: [{ type: 'before-request', code: 'fold pre' }] }
    };
    const item: any = {
      runtime: { scripts: [{ type: 'before-request', code: 'req pre' }, { type: 'after-response', code: 'req post' }] }
    };

    const chain = buildScriptChain(collection, [folder], item);
    expect(chain.map((s) => `${s.level}:${s.phase}`)).toEqual([
      'collection:before-request',
      'folder:before-request',
      'request:before-request',
      'request:after-response',
      'collection:after-response'
    ]);
    expect(chain[0]).toMatchObject({ label: 'Collection Pre-Request', code: 'coll pre' });
    expect(chain[2]).toMatchObject({ label: 'Request Pre-Request' });
    // Hierarchy index: collection=0, folder=1, request=2 — independent of phase.
    const orderOf = (level: string, phase: string) =>
      chain.find((s) => s.level === level && s.phase === phase)?.order;
    expect(orderOf('collection', 'before-request')).toBe(0);
    expect(orderOf('folder', 'before-request')).toBe(1);
    expect(orderOf('request', 'before-request')).toBe(2);
    expect(orderOf('collection', 'after-response')).toBe(0);
    expect(orderOf('request', 'after-response')).toBe(2);
  });

  it('skips empty scripts', () => {
    const item: any = { runtime: { scripts: [{ type: 'before-request', code: '   ' }] } };
    expect(buildScriptChain(null, [], item)).toEqual([]);
  });
});

describe('getVariableType', () => {
  it('reads a typed value, a secret type, and the selected variant', () => {
    expect(getVariableType({ name: 'a', value: { type: 'number', data: '1' } })).toBe('number');
    expect(getVariableType({ name: 'b', secret: true, type: 'string' })).toBe('string');
    expect(
      getVariableType({ name: 'c', value: [{ title: 't', selected: true, value: { type: 'object', data: '{}' } }] })
    ).toBe('object');
  });

  it('returns undefined for a plain string value', () => {
    expect(getVariableType({ name: 'd', value: 'plain' })).toBeUndefined();
  });
});

describe('requestVars', () => {
  it('reads pre-request variables, flattening typed values and surfacing their data-type', () => {
    const item: any = {
      runtime: { variables: [{ name: 'x', value: '1' }, { name: 'y', value: { type: 'number', data: '42' } }] }
    };
    expect(getPreRequestVars(item)).toEqual([
      { name: 'x', value: '1', type: 'string', disabled: undefined },
      { name: 'y', value: '42', type: 'number', disabled: undefined }
    ]);
  });

  it('reads post-response captures from set-variable actions', () => {
    const item: any = {
      runtime: {
        actions: [
          {
            type: 'set-variable',
            phase: 'after-response',
            selector: { expression: 'res.body.token', method: 'jsonq' },
            variable: { name: 'authToken', scope: 'environment' }
          }
        ]
      }
    };
    expect(getPostResponseVars(item)).toEqual([
      { name: 'authToken', expression: 'res.body.token', scope: 'environment', disabled: undefined }
    ]);
  });

  it('carries pre-request and post-response variable descriptions through to the rows', () => {
    const item: any = {
      runtime: {
        variables: [{ name: 'sessionId', value: '{{$randomUUID}}', description: 'Unique session identifier' }],
        actions: [
          {
            type: 'set-variable',
            phase: 'after-response',
            selector: { expression: 'res.body.token' },
            variable: { name: 'authToken', scope: 'environment' },
            description: { content: 'JWT access token from the login response', type: 'text' }
          }
        ]
      }
    };
    expect(getPreRequestVars(item)[0].description).toBe('Unique session identifier');
    expect(getPostResponseVars(item)[0].description).toBe('JWT access token from the login response');
  });
});

describe('post-response variable mappers', () => {
  it('maps after-response set-variable actions to editable rows, treating a missing phase as after-response', () => {
    const actions: any = [
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.id', method: 'jsonq' },
        variable: { name: 'userId', scope: 'runtime' },
        disabled: true
      },
      { type: 'set-variable', selector: { expression: 'res.body.tok' }, variable: { name: 'legacy' } }
    ];
    expect(actionsToPostResponseVars(actions)).toEqual([
      { name: 'userId', expr: 'res.body.id', scope: 'runtime', disabled: true, description: undefined },
      { name: 'legacy', expr: 'res.body.tok', scope: undefined, disabled: undefined, description: undefined }
    ]);
  });

  it('ignores actions that are not after-response captures', () => {
    const actions: any = [
      { type: 'set-variable', phase: 'before-request', selector: { expression: 'x' }, variable: { name: 'pre' } },
      { type: 'set-header', name: 'X', value: 'Y' }
    ];
    expect(actionsToPostResponseVars(actions)).toEqual([]);
    expect(actionsToPostResponseVars()).toEqual([]);
  });

  it('serializes rows to after-response set-variable actions, defaulting the scope to runtime', () => {
    expect(postResponseVarsToActions([{ name: 'userId', value: 'res.body.id', enabled: true }])).toEqual([
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.id', method: 'jsonq' },
        variable: { name: 'userId', scope: 'runtime' },
        disabled: false
      }
    ]);
  });

  it('keeps non-after-response actions and replaces stale captures on write', () => {
    const existing: any = [
      { type: 'set-header', name: 'X', value: 'Y' },
      { type: 'set-variable', phase: 'after-response', selector: { expression: 'old' }, variable: { name: 'stale' } }
    ];
    const result = postResponseVarsToActions(
      [{ name: 'fresh', value: 'res.body.id', enabled: true, scope: 'environment' }],
      existing
    );
    expect(result).toEqual([
      { type: 'set-header', name: 'X', value: 'Y' },
      {
        type: 'set-variable',
        phase: 'after-response',
        selector: { expression: 'res.body.id', method: 'jsonq' },
        variable: { name: 'fresh', scope: 'environment' },
        disabled: false
      }
    ]);
  });

  it('includes a description only when the row carries one', () => {
    expect(postResponseVarsToActions([{ name: 'a', value: 'x', enabled: true, description: 'note' }])[0]).toMatchObject({
      description: 'note'
    });
    expect('description' in postResponseVarsToActions([{ name: 'a', value: 'x', enabled: true }])[0]).toBe(false);
  });

  it('round-trips an edited row through the actions model', () => {
    const actions = postResponseVarsToActions([
      { name: 'token', value: 'res.body.token', enabled: false, scope: 'environment' }
    ]);
    expect(actionsToPostResponseVars(actions)).toEqual([
      { name: 'token', expr: 'res.body.token', scope: 'environment', disabled: true, description: undefined }
    ]);
  });
});

describe('getCollectionVariables', () => {
  it('reads collection pre-request (request.variables) and post-response (request.actions) vars', () => {
    const collection: any = {
      request: {
        variables: [
          { name: 'baseUrl', value: 'https://api.example.com' },
          { name: 'legacy', value: 'x', disabled: true }
        ],
        actions: [
          {
            type: 'set-variable',
            phase: 'after-response',
            selector: { expression: 'res.body.token' },
            variable: { name: 'token', scope: 'collection' }
          }
        ]
      }
    };
    const { preVars, postVars } = getCollectionVariables(collection);
    expect(preVars).toEqual([
      { name: 'baseUrl', value: 'https://api.example.com', type: 'string', disabled: undefined },
      { name: 'legacy', value: 'x', type: 'string', disabled: true }
    ]);
    expect(postVars).toEqual([
      { name: 'token', expression: 'res.body.token', scope: 'collection', disabled: undefined }
    ]);
  });

  it('returns empty arrays and skips malformed / unnamed entries', () => {
    expect(getCollectionVariables(null)).toEqual({ preVars: [], postVars: [] });
    expect(getCollectionVariables({} as any)).toEqual({ preVars: [], postVars: [] });
    const collection: any = {
      request: {
        variables: [{ value: 'noName' }, null],
        actions: [
          { type: 'set-variable', phase: 'before-request', variable: { name: 'skipMe' }, selector: { expression: 'x' } },
          { type: 'set-variable', variable: {}, selector: {} }
        ]
      }
    };
    const { preVars, postVars } = getCollectionVariables(collection);
    expect(preVars).toEqual([]);
    expect(postVars).toEqual([]);
  });
});

describe('getShortMethod', () => {
  it('abbreviates the standard methods longer than five characters', () => {
    expect(getShortMethod('DELETE')).toBe('DEL');
    expect(getShortMethod('OPTIONS')).toBe('OPT');
    expect(getShortMethod('CONNECT')).toBe('CON');
  });

  it('uppercases and shows methods of five characters or fewer in full', () => {
    expect(getShortMethod('get')).toBe('GET');
    expect(getShortMethod('PATCH')).toBe('PATCH');
    expect(getShortMethod('trace')).toBe('TRACE');
    expect(getShortMethod('purge')).toBe('PURGE');
    expect(getShortMethod('  purge  ')).toBe('PURGE');
  });

  it.each([
    ['REPORT', 'REP'],
    ['PROPFIND', 'PRO'],
    ['ASDALKHDAFLKASJDH', 'ASD']
  ])('cuts the custom method %s to %s', (method, expected) => {
    expect(getShortMethod(method)).toBe(expected);
  });
});

describe('inherited source helpers', () => {
  it('builds a folder source from an item name and uuid, with generic fallbacks', () => {
    expect(folderSource({ uuid: 'f-1', info: { name: 'Invoices' } } as any)).toEqual({
      level: 'folder',
      name: 'Invoices',
      uuid: 'f-1'
    });
    expect(folderSource({} as any)).toEqual({ level: 'folder', name: 'Folder', uuid: '' });
  });

  it('builds a collection source pinned to the collection-root crumb', () => {
    expect(collectionSource({ info: { name: 'Billing API' } } as any)).toEqual({
      level: 'collection',
      name: 'Billing API',
      uuid: COLLECTION_ROOT_CRUMB
    });
    expect(collectionSource(null)).toEqual({ level: 'collection', name: 'Collection', uuid: COLLECTION_ROOT_CRUMB });
  });

  it('formats the provenance label and computes navigability', () => {
    const source = { level: 'folder', name: 'Invoices', uuid: 'f-1' } as const;
    expect(inheritedSourceLabel(source)).toBe('Inherited from folder: Invoices');
    expect(canNavigateToSource(source, () => {})).toBe(true);
    expect(canNavigateToSource(source, undefined)).toBe(false);
    expect(canNavigateToSource({ ...source, uuid: '' }, () => {})).toBe(false);
  });
});

describe('getInheritedConfig', () => {
  const collection: any = {
    info: { name: 'Billing API' },
    request: {
      headers: [{ name: 'X-Api-Version', value: 'v2' }],
      variables: [{ name: 'colVar', value: 'cv' }],
      actions: [
        {
          type: 'set-variable',
          phase: 'after-response',
          selector: { expression: 'res.body.x' },
          variable: { name: 'colPost', scope: 'runtime' }
        }
      ]
    }
  };
  const folder: any = {
    uuid: 'folder-9',
    info: { name: 'Invoices' },
    request: { headers: [{ name: 'X-Folder', value: 'f' }] }
  };

  it('collects headers and vars across collection + ancestors, tagging each with its source', () => {
    const item: any = { http: { headers: [{ name: 'Accept', value: 'application/json' }] } };
    const { headers, preVars, postVars } = getInheritedConfig(collection, [folder], item);

    expect(headers.map((h) => h.name)).toEqual(['X-Api-Version', 'X-Folder']);
    expect(headers.find((h) => h.name === 'X-Api-Version')!.source).toMatchObject({ level: 'collection', name: 'Billing API' });
    expect(headers.find((h) => h.name === 'X-Folder')!.source).toMatchObject({ level: 'folder', name: 'Invoices', uuid: 'folder-9' });
    expect(preVars.map((v) => v.name)).toEqual(['colVar']);
    expect(postVars.map((v) => v.name)).toEqual(['colPost']);
  });

  it('lets the nearest ancestor win a same-named header (case-insensitive)', () => {
    const near: any = { uuid: 'near', info: { name: 'Near' }, request: { headers: [{ name: 'x-api-version', value: 'near' }] } };
    const headers = getInheritedConfig(collection, [near], { http: {} } as any).headers;
    expect(headers).toHaveLength(1);
    expect(headers[0].value).toBe('near');
    expect(headers[0].source).toMatchObject({ name: 'Near' });
  });

  it('excludes a header the request overrides with its own ENABLED header', () => {
    const item: any = { http: { headers: [{ name: 'X-Api-Version', value: 'own' }] } };
    expect(getInheritedConfig(collection, [], item).headers).toEqual([]);
  });

  it('does NOT let a DISABLED own header hide an enabled inherited one (matches the send path)', () => {
    const item: any = { http: { headers: [{ name: 'X-Api-Version', value: 'own', disabled: true }] } };
    const headers = getInheritedConfig(collection, [], item).headers;
    expect(headers.map((h) => h.name)).toEqual(['X-Api-Version']);
    expect(headers[0].value).toBe('v2');
  });

  it('drops disabled INHERITED headers entirely (never sent, so not part of the effective request)', () => {
    const col: any = { info: { name: 'C' }, request: { headers: [{ name: 'X-Off', value: 'x', disabled: true }] } };
    expect(getInheritedConfig(col, [], { http: {} } as any).headers).toEqual([]);
  });

  it('a disabled nearer header does not mask an enabled farther one', () => {
    const col: any = { info: { name: 'C' }, request: { headers: [{ name: 'X-H', value: 'col' }] } };
    const near: any = { uuid: 'n', info: { name: 'N' }, request: { headers: [{ name: 'X-H', value: 'near', disabled: true }] } };
    const headers = getInheritedConfig(col, [near], { http: {} } as any).headers;
    expect(headers).toHaveLength(1);
    expect(headers[0].value).toBe('col');
  });

  it('the thin accessors return the matching slice', () => {
    const item: any = { http: {} };
    expect(getInheritedHeaders(collection, [folder], item).map((h) => h.name)).toEqual(['X-Api-Version', 'X-Folder']);
    expect(getInheritedPreRequestVars(collection, [], item).map((v) => v.name)).toEqual(['colVar']);
    expect(getInheritedPostResponseVars(collection, [], item).map((v) => v.name)).toEqual(['colPost']);
  });
});
