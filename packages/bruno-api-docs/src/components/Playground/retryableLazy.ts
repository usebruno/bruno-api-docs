import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// React caches a rejected lazy, so a failed load swaps in a fresh one and the next render retries.
export const retryableLazy = <P extends object>(load: () => Promise<{ default: ComponentType<P> }>) => {
  const make = (): LazyExoticComponent<ComponentType<P>> =>
    lazy(() =>
      load().catch((error: unknown) => {
        current = make();
        throw error;
      })
    );
  let current = make();
  return () => current;
};
