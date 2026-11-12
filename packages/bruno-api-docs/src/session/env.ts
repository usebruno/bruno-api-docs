import { createObservable, persisted } from '@/observable/observable';

export interface EnvState {
  activeEnvName: string | null;
  showVars: boolean;
}

export const ENV_STORAGE_KEY = 'oc-docs.env';

const saved = persisted<Partial<EnvState>>('sessionStorage', ENV_STORAGE_KEY);

export const readPersistedEnv = (): EnvState => {
  const stored = saved.read();
  return {
    activeEnvName: typeof stored?.activeEnvName === 'string' ? stored.activeEnvName : null,
    showVars: stored?.showVars === true
  };
};

const startingEnv = readPersistedEnv();

export const createEnv = (initial: EnvState = startingEnv) => {
  const state = createObservable({ initial, persist: saved });
  const setField = <K extends keyof EnvState>(key: K, value: EnvState[K]) => {
    if (state.get()[key] !== value) state.set({ ...state.get(), [key]: value });
  };

  return {
    get: state.get,
    set: state.set,
    subscribe: state.subscribe,
    setActiveEnv: (name: string | null) => setField('activeEnvName', name),
    setShowVars: (on: boolean) => setField('showVars', on)
  };
};

export type EnvSession = ReturnType<typeof createEnv>;
