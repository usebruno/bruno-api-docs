/// <reference types="vite/client" />

declare const __BRUNO_BUILD__: Record<'sha' | 'ref' | 'version' | 'env' | 'run' | 'built_at', string | null>;

declare module 'atob/node-atob' {
  const atob: (input: string) => string;
  export default atob;
}
