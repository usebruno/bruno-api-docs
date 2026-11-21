import React, { useEffect, useRef } from 'react';
import { isEqual } from 'lodash-es';
import { VariableResolverProvider } from '../../hooks/useVariableResolver';
import { DocumentProvider } from '../../document/document';
import { createSession, SessionProvider, useSession, type Session } from '../../session/session';
import type { ThemeState } from '../../theme/types';
import { getApiDocsTheme } from '../../utils/theme';
import { useCollectionLoader, type CollectionSource } from './useCollectionLoader';

export interface CollectionShellProps {
  collection: CollectionSource;
  theme?: Partial<ThemeState>;
  hideThemeSwitcher?: boolean;
  children: (sourceText: string | null) => React.ReactNode;
}

const CollectionShellContent: React.FC<CollectionShellProps> = ({ collection, theme, hideThemeSwitcher, children }) => {
  const session = useSession();

  const lastThemeProp = useRef(theme);
  const lastHideThemeSwitcherProp = useRef(hideThemeSwitcher);
  useEffect(() => {
    if (isEqual(theme, lastThemeProp.current) && hideThemeSwitcher === lastHideThemeSwitcherProp.current) return;
    lastThemeProp.current = theme;
    lastHideThemeSwitcherProp.current = hideThemeSwitcher;
    session.theme.set(getApiDocsTheme(theme, hideThemeSwitcher));
  }, [theme, session, hideThemeSwitcher]);

  const { status, error, sourceText, document } = useCollectionLoader(collection);

  if (status === 'idle' || status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error || !document) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  return (
    <DocumentProvider document={document}>
      <VariableResolverProvider collection={document}>
        {children(sourceText)}
      </VariableResolverProvider>
    </DocumentProvider>
  );
};

const CollectionShell: React.FC<CollectionShellProps> = (props) => {
  const sessionRef = useRef<Session | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = createSession({ theme: getApiDocsTheme(props.theme, props.hideThemeSwitcher) });
  }

  return (
    <SessionProvider value={sessionRef.current}>
      <CollectionShellContent {...props} />
    </SessionProvider>
  );
};

export default CollectionShell;
