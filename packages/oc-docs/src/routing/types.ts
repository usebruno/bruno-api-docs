import type { OpenCollection } from '@opencollection/types';
import type { Item as OpenCollectionItem } from '@opencollection/types/collection/item';

export type PageType =
  | 'overview'
  | 'environments'
  | 'folder'
  | 'script'
  | 'request';

/** A single breadcrumb hop: a folder above the current node. */
export interface BreadcrumbSegment {
  name: string;
  slug: string;
}

/** A resolved nav node; item is null for built-in pages; slug is '' for the overview (#/). */
export interface NavEntry {
  slug: string;
  type: PageType;
  name: string;
  item: OpenCollectionItem | null;
  /** Folder chain strictly above this node (excludes self & the overview crumb). */
  ancestors: BreadcrumbSegment[];
  /** Depth in the item tree (0 = top level). Built-ins are -1. */
  depth: number;
  /** HTTP method, for request entries only. */
  method?: string;
}

/** A prev/next neighbour in the ordered sequence. */
export interface SeqNeighbor {
  slug: string;
  name: string;
  type: PageType;
  method?: string;
}

/** Ordered DFS sequence (prev/next) plus slug → entry lookup. */
export interface NavModel {
  ordered: NavEntry[];
  bySlug: Map<string, NavEntry>;
}

/** What every page component receives. */
export interface PageProps {
  node: NavEntry;
  prev?: SeqNeighbor;
  next?: SeqNeighbor;
  collection: OpenCollection;
  onOpenPlayground?: () => void;
}
