export type HeaderValue = string | string[];
export type HeadersRecord = Record<string, HeaderValue>;

export interface HeaderEntry {
  key: string;
  value: HeaderValue;
  disabled?: boolean;
}

export interface RequestHeaderEntry {
  name: string;
  value: string;
  disabled?: boolean;
}

export type HeaderRef = { key: string; value?: HeaderValue };
export type HeaderInput = HeaderRef | string;

type HeaderPredicate = (header: HeaderEntry, index: number) => boolean;

export interface HeaderList {
  get(name: string): HeaderValue | undefined;
  one(name: string): HeaderEntry | undefined;
  all(): HeaderEntry[];
  count(): number;
  has(nameOrObj: string | HeaderRef, value?: string): boolean;
  indexOf(item: string | HeaderRef): number;
  find(fn: HeaderPredicate, ctx?: object): HeaderEntry | undefined;
  filter(fn: HeaderPredicate, ctx?: object): HeaderEntry[];
  each(fn: (header: HeaderEntry, index: number) => void, ctx?: object): void;
  map<T>(fn: (header: HeaderEntry, index: number) => T, ctx?: object): T[];
  reduce<T>(fn: (accumulator: T, header: HeaderEntry, index: number) => T, initial?: T, ctx?: object): T;
  toObject(
    excludeDisabled?: boolean, caseSensitive?: boolean, multiValue?: boolean, sanitizeKeys?: boolean
  ): HeadersRecord;
  toString(): string;
  toJSON(): HeaderEntry[];
  add(itemOrName: HeaderInput, value?: string): void;
  upsert(itemOrName: HeaderInput, value?: string): boolean | null;
  remove(predicate: HeaderPredicate | string | HeaderRef, ctx?: object): void;
  clear(): void;
  populate(items: HeaderInput[] | string): void;
  repopulate(items: HeaderInput[] | string): void;
  assimilate(source: HeaderEntry[] | { all(): HeaderEntry[] }, prune?: boolean): void;
}

type HeaderMutators = Pick<HeaderList, 'add' | 'upsert' | 'remove' | 'clear' | 'populate' | 'repopulate' | 'assimilate'>;

const eqKey = (a: string, b: string): boolean => String(a).toLowerCase() === String(b).toLowerCase();

const toEntries = (headers: HeadersRecord | null | undefined): HeaderEntry[] => {
  if (!headers || typeof headers !== 'object') return [];
  return Object.keys(headers).map((key) => ({ key, value: headers[key] }));
};

const parseHeaderString = (str: string): HeaderRef | null => {
  if (typeof str !== 'string') return null;
  const idx = str.indexOf(':');
  if (idx === -1) return null;
  return { key: str.substring(0, idx).trim(), value: str.substring(idx + 1).trim() };
};

const createHeaderListBase = (entries: () => HeaderEntry[], mutators: HeaderMutators): HeaderList => ({
  get: (name) => {
    const matches = entries().filter((h) => eqKey(h.key, name));
    const enabled = matches.filter((h) => !h.disabled);
    return (enabled.length ? enabled[enabled.length - 1] : matches[matches.length - 1])?.value;
  },
  one: (name) => {
    const matches = entries().filter((h) => eqKey(h.key, name));
    const enabled = matches.filter((h) => !h.disabled);
    return enabled.length ? enabled[enabled.length - 1] : matches[matches.length - 1];
  },
  all: () => entries().map((h) => ({ ...h })),
  count: () => entries().length,
  has: (nameOrObj, value) => {
    if (nameOrObj && typeof nameOrObj === 'object') {
      return entries().some((h) => eqKey(h.key, nameOrObj.key));
    }
    return entries().some((h) => eqKey(h.key, nameOrObj) && (value === undefined || h.value === value));
  },
  indexOf: (item) => {
    const list = entries();
    if (typeof item === 'string') {
      return list.findIndex((h) => eqKey(h.key, item));
    }
    if (!item || typeof item !== 'object') return -1;
    return list.findIndex((h) => eqKey(h.key, item.key) && h.value === item.value);
  },
  find: (fn, ctx) => entries().find(fn, ctx),
  filter: (fn, ctx) => entries().filter(fn, ctx),
  each: (fn, ctx) => entries().forEach(fn, ctx),
  map: (fn, ctx) => entries().map(fn, ctx),
  reduce: <T>(
    fn: (accumulator: T, header: HeaderEntry, index: number) => T,
    ...rest: [initial?: T, ctx?: object]
  ): T => {
    const reducer = rest.length > 1 ? fn.bind(rest[1]) : fn;
    const list = entries();
    const hasInitial = rest.length > 0;
    if (!hasInitial && list.length === 0) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    let accumulator = (hasInitial ? rest[0] : list[0]) as T;
    for (let i = hasInitial ? 0 : 1; i < list.length; i++) {
      accumulator = reducer(accumulator, list[i], i);
    }
    return accumulator;
  },
  toObject: (excludeDisabled, caseSensitive, multiValue, sanitizeKeys) => {
    const obj: HeadersRecord = {};
    entries().forEach((h) => {
      if (excludeDisabled && h.disabled) return;
      const key = caseSensitive === false ? h.key.toLowerCase() : h.key;
      if (sanitizeKeys && !key) return;
      if (multiValue && key in obj) return;
      obj[key] = h.value;
    });
    return obj;
  },
  toString: () => {
    const enabled = entries().filter((h) => !h.disabled);
    return enabled.length === 0 ? '' : enabled.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
  },
  toJSON: () => entries().map((h) => ({ ...h })),
  ...mutators
});

