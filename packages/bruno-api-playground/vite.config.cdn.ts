import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const shared = (path: string) => resolve(__dirname, '../bruno-shared/src', path);

const runtimeModules: Record<string, string> = {
  'react': 'react',
  'react-dom': 'reactDom',
  'react/jsx-runtime': 'jsxRuntime',
  'react-router-dom': 'reactRouterDom',
  [shared('session/session.tsx')]: 'session',
  [shared('document/document.tsx')]: 'document',
  [shared('hooks/useVariableResolver.tsx')]: 'variableResolver',
  [shared('session/playgroundRuns.ts')]: 'playgroundRuns',
  [shared('ui/CodeEditor/CodeEditor.tsx')]: 'codeEditor',
  [shared('utils/prism.ts')]: 'prism',
  [shared('utils/fakerFunctions.ts')]: 'fakerFunctions',
  [shared('utils/dataFormatter.ts')]: 'dataFormatter'
};

const dynamicRuntimeImports = (): Plugin => ({
  name: 'dynamic-runtime-imports',
  async resolveDynamicImport(specifier, importer) {
    if (typeof specifier !== 'string') return null;
    const resolved = await this.resolve(specifier, importer);
    return resolved && resolved.id in runtimeModules ? `\0runtime:${resolved.id}` : null;
  },
  resolveId: (id) => (id.startsWith('\0runtime:') ? id : null),
  load(id) {
    if (!id.startsWith('\0runtime:')) return null;
    const target = JSON.stringify(id.slice('\0runtime:'.length));
    return `export * from ${target}; export { default } from ${target};`;
  }
});

export default defineConfig({
  plugins: [react(), dynamicRuntimeImports()],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '__brunoApiPlayground',
      formats: ['iife']
    },
    rollupOptions: {
      external: (id) => id in runtimeModules,
      output: {
        entryFileNames: 'api-playground-[hash].js',
        interop: 'esModule',
        globals: (id) => `Bruno.__rt.${runtimeModules[id]}`
      }
    },
    outDir: 'dist-cdn',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
