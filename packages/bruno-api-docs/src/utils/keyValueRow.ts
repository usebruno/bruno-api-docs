import type { KeyValueRow } from '../components/KeyValueTable/KeyValueTable';
import { resolveDescription } from './description';

export interface KeyValueEntry {
  name: string;
  value: string;
  disabled: boolean;
  description?: string;
}

/**
 * Map an editable KeyValueTable row back to its stored entry: `enabled` inverts to `disabled`, and a
 * non-blank description is stored as a plain string — a blank/whitespace-only one is dropped, matching
 * how the app stores a bare description string and omits blanks. Callers add any entry-specific fields
 * (e.g. a query param's `type`) around the result.
 */
export const keyValueRowToEntry = (row: KeyValueRow): KeyValueEntry => {
  const description = resolveDescription(row.description);
  return {
    name: row.name,
    value: row.value,
    disabled: !row.enabled,
    ...(description !== undefined ? { description } : {})
  };
};
