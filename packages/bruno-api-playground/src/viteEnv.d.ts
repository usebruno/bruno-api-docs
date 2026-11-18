/// <reference types="vite/client" />

declare module 'atob/node-atob' {
  const atob: (input: string) => string;
  export default atob;
}
