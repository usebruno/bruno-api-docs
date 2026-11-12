import { useSyncExternalStore } from 'react';

export interface Observable<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export const createObservable = <T>({ initial }: { initial: T }): Observable<T> => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
};

export const useObservable = <T, S = T>(
  observable: Pick<Observable<T>, 'get' | 'subscribe'>,
  select: (value: T) => S = (value) => value as unknown as S
): S => {
  const get = () => select(observable.get());
  return useSyncExternalStore(observable.subscribe, get, get);
};

export const persisted = <T>(storage: 'localStorage' | 'sessionStorage', key: string) => ({
  read: (): T | undefined => {
    try {
      const raw = globalThis[storage].getItem(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  },
  write: (value: T) => {
    try {
      globalThis[storage].setItem(key, JSON.stringify(value));
    } catch {
      /* storage missing or blocked */
    }
  }
});
