import type { HttpRequest } from '@opencollection/types/requests/http';
import { getHttpHeaders } from '@/utils/schemaHelpers';

export type HeaderSnapshot = Set<string>;

const headerPairKey = (name: string, value: string): string => `${name.toLowerCase()}\n${value}`;

export const snapshotEnabledHeaders = (request: HttpRequest): HeaderSnapshot => {
  const snapshot: HeaderSnapshot = new Set();
  getHttpHeaders(request).forEach((header) => {
    if (!header.disabled && header.name) snapshot.add(headerPairKey(header.name, header.value));
  });
  return snapshot;
};

// Names of the headers the pre-request script added or changed, compared against the snapshot
// taken before it ran. A header counts as untouched only when the same name and value pair was
// already there, so two rows sharing a name are not mistaken for a script edit.
export const getHeaderNamesChangedByScript = (before: HeaderSnapshot, request: HttpRequest): string[] => {
  const changed = new Set<string>();
  getHttpHeaders(request).forEach((header) => {
    if (header.disabled || !header.name) return;
    if (!before.has(headerPairKey(header.name, header.value))) changed.add(header.name.toLowerCase());
  });
  return [...changed];
};
