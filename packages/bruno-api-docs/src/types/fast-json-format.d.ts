/**
 * `fast-json-format` ships no type declarations (CommonJS, single default
 * export). It pretty-prints a JSON-like string without parsing it — returning
 * '' for `undefined` and falling back to `JSON.stringify` for non-strings.
 */
declare module 'fast-json-format' {
  export default function fastJsonFormat(input: string, indent?: string): string;
}
