import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavModel } from '@usebruno/api-shared/document/document';
import { resolveSlug, type Resolution } from './resolve';

/** Current hash path resolved to its entry + prev/next; null when slug is unknown. */
export const useActiveResolution = (): Resolution | null => {
  const model = useNavModel();
  const { pathname } = useLocation();
  return useMemo(() => resolveSlug(model, pathname), [model, pathname]);
};
