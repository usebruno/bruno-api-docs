import React from 'react';
import { Provider } from 'react-redux';
import type { OpenCollection } from '@opencollection/types';
import { createOpenCollectionStore, type AppStore } from '@/store/store';
import { createSession, SessionProvider, type Session } from '@/session/session';
import { DocumentProvider } from '@/document/document';

export const TestProviders: React.FC<{
  store?: AppStore;
  session?: Session;
  document?: OpenCollection;
  children: React.ReactNode;
}> = ({
  store = createOpenCollectionStore(),
  session = createSession(),
  document = {} as OpenCollection,
  children
}) => (
  <Provider store={store}>
    <SessionProvider session={session}>
      <DocumentProvider document={document}>{children}</DocumentProvider>
    </SessionProvider>
  </Provider>
);
