/**
 * Prettier v2 ships no bundled type declarations for its `standalone` /
 * `parser-*` entry points, and there is no matching `@types/prettier` installed.
 * Declare the minimal surface the response formatter uses: `format` from the
 * browser-safe standalone build, driven by the Babel parser plugin.
 */
declare module 'prettier/standalone' {
  export function format(source: string, options?: Record<string, unknown>): string;
  const prettier: { format: typeof format };
  export default prettier;
}

declare module 'prettier/parser-babel' {
  const plugin: unknown;
  export default plugin;
}
