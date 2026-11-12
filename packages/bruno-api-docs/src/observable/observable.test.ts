import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fakeStorage } from '@/test-utils/storage';
import { createObservable, persisted, useObservable } from './observable';

describe('createObservable', () => {
  it('starts at the initial value and returns what was set', () => {
    const obs = createObservable({ initial: 1 });
    expect(obs.get()).toBe(1);
    obs.set(2);
    expect(obs.get()).toBe(2);
  });

  it('notifies subscribers, persists and calls onChange on a change, until unsubscribed', () => {
    const write = vi.fn();
    const onChange = vi.fn();
    const listener = vi.fn();
    const obs = createObservable({ initial: 'a', persist: { write }, onChange });
    const unsubscribe = obs.subscribe(listener);

    obs.set('b');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('b');
    expect(onChange).toHaveBeenCalledWith('b');

    unsubscribe();
    obs.set('c');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does nothing when set to the same value', () => {
    const write = vi.fn();
    const listener = vi.fn();
    const obs = createObservable({ initial: 'a', persist: { write } });
    obs.subscribe(listener);
    obs.set('a');
    expect(write).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not persist the initial value', () => {
    const write = vi.fn();
    createObservable({ initial: 'a', persist: { write } });
    expect(write).not.toHaveBeenCalled();
  });
});

describe('useObservable', () => {
  it('renders the current value', () => {
    const obs = createObservable({ initial: 'first' });
    obs.set('second');
    const Probe = () => useObservable(obs);
    expect(renderToStaticMarkup(createElement(Probe))).toBe('second');
  });
});

describe('persisted', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips a value through JSON in the named storage', () => {
    vi.stubGlobal('sessionStorage', fakeStorage());
    const store = persisted<{ a: number }>('sessionStorage', 'k');
    expect(store.read()).toBeUndefined();
    store.write({ a: 1 });
    expect(sessionStorage.getItem('k')).toBe('{"a":1}');
    expect(store.read()).toEqual({ a: 1 });
  });

  it('reads malformed data as nothing', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    localStorage.setItem('k', '{not json');
    expect(persisted('localStorage', 'k').read()).toBeUndefined();
  });

  it('tolerates missing storage', () => {
    vi.stubGlobal('localStorage', undefined);
    const store = persisted('localStorage', 'k');
    expect(store.read()).toBeUndefined();
    expect(() => store.write(1)).not.toThrow();
  });
});
