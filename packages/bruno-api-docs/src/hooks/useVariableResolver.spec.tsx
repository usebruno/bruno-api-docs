import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { createOpenCollectionStore, type AppStore } from '@/store/store';
import { TestProviders } from '@/test-utils/providers';
import { createSession, type Session } from '@/session/session';
import { setDocsCollection } from '@/store/slices/docs';
import { setShowVars } from '@/store/slices/env';
import { useVariableResolver, useResolvedVariables, ItemVariableResolverProvider } from './useVariableResolver';

const collection: any = {
  request: { variables: [{ name: 'collectionVar', value: 'cval' }] },
  config: {
    environments: [
      {
        name: 'Dev',
        variables: [
          { name: 'baseUrl', value: 'https://dev.test' },
          { secret: true, name: 'authToken' }
        ]
      },
      { name: 'Prod', variables: [{ name: 'baseUrl', value: 'https://prod.test' }] }
    ]
  }
};

const Probe: React.FC = () => {
  const r = useVariableResolver();
  return (
    <div>
      <span data-testid="base">{r.resolve('{{baseUrl}}')}</span>
      <span data-testid="coll">{r.resolve('{{collectionVar}}')}</span>
      <span data-testid="secret-ref">{String(r.secretRefName('{{authToken}}'))}</span>
      <span data-testid="secret-resolve">{r.resolve('Bearer {{authToken}}')}</span>
    </div>
  );
};

const render = (configure: (session: Session, store: AppStore) => void): string => {
  const store = createOpenCollectionStore();
  const session = createSession();
  store.dispatch(setDocsCollection(collection));
  configure(session, store);
  return renderToStaticMarkup(
    <TestProviders store={store} session={session}>
      <Probe />
    </TestProviders>
  );
};

describe('useVariableResolver', () => {
  it('returns raw placeholders when showVars is off', () => {
    const html = render((session) => session.env.setActiveEnv('Dev'));
    expect(html).toContain('<span data-testid="base">{{baseUrl}}</span>');
    expect(html).toContain('<span data-testid="coll">{{collectionVar}}</span>');
  });

  it('resolves env + collection vars against the active env when on', () => {
    const html = render((session, s) => {
      session.env.setActiveEnv('Dev');
      s.dispatch(setShowVars(true));
    });
    expect(html).toContain('<span data-testid="base">https://dev.test</span>');
    expect(html).toContain('<span data-testid="coll">cval</span>');
  });

  it('reflects the active env (switching changes the value)', () => {
    const html = render((session, s) => {
      session.env.setActiveEnv('Prod');
      s.dispatch(setShowVars(true));
    });
    expect(html).toContain('<span data-testid="base">https://prod.test</span>');
  });

  it('never resolves a secret to plaintext, even when on', () => {
    const html = render((session, s) => {
      session.env.setActiveEnv('Dev');
      s.dispatch(setShowVars(true));
    });
    expect(html).toContain('<span data-testid="secret-ref">authToken</span>');
    expect(html).toContain('<span data-testid="secret-resolve">Bearer {{authToken}}</span>');
  });
});

const LookupProbe: React.FC<{ name: string }> = ({ name }) => {
  const info = useResolvedVariables().lookup(name);
  return (
    <div>
      <span data-testid="scope">{info.scope}</span>
      <span data-testid="value">{info.value}</span>
      <span data-testid="secret">{String(info.secret)}</span>
      <span data-testid="valid">{String(info.valid)}</span>
    </div>
  );
};

