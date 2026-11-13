import { createObservable, persisted } from '../observable/observable';

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
  const state = createObservable({ initial });
  const setField = <K extends keyof EnvState>(key: K, value: EnvState[K]) => {
    if (state.get()[key] === value) return;
    const next = { ...state.get(), [key]: value };
    state.set(next);
    saved.write(next);
  };

  return {
    get: state.get,
    subscribe: state.subscribe,
    setActiveEnv: (name: string | null) => setField('activeEnvName', name),
    toggleShowVars: () => setField('showVars', !state.get().showVars)
  };
};
