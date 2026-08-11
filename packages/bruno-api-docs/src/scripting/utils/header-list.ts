export type HeaderValue = string | string[];
export type HeadersRecord = Record<string, HeaderValue>;

export interface HeaderEntry {
  key: string;
  value: HeaderValue;
  disabled?: boolean;
}

export type HeaderRef = { key: string; value?: HeaderValue };
export type HeaderInput = HeaderRef | string;

type HeaderPredicate = (header: HeaderEntry, index: number) => boolean;

export interface ResponseHeaderList {
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
  toObject(): HeadersRecord;
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

const eqKey = (a: string, b: string): boolean => String(a).toLowerCase() === String(b).toLowerCase();

const toEntries = (headers: HeadersRecord | null | undefined): HeaderEntry[] => {
  if (!headers || typeof headers !== 'object') return [];
  return Object.keys(headers).map((key) => ({ key, value: headers[key] }));
};

export const READ_ONLY_MESSAGE = 'res.headerList is read-only; response headers cannot be modified';
export const READ_ONLY_METHODS = [
  'add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate'
] as const;
type ReadOnlyMethod = typeof READ_ONLY_METHODS[number];

export const createResponseHeaderList = (getHeaders: () => HeadersRecord | null | undefined): ResponseHeaderList => {
  const entries = (): HeaderEntry[] => toEntries(getHeaders());
  const readOnly = (): never => {
    throw new Error(READ_ONLY_MESSAGE);
  };
  const readOnlyMethods = {} as Record<ReadOnlyMethod, () => never>;
  READ_ONLY_METHODS.forEach((name) => { readOnlyMethods[name] = readOnly; });

  return {
    get: (name) => entries().filter((h) => eqKey(h.key, name)).pop()?.value,
    one: (name) => entries().filter((h) => eqKey(h.key, name)).pop(),
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
      const ctx = rest.length > 1 ? rest[1] : undefined;
      const reducer = ctx !== undefined ? fn.bind(ctx) : fn;
      const list = entries();
      const hasInitial = rest.length > 0;
      let accumulator = (hasInitial ? rest[0] : list[0]) as T;
      for (let i = hasInitial ? 0 : 1; i < list.length; i++) {
        accumulator = reducer(accumulator, list[i], i);
      }
      return accumulator;
    },
    toObject: () => {
      const obj: HeadersRecord = {};
      entries().forEach((h) => { obj[h.key] = h.value; });
      return obj;
    },
    toString: () => entries().filter((h) => !h.disabled).map((h) => `${h.key}: ${h.value}`).join('\n'),
    toJSON: () => entries().map((h) => ({ ...h })),

    ...readOnlyMethods
  };
};
