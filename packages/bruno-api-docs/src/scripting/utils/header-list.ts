export interface HeaderEntry {
  key: string;
  value: any;
  disabled?: boolean;
}

type HeaderPredicate = (h: HeaderEntry, i: number) => boolean;

const eqKey = (a: string, b: string): boolean => String(a).toLowerCase() === String(b).toLowerCase();

const toEntries = (headers: Record<string, any> | null | undefined): HeaderEntry[] => {
  if (!headers || typeof headers !== 'object') return [];
  return Object.keys(headers).map((key) => ({ key, value: headers[key] }));
};

export type ResponseHeaderList = ReturnType<typeof createResponseHeaderList>;

export const createResponseHeaderList = (getHeaders: () => Record<string, any> | null | undefined) => {
  const entries = (): HeaderEntry[] => toEntries(getHeaders());
  const readOnly = (..._args: any[]): never => {
    throw new Error('res.headerList is read-only; response headers cannot be modified');
  };

  return {
    get: (name: string) => entries().filter((h) => eqKey(h.key, name)).pop()?.value,
    one: (name: string) => entries().filter((h) => eqKey(h.key, name)).pop(),
    all: () => entries().map((h) => ({ ...h })),
    count: () => entries().length,
    has: (nameOrObj: any, value?: string) => {
      if (nameOrObj && typeof nameOrObj === 'object' && nameOrObj.key) {
        return entries().some((h) => eqKey(h.key, nameOrObj.key));
      }
      return entries().some((h) => eqKey(h.key, nameOrObj) && (value === undefined || h.value === value));
    },
    indexOf: (item: any) => {
      const list = entries();
      if (typeof item === 'string') {
        return list.findIndex((h) => eqKey(h.key, item));
      }
      if (!item || typeof item !== 'object') return -1;
      return list.findIndex((h) => eqKey(h.key, item.key) && h.value === item.value);
    },
    find: (fn: HeaderPredicate, ctx?: any) => entries().find(fn, ctx),
    filter: (fn: HeaderPredicate, ctx?: any) => entries().filter(fn, ctx),
    each: (fn: (h: HeaderEntry, i: number) => void, ctx?: any) => entries().forEach(fn, ctx),
    map: <T>(fn: (h: HeaderEntry, i: number) => T, ctx?: any) => entries().map(fn, ctx),
    reduce: (fn: (acc: any, h: HeaderEntry, i: number) => any, ...rest: any[]) => {
      const ctx = rest.length > 1 ? rest[1] : undefined;
      const bound = ctx !== undefined ? fn.bind(ctx) : fn;
      return rest.length > 0 ? entries().reduce(bound, rest[0]) : entries().reduce(bound as any);
    },
    toObject: () => {
      const obj: Record<string, string> = {};
      entries().forEach((h) => { obj[h.key] = h.value; });
      return obj;
    },
    toString: () => entries().filter((h) => !h.disabled).map((h) => `${h.key}: ${h.value}`).join('\n'),
    toJSON: () => entries().map((h) => ({ ...h })),

    add: readOnly,
    upsert: readOnly,
    remove: readOnly,
    clear: readOnly,
    populate: readOnly,
    repopulate: readOnly,
    assimilate: readOnly
  };
};
