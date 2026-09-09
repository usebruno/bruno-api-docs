import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectCollection } from '@/store/slices/collection';
import { buildNavModel } from './navModel';
import { resolveSlug, type Resolution } from './resolve';
import type { NavModel } from './types';

/** Memoised nav model for the currently loaded collection. */
export const useNavModel = (): NavModel => {
  const collection = useAppSelector(selectCollection);
  return useMemo(() => buildNavModel(collection), [collection]);
};

/** Current hash path resolved to its entry + prev/next; null when slug is unknown. */
export const useActiveResolution = (): Resolution | null => {
  const model = useNavModel();
  const { pathname } = useLocation();
  return useMemo(() => resolveSlug(model, pathname), [model, pathname]);
};
