import { useCallback, useMemo } from 'react';
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
  const state = useMemo(() => readPlaygroundParams(params, hidePlayground), [params, hidePlayground]);
  const { disabled } = state;

  const openPlayground = useCallback(
    (requestSlug?: string | null) => {
      if (disabled) {
        return;
      }
      setParams((prev) => {
        const current = readPlaygroundParams(prev, hidePlayground);
        return writePlaygroundParams(prev, {
          open: true,
          dock: current.open ? current.dock : readStoredDock(areaFor('session')) ?? DEFAULT_DOCK,
          requestSlug
        });
      });
    },
    [disabled, hidePlayground, setParams]
  );

  const closePlayground = useCallback(() => {
    setParams((prev) => writePlaygroundParams(prev, { open: false }));
  }, [setParams]);

  const setDock = useCallback(
    (dock: DockMode) => {
      if (disabled) {
        return;
      }
      writeStoredDock(areaFor('session'), dock);
      setParams(
        (prev) => {
          const current = readPlaygroundParams(prev, hidePlayground);
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
    [disabled, hidePlayground, setParams]
  );

  const setRequestSlug = useCallback(
    (requestSlug?: string | null) => {
      if (disabled) {
        return;
      }
      setParams((prev) => {
        const current = readPlaygroundParams(prev, hidePlayground);
        return writePlaygroundParams(prev, { open: true, dock: current.dock, requestSlug });
      });
    },
    [disabled, hidePlayground, setParams]
  );

  const setRequestExample = useCallback(
    (requestSlug?: string | null, exampleSlug?: string | null) => {
      if (disabled) {
        return;
      }
      setParams((prev) => {
        const current = readPlaygroundParams(prev, hidePlayground);
        return writePlaygroundParams(prev, { open: true, dock: current.dock, requestSlug, exampleSlug });
      });
    },
    [disabled, hidePlayground, setParams]
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
