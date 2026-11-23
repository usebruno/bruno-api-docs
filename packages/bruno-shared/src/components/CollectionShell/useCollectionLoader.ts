import { useEffect, useState } from 'react';
import type { OpenCollection } from '@opencollection/types';
import { parseYaml } from '../../utils/yamlUtils';
import { hydrateWithUUIDs } from '../../utils/fileUtils';
import { createObservable, useObservable } from '../../observable/observable';

export type CollectionSource = OpenCollection | string | File;

const isFileInstance = (value: unknown): value is File =>
  typeof File !== 'undefined' && value instanceof File;

const parseCollectionContent = (content: string): OpenCollection => {
  try {
    return parseYaml(content) as OpenCollection;
  } catch {
    try {
      return JSON.parse(content) as OpenCollection;
    } catch {
      throw new Error('Failed to parse collection as YAML or JSON');
    }
  }
};

interface LoadState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  sourceText: string | null;
  document: OpenCollection | null;
}

const IDLE: LoadState = { status: 'idle', error: null, sourceText: null, document: null };

interface ResolvedCollection {
  collection: OpenCollection;
  sourceText: string | null;
}

export const resolveCollectionSource = async (source: CollectionSource): Promise<ResolvedCollection> => {
  if (isFileInstance(source)) {
    const text = await source.text();
    return { collection: parseCollectionContent(text), sourceText: text };
  }

  if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch collection: ${response.statusText}`);
      }
      const text = await response.text();
      return { collection: parseCollectionContent(text), sourceText: text };
    }

    return { collection: parseCollectionContent(source), sourceText: source };
  }

  return { collection: source, sourceText: null };
};

export const useCollectionLoader = (collection: CollectionSource): LoadState => {
  const [loadState] = useState(() => createObservable<LoadState>({ initial: IDLE }));

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      loadState.set({ ...loadState.get(), status: 'loading', error: null });

      try {
        const { collection: resolved, sourceText } = await resolveCollectionSource(collection);
        if (!isActive) return;
        loadState.set({ status: 'succeeded', error: null, sourceText, document: hydrateWithUUIDs(resolved) });
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : 'Failed to load API collection';
        loadState.set({ ...IDLE, status: 'failed', error: message });
      }
    };

    if (collection == null) {
      loadState.set(IDLE);
      return () => { isActive = false; };
    }

    if (isFileInstance(collection) || typeof collection === 'string') {
      void load();
    } else {
      loadState.set({
        status: 'succeeded',
        error: null,
        sourceText: null,
        document: hydrateWithUUIDs(collection)
      });
    }

    return () => { isActive = false; };
  }, [collection, loadState]);

  return useObservable(loadState);
};
