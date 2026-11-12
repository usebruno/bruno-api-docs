import React, { createContext, useContext } from 'react';
import { useObservable } from '@/observable/observable';
import { createThemeMode } from '@/theme/themeMode';
import type { ThemeState } from '@/theme/types';
import { createEnv, type EnvState } from './env';
import { createPlayground } from './playground';
import { createWorkspace } from './workspace';

export const createSession = ({ theme }: { theme?: ThemeState } = {}) => ({
  theme: createThemeMode(theme),
  env: createEnv(),
  playground: createPlayground(),
  workspace: createWorkspace()
});

export type Session = ReturnType<typeof createSession>;

const SessionContext = createContext<Session | null>(null);

export const SessionProvider: React.FC<{ session: Session; children: React.ReactNode }> = ({ session, children }) => (
  <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
);

export const useSession = (): Session => {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
};

export const useThemeState = (): ThemeState => useObservable(useSession().theme);

export const useEnvState = (): EnvState => useObservable(useSession().env);
