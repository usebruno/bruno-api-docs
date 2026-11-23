import type { JsonValue } from './bruno-response';

/**
 * If value is an array returns the deeply flattened array, otherwise value
 */
function normalize(value: unknown): unknown {
  if (!Array.isArray(value)) return value;

  const values = [] as unknown[];

  value.forEach((item) => {
    const value = normalize(item);
    if (value != null) {
      values.push(...(Array.isArray(value) ? value : [value]));
    }
  });

  return values.length ? values : undefined;
}

/**
 * Gets value of a prop from source.
 *
 * If source is an array get value from each item.
 *
 * If deep is true then recursively gets values for prop in nested objects.
 *
 * Once a value is found will not recurse further into that value.
 */
function getValue(source: unknown, prop: string, deep = false): unknown {
  if (typeof source !== 'object') return;

  let value: unknown;

  if (Array.isArray(source)) {
    value = source.map((item) => getValue(item, prop, deep));
  } else {
    const record = source as Record<string, unknown>;
    value = record[prop];
    if (deep) {
      value = [value];
      for (const [key, item] of Object.entries(record)) {
        if (key !== prop && typeof item === 'object') {
          (value as unknown[]).push(getValue(record[key], prop, deep));
        }
      }
    }
  }

  return normalize(value);
}

type PredicateOrMapper = ((obj: JsonValue) => unknown) | Record<string, JsonValue>;

/**
 * Make a predicate function that checks scalar properties for equality
 */
function objectPredicate(obj: Record<string, JsonValue>) {
  return (item: JsonValue) => {
    for (const [key, value] of Object.entries(obj)) {
      if ((item as Record<string, JsonValue>)[key] !== value) return false;
    }
    return true;
  };
}

/**
 * Apply filter on source array or object
 *
 * If the filter returns a non boolean non null value it is treated as a mapped value
 */
function filterOrMap(source: unknown, funOrObj: PredicateOrMapper) {
  const fun = typeof funOrObj === 'object' ? objectPredicate(funOrObj) : funOrObj;
  const isArray = Array.isArray(source);
  const list = isArray ? source : [source];
  const result = [] as unknown[];
  for (const item of list) {
    if (item == null) continue;
    const value = fun(item);
    if (value === true) {
      result.push(item); // predicate
    } else if (value != null && value !== false) {
      result.push(value); // mapper
    }
  }
  return normalize(isArray ? result : result[0]);
}

/**
 * Getter with deep navigation, filter and map support
 *
 * 1. Easy array navigation
 *    ```js
 *    get(data, 'customer.orders.items.amount')
 *    ```
 * 2. Deep navigation .. double dots
 *    ```js
 *    get(data, '..items.amount')
 *    ```
 * 3. Array indexing
 *    ```js
 *    get(data, '..items[0].amount')
 *    ```
 * 4. Array filtering [?] with corresponding filter function
 *    ```js
 *    get(data, '..items[?].amount', i => i.amount > 20)
 *    ```
 * 5. Array filtering [?] with simple object predicate, same as (i => i.id === 2 && i.amount === 20)
 *    ```js
 *    get(data, '..items[?]', { id: 2, amount: 20 })
 *    ```
 * 6. Array mapping [?] with corresponding mapper function
 *    ```js
 *    get(data, '..items[?].amount', i => i.amount + 10)
 *    ```
 */
export function get(source: unknown, path: string, ...fns: PredicateOrMapper[]): JsonValue | undefined {
  const paths = path
    .replace(/\s+/g, '')
    .split(/(\.{1,2}|\[\?\]|\[\d+\])/g) // ["..", "items", "[?]", ".", "amount", "[0]" ]
    .filter((s) => s.length > 0)
    .map((str) => {
      str = str.replace(/\[|\]/g, '');
      const index = parseInt(str);
      return isNaN(index) ? str : index;
    });

  let index = 0,
    lookbehind = '' as string | number,
    funIndex = 0;

  while (source != null && index < paths.length) {
    const token = paths[index++];

    switch (true) {
      case token === '..':
      case token === '.':
        break;
      case token === '?': {
        const fun = fns[funIndex++];
        if (fun == null) throw new Error(`missing function for ${lookbehind}`);
        source = filterOrMap(source, fun);
        break;
      }
      case typeof token === 'number': {
        source = normalize((source as Record<number, unknown>)[token]);
        break;
      }
      default:
        source = getValue(source, token as string, lookbehind === '..');
    }

    lookbehind = token;
  }

  return source as JsonValue | undefined;
}
