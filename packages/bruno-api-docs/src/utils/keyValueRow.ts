import type { KeyValueRow } from '../components/KeyValueTable/KeyValueTable';
import { resolveDescription } from './description';

export interface KeyValueEntry {
  name: string;
  value: string;
  disabled: boolean;
  description?: string;
}

export const keyValueRowToEntry = (row: KeyValueRow): KeyValueEntry => {
  const description = resolveDescription(row.description);
  return {
    name: row.name,
    value: row.value,
    disabled: !row.enabled,
    ...(description !== undefined ? { description } : {})
  };
};
