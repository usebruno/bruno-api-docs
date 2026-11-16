import { createContext, useContext } from 'react';
import { useObservable } from '../observable/observable';
import { createThemeMode } from '../theme/themeMode';
import type { ThemeState } from '../theme/types';
import { createEnv, type EnvState } from './env';

export const createSession = ({ theme }: { theme?: ThemeState } = {}) => {
  const slots = new Map<string, unknown>();
  return {
    theme: createThemeMode(theme),
    env: createEnv(),
    slot: <T,>(key: string, create: () => T): T => {
      if (!slots.has(key)) slots.set(key, create());
      return slots.get(key) as T;
    }
  };
};

export type Session = ReturnType<typeof createSession>;

const SessionContext = createContext<Session | null>(null);

export const SessionProvider = SessionContext.Provider;

export const useSession = (): Session => {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside <SessionProvider>');
  return session;
};

export const useThemeState = (): ThemeState => useObservable(useSession().theme);

export const useEnvState = (): EnvState => useObservable(useSession().env);
