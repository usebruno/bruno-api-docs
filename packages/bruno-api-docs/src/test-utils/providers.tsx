import React from 'react';
import type { OpenCollection } from '@opencollection/types';
import { createSession, SessionProvider, type Session } from '@/session/session';
import { DocumentProvider } from '@/document/document';

export const TestProviders: React.FC<{
  session?: Session;
  document?: OpenCollection;
  children: React.ReactNode;
}> = ({
  session = createSession(),
  document = {} as OpenCollection,
  children
}) => {
  if (!session.workspace.get().collection) session.workspace.seed(document);
  return (
    <SessionProvider session={session}>
      <DocumentProvider document={document}>{children}</DocumentProvider>
    </SessionProvider>
  );
};
