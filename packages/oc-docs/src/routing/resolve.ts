import { OVERVIEW_SLUG } from './navModel';
import type { NavEntry, NavModel, SeqNeighbor } from './types';

export interface Resolution {
  entry: NavEntry;
  prev?: SeqNeighbor;
  next?: SeqNeighbor;
}

/** Strip leading/trailing slashes; the bare root maps to the overview slug. */
export const normalizeSlug = (raw: string): string => {
  const trimmed = (raw || '').replace(/^\/+|\/+$/g, '');
  return trimmed || OVERVIEW_SLUG;
};

const toNeighbor = (entry: NavEntry): SeqNeighbor => ({
  slug: entry.slug,
  name: entry.name,
  type: entry.type,
  ...(entry.method ? { method: entry.method } : {}),
});

/** Resolve a slug to its entry + prev/next neighbours; null for unknown slugs. */
export const resolveSlug = (model: NavModel, raw: string): Resolution | null => {
  const slug = normalizeSlug(raw);
  const entry = model.bySlug.get(slug);
  if (!entry) return null;

  const i = model.ordered.indexOf(entry);
  const prev = i > 0 ? model.ordered[i - 1] : undefined;
  const next = i < model.ordered.length - 1 ? model.ordered[i + 1] : undefined;

  return {
    entry,
    ...(prev ? { prev: toNeighbor(prev) } : {}),
    ...(next ? { next: toNeighbor(next) } : {}),
  };
};
