import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeStorage } from '../test-utils/storage';
import { createEnv, readPersistedEnv, ENV_STORAGE_KEY } from './env';

beforeEach(() => vi.stubGlobal('sessionStorage', fakeStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('createEnv', () => {
  it('defaults to no active env and showVars off', () => {
    expect(createEnv().get()).toEqual({ activeEnvName: null, showVars: false });
  });

  it('setActiveEnv sets the active environment name', () => {
    const env = createEnv();
    env.setActiveEnv('Production');
    expect(env.get().activeEnvName).toBe('Production');
    env.setActiveEnv(null);
    expect(env.get().activeEnvName).toBeNull();
  });

  it('toggleShowVars flips the flag', () => {
    const env = createEnv();
    env.toggleShowVars();
    expect(env.get().showVars).toBe(true);
    env.toggleShowVars();
    expect(env.get().showVars).toBe(false);
  });

  it('keeps the two fields independent', () => {
    const env = createEnv();
    env.setActiveEnv('Dev');
    env.toggleShowVars();
    expect(env.get()).toEqual({ activeEnvName: 'Dev', showVars: true });
  });

  it('saves every change to sessionStorage, field order kept', () => {
    const env = createEnv();
    env.setActiveEnv('Prod');
    expect(sessionStorage.getItem(ENV_STORAGE_KEY)).toBe(JSON.stringify({ activeEnvName: 'Prod', showVars: false }));
  });

  it('neither saves nor notifies when the active env is set to what it already is', () => {
    const env = createEnv({ activeEnvName: 'Dev', showVars: false });
    const listener = vi.fn();
    env.subscribe(listener);
    env.setActiveEnv('Dev');
    expect(listener).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ENV_STORAGE_KEY)).toBeNull();
  });

  it('two envs are independent', () => {
    const first = createEnv();
    const second = createEnv();
    first.setActiveEnv('Prod');
    expect(second.get().activeEnvName).toBeNull();
  });
});

describe('readPersistedEnv', () => {
  it('returns defaults when nothing is stored', () => {
    expect(readPersistedEnv()).toEqual({ activeEnvName: null, showVars: false });
  });

  it('round-trips what an env saved', () => {
    const env = createEnv();
    env.setActiveEnv('Prod');
    env.toggleShowVars();
    expect(readPersistedEnv()).toEqual({ activeEnvName: 'Prod', showVars: true });
  });

  it('keeps whatever on/off state was saved, including off', () => {
    sessionStorage.setItem(ENV_STORAGE_KEY, JSON.stringify({ activeEnvName: 'Dev', showVars: false }));
    expect(readPersistedEnv().showVars).toBe(false);
  });

  it('ignores malformed stored data', () => {
    sessionStorage.setItem(ENV_STORAGE_KEY, '{not json');
    expect(readPersistedEnv()).toEqual({ activeEnvName: null, showVars: false });
  });

  it('drops fields of the wrong type', () => {
    sessionStorage.setItem(ENV_STORAGE_KEY, JSON.stringify({ activeEnvName: 3, showVars: 'yes' }));
    expect(readPersistedEnv()).toEqual({ activeEnvName: null, showVars: false });
  });
});
