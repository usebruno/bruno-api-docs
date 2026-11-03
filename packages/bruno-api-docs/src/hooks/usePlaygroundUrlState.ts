import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type DockMode,
  type PlaygroundUrlState,
  DEFAULT_DOCK,
  readPlaygroundParams,
  readStoredDock,
  writePlaygroundParams,
  writeStoredDock
} from '@/utils/playgroundDock';
import { areaFor } from './useStorage';

export interface PlaygroundUrlApi extends PlaygroundUrlState {
  openPlayground: (requestSlug?: string | null) => void;
  closePlayground: () => void;
  setDock: (dock: DockMode) => void;
  setRequestSlug: (requestSlug?: string | null) => void;
  setRequestExample: (requestSlug?: string | null, exampleSlug?: string | null) => void;
}

export const usePlaygroundUrlState = (hidePlayground = false): PlaygroundUrlApi => {
  const [params, setParams] = useSearchParams();
  const state = readPlaygroundParams(params, hidePlayground);

  const openPlayground = useCallback(
    (requestSlug?: string | null) => {
      setParams((prev) => {
        const current = readPlaygroundParams(prev);
        return writePlaygroundParams(prev, {
          open: true,
          dock: current.open ? current.dock : readStoredDock(areaFor('session')) ?? DEFAULT_DOCK,
          requestSlug
        });
      });
    },
    [setParams]
  );

  const closePlayground = useCallback(() => {
    setParams((prev) => writePlaygroundParams(prev, { open: false }));
  }, [setParams]);

  const setDock = useCallback(
    (dock: DockMode) => {
      writeStoredDock(areaFor('session'), dock);
      setParams(
        (prev) => {
          const current = readPlaygroundParams(prev);
          return writePlaygroundParams(prev, {
            open: true,
            dock,
            requestSlug: current.requestSlug,
            exampleSlug: current.exampleSlug
          });
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setRequestSlug = useCallback(
    (requestSlug?: string | null) => {
      setParams((prev) => {
        const current = readPlaygroundParams(prev);
        return writePlaygroundParams(prev, { open: true, dock: current.dock, requestSlug });
      });
    },
    [setParams]
  );

  const setRequestExample = useCallback(
    (requestSlug?: string | null, exampleSlug?: string | null) => {
      setParams((prev) => {
        const current = readPlaygroundParams(prev);
        return writePlaygroundParams(prev, { open: true, dock: current.dock, requestSlug, exampleSlug });
      });
    },
    [setParams]
  );

  return {
    ...state,
    openPlayground,
    closePlayground,
    setDock,
    setRequestSlug,
    setRequestExample
  };
};