describe('lookup (variable hover card)', () => {
  const folder: any = { type: 'folder', name: 'F', request: { variables: [{ name: 'folderScope', value: 'from-folder' }, { name: 'shared', value: 'folderVal' }] } };
  const requestItem: any = { type: 'http', name: 'R', runtime: { variables: [{ name: 'reqScope', value: 'from-req' }, { name: 'shared', value: 'reqVal' }] } };

  const renderLookup = (name: string, showVars = false): string => {
    const store = createOpenCollectionStore();
    const session = createSession();
    store.dispatch(setDocsCollection(collection));
    session.env.setActiveEnv('Dev');
    if (showVars) store.dispatch(setShowVars(true));
    return renderToStaticMarkup(
      <TestProviders store={store} session={session}>
        <ItemVariableResolverProvider collection={collection} ancestry={[folder]} item={requestItem}>
          <LookupProbe name={name} />
        </ItemVariableResolverProvider>
      </TestProviders>
    );
  };

  it('resolves a variable\'s value and scope even when show-variables is off', () => {
    const html = renderLookup('baseUrl');
    expect(html).toContain('<span data-testid="scope">environment</span>');
    expect(html).toContain('<span data-testid="value">https://dev.test</span>');
  });

  it('applies precedence request > folder > environment > collection', () => {
    expect(renderLookup('shared')).toContain('<span data-testid="scope">request</span>');
    expect(renderLookup('reqScope')).toContain('<span data-testid="scope">request</span>');
    expect(renderLookup('folderScope')).toContain('<span data-testid="scope">folder</span>');
    expect(renderLookup('collectionVar')).toContain('<span data-testid="scope">collection</span>');
  });

  it('flags secret env vars and never shows their value', () => {
    const html = renderLookup('authToken');
    expect(html).toContain('<span data-testid="scope">environment</span>');
    expect(html).toContain('<span data-testid="secret">true</span>');
  });

  it('classifies special references (process.env, $dynamic) and flags invalid/unknown names', () => {
    expect(renderLookup('process.env.HOME')).toContain('<span data-testid="scope">process.env</span>');
    expect(renderLookup('$randomInt')).toContain('<span data-testid="scope">dynamic</span>');
    expect(renderLookup('bad name')).toContain('<span data-testid="valid">false</span>');
    expect(renderLookup('unknownVar')).toContain('<span data-testid="scope">undefined</span>');
  });

  it('degrades to an undefined scope with no provider', () => {
    const html = renderToStaticMarkup(<LookupProbe name="anything" />);
    expect(html).toContain('<span data-testid="scope">undefined</span>');
  });
});

const NestedProbe: React.FC = () => {
  const r = useResolvedVariables();
  return (
    <div>
      <span data-testid="nested-resolve">{r.resolve('{{endpoint}}')}</span>
      <span data-testid="nested-interpolate">{r.interpolate('{{endpoint}}')}</span>
    </div>
  );
};

describe('nested variable resolution', () => {
  const nested = {
    request: {
      variables: [
        { name: 'endpoint', value: '{{host}}/v1' },
        { name: 'host', value: 'https://api.test' }
      ]
    },
    config: { environments: [{ name: 'Dev', variables: [] }] }
  } as unknown as typeof collection;

  it('follows a variable that points at another variable, for display and for interpolation', () => {
    const store = createOpenCollectionStore();
    const session = createSession();
    store.dispatch(setDocsCollection(nested));
    session.env.setActiveEnv('Dev');
    store.dispatch(setShowVars(true));

    const html = renderToStaticMarkup(
      <TestProviders store={store} session={session}>
        <ItemVariableResolverProvider collection={nested} ancestry={[]} item={null} writable>
          <NestedProbe />
        </ItemVariableResolverProvider>
      </TestProviders>
    );

    expect(html).toContain('<span data-testid="nested-resolve">https://api.test/v1</span>');
    expect(html).toContain('<span data-testid="nested-interpolate">https://api.test/v1</span>');
  });

  it('gates resolve on showVars but never interpolate', () => {
    const store = createOpenCollectionStore();
    const session = createSession();
    store.dispatch(setDocsCollection(nested));
    session.env.setActiveEnv('Dev');
    store.dispatch(setShowVars(false));

    const html = renderToStaticMarkup(
      <TestProviders store={store} session={session}>
        <ItemVariableResolverProvider collection={nested} ancestry={[]} item={null} writable>
          <NestedProbe />
        </ItemVariableResolverProvider>
      </TestProviders>
    );

    expect(html).toContain('<span data-testid="nested-resolve">{{endpoint}}</span>');
    expect(html).toContain('<span data-testid="nested-interpolate">https://api.test/v1</span>');
  });
});
