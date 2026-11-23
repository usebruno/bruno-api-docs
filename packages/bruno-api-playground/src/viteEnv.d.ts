/// <reference types="vite/client" />

declare module 'atob/node-atob' {
  const atob: (input: string) => string;
  export default atob;
}

declare const __BRUNO_BUILD__: Record<'sha' | 'ref' | 'version' | 'env' | 'run' | 'built_at', string | null>;
