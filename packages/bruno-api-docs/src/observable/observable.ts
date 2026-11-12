import { useSyncExternalStore } from 'react';

export interface Observable<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export interface Persisted<T> {
  read: () => T | undefined;
  write: (value: T) => void;
}

export const createObservable = <T>({ initial, persist, onChange }: {
  initial: T;
  persist?: Pick<Persisted<T>, 'write'>;
  onChange?: (value: T) => void;
}): Observable<T> => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      persist?.write(value);
      onChange?.(value);
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

export const persisted = <T>(storage: 'localStorage' | 'sessionStorage', key: string): Persisted<T> => ({
  read: () => {
    try {
      const raw = globalThis[storage].getItem(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  },
  write: (value) => {
    try {
      globalThis[storage].setItem(key, JSON.stringify(value));
    } catch {
      /* storage missing or blocked */
    }
  }
});
