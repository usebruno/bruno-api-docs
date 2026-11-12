import { describe, it, expect } from 'vitest';
import reducer, { setShowVars, toggleShowVars } from './env';

describe('envSlice', () => {
  it('defaults to showVars off', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ showVars: false });
  });

  it('setShowVars sets the flag explicitly', () => {
    expect(reducer(undefined, setShowVars(true)).showVars).toBe(true);
    expect(reducer({ showVars: true }, setShowVars(false)).showVars).toBe(false);
  });

  it('toggleShowVars flips the flag', () => {
    expect(reducer(undefined, toggleShowVars()).showVars).toBe(true);
    expect(reducer({ showVars: true }, toggleShowVars()).showVars).toBe(false);
  });
});
