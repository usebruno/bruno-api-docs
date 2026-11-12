import React, { useRef, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import type { OpenCollection as OpenCollectionCollection } from '@opencollection/types';
import type { OpenCollection as IOpenCollection } from '@opencollection/types';
import AppShell from '../AppShell/AppShell';
import { parseYaml } from '@/utils/yamlUtils';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import { VariableResolverProvider } from '@/hooks';
import { DocumentProvider } from '@/document/document';
import { createObservable, useObservable } from '@/observable/observable';
import { createSession, SessionProvider, useSession, type Session } from '@/session/session';
import type { ThemeState } from '@/theme/types';
import { isEqual } from 'lodash-es';
import { getApiDocsTheme } from '@/utils/theme';

const isFileInstance = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const parseCollectionContent = (content: string): OpenCollectionCollection => {
  try {
    return parseYaml(content) as OpenCollectionCollection;
  } catch {
    try {
      return JSON.parse(content) as OpenCollectionCollection;
    } catch {
      throw new Error('Failed to parse collection as YAML or JSON');
    }
  }
};

interface LoadState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  sourceText: string | null;
  document: OpenCollectionCollection | null;
}

const IDLE: LoadState = { status: 'idle', error: null, sourceText: null, document: null };

interface ResolvedCollection {
  collection: OpenCollectionCollection;
  sourceText: string | null;
}

const resolveCollectionSource = async (
  source: OpenCollectionCollection | string | File
): Promise<ResolvedCollection> => {
  if (isFileInstance(source)) {
    const text = await source.text();
    return { collection: parseCollectionContent(text), sourceText: text };
  }

  if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch collection: ${response.statusText}`);
      }
      const text = await response.text();
      return { collection: parseCollectionContent(text), sourceText: text };
    }

    return { collection: parseCollectionContent(source), sourceText: source };
  }

  return { collection: source, sourceText: null };
};

export interface OpenCollectionProps {
  collection: IOpenCollection | string | File;
  logo?: React.ReactNode;
  gitCollectionUrl?: string;
  theme?: Partial<ThemeState>;
  hideThemeSwitcher?: boolean;
  hidePlayground?: boolean;
}

const useCollectionLoader = (collection: OpenCollectionProps['collection']): LoadState => {
  const { playground: { selection, folders }, workspace } = useSession();
  const [loadState] = useState(() => createObservable<LoadState>({ initial: IDLE }));

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      loadState.set({ ...loadState.get(), status: 'loading', error: null });

      try {
        const { collection: resolved, sourceText } = await resolveCollectionSource(collection);
        if (!isActive) return;
        const hydrated = hydrateWithUUIDs(resolved);
        folders.seed(hydrated.items);
        workspace.seed(hydrated);
        loadState.set({ status: 'succeeded', error: null, sourceText, document: hydrated });
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : 'Failed to load API collection';
        folders.seed(undefined);
        workspace.clear();
        selection.clearRequest();
        loadState.set({ ...IDLE, status: 'failed', error: message });
      }
    };

    if (collection == null) {
      folders.seed(undefined);
      workspace.clear();
      selection.clearRequest();
      loadState.set(IDLE);
      return () => { isActive = false; };
    }

    if (isFileInstance(collection) || typeof collection === 'string') {
      void load();
    } else {
      const hydrated = hydrateWithUUIDs(collection as OpenCollectionCollection);
      folders.seed(hydrated.items);
      workspace.seed(hydrated);
      loadState.set({ status: 'succeeded', error: null, sourceText: null, document: hydrated });
    }

    return () => { isActive = false; };
  }, [collection, loadState, selection, folders, workspace]);

  return useObservable(loadState);
};

const OpenCollectionContent: React.FC<OpenCollectionProps> = ({
  collection,
  logo,
  gitCollectionUrl,
  theme,
  hideThemeSwitcher,
  hidePlayground = false
}) => {
  const session = useSession();

  const lastThemeProp = useRef(theme);
  const lastHideThemeSwitcherProp = useRef(hideThemeSwitcher);
  useEffect(() => {
    if (isEqual(theme, lastThemeProp.current) && hideThemeSwitcher === lastHideThemeSwitcherProp.current) return;
    lastThemeProp.current = theme;
    lastHideThemeSwitcherProp.current = hideThemeSwitcher;
    session.theme.set(getApiDocsTheme(theme, hideThemeSwitcher));
  }, [theme, session, hideThemeSwitcher]);

  const { status: collectionStatus, error: collectionError, sourceText, document } = useCollectionLoader(collection);

  const isInitialLoad = collectionStatus === 'idle' && !document;
  const isLoading = collectionStatus === 'loading' || isInitialLoad;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (collectionError || !document) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {collectionError}</div>;
  }

  return (
    <DocumentProvider document={document}>
      <VariableResolverProvider>
        <div className="oc-playground">
          <AppShell
            logo={logo}
            hidePlayground={hidePlayground}
            hideThemeSwitcher={hideThemeSwitcher}
            gitCollectionUrl={gitCollectionUrl}
            collectionSourceText={sourceText}
          />
        </div>
      </VariableResolverProvider>
    </DocumentProvider>
  );
};

const OpenCollection: React.FC<OpenCollectionProps> = (props) => {
  const sessionRef = useRef<Session | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = createSession({ theme: getApiDocsTheme(props.theme, props.hideThemeSwitcher) });
  }

  return (
    <HashRouter useTransitions={false}>
      <SessionProvider session={sessionRef.current}>
        <OpenCollectionContent {...props} />
      </SessionProvider>
    </HashRouter>
  );
};

export default OpenCollection;
