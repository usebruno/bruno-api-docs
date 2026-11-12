import React from 'react';
import { Provider } from 'react-redux';
import type { AppStore } from '@/store/store';
import { createSession, SessionProvider, type Session } from '@/session/session';

export const TestProviders: React.FC<{ store: AppStore; session?: Session; children: React.ReactNode }> = ({
  store,
  session = createSession(),
  children
}) => (
  <Provider store={store}>
    <SessionProvider session={session}>{children}</SessionProvider>
  </Provider>
);