export const READ_ONLY_MESSAGE = 'res.headerList is read-only; response headers cannot be modified';
export const READ_ONLY_METHODS = [
  'add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate'
] as const;
type ReadOnlyMethod = typeof READ_ONLY_METHODS[number];

export const createResponseHeaderList = (getHeaders: () => HeadersRecord | null | undefined): HeaderList => {
  const readOnly = (): never => {
    throw new Error(READ_ONLY_MESSAGE);
  };
  const readOnlyMethods = {} as Record<ReadOnlyMethod, () => never>;
  READ_ONLY_METHODS.forEach((name) => { readOnlyMethods[name] = readOnly; });
  return createHeaderListBase(() => toEntries(getHeaders()), readOnlyMethods);
};

export const createRequestHeaderList = (getHeaders: () => RequestHeaderEntry[]): HeaderList => {
  const entries = (): HeaderEntry[] =>
    getHeaders().map((h) => ({ key: h.name, value: h.value, disabled: h.disabled }));
  const hasKey = (name: string): boolean => getHeaders().some((h) => eqKey(h.name, name));

  const upsert = (itemOrName: HeaderInput, value?: string): boolean | null => {
    const item = typeof itemOrName === 'string' ? { key: itemOrName, value } : itemOrName;
    if (!item || typeof item !== 'object' || !item.key) return null;
    const list = getHeaders();
    const existing = list.find((h) => !h.disabled && eqKey(h.name, item.key));
    if (existing) {
      existing.name = item.key;
      existing.value = String(item.value ?? '');
      return false;
    }
    list.push({ name: item.key, value: String(item.value ?? '') });
    return true;
  };

  const add = (itemOrName: HeaderInput, value?: string): void => {
    if (typeof itemOrName === 'string' && value !== undefined) {
      upsert({ key: itemOrName, value });
      return;
    }
    const item = typeof itemOrName === 'string' ? parseHeaderString(itemOrName) : itemOrName;
    if (item) upsert(item);
  };

  const remove = (predicate: HeaderPredicate | string | HeaderRef, ctx?: object): void => {
    const list = getHeaders();
    if (typeof predicate === 'function') {
      const bound = ctx !== undefined ? predicate.bind(ctx) : predicate;
      for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        if (bound({ key: h.name, value: h.value, disabled: h.disabled }, i)) list.splice(i, 1);
      }
      return;
    }
    const key = typeof predicate === 'string' ? predicate
      : (predicate && typeof predicate === 'object' ? predicate.key : undefined);
    if (key === undefined) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (eqKey(list[i].name, key)) list.splice(i, 1);
    }
  };

  const clear = (): void => { getHeaders().length = 0; };

  const populate = (items: HeaderInput[] | string): void => {
    const refs = typeof items === 'string'
      ? items.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(parseHeaderString)
      : (Array.isArray(items) ? items : []).map((i) => (typeof i === 'string' ? parseHeaderString(i) : i));
    refs.forEach((ref) => { if (ref && ref.key && !hasKey(ref.key)) add(ref); });
  };

  const repopulate = (items: HeaderInput[] | string): void => {
    clear();
    populate(items);
  };

  const assimilate = (source: HeaderEntry[] | { all(): HeaderEntry[] }, prune?: boolean): void => {
    const items = Array.isArray(source) ? source : (typeof source?.all === 'function' ? source.all() : []);
    items.forEach((item) => { if (item && item.key) upsert({ key: item.key, value: item.value }); });
    if (prune && items.length > 0) {
      const keep = new Set(items.map((i) => (i.key || '').toLowerCase()));
      const list = getHeaders();
      for (let i = list.length - 1; i >= 0; i--) {
        if (!keep.has(list[i].name.toLowerCase())) list.splice(i, 1);
      }
    }
  };

  return createHeaderListBase(entries, { add, upsert, remove, clear, populate, repopulate, assimilate });
};
