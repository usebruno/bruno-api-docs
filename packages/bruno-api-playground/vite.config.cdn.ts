import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';
import { cdnExternals } from '../bruno-shared/src/utils/cdnExternals';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const runtimeModules = new Map<string, string>();

const cdnRuntime = (): Plugin => ({
  name: 'cdn-runtime',
  async buildStart() {
    for (const [name, specifier] of Object.entries(cdnExternals)) {
      const resolved = await this.resolve(specifier, resolve(__dirname, 'src/index.ts'));
      if (!resolved) throw new Error(`Cannot resolve CDN external ${specifier}`);
      // Packages are matched by bare name; shared files by path, since they are also reached by relative imports.
      runtimeModules.set(resolved.id.includes('/node_modules/') ? specifier : resolved.id, name);
    }
  },
  async resolveDynamicImport(specifier, importer) {
    if (typeof specifier !== 'string') return null;
    const resolved = await this.resolve(specifier, importer);
    return resolved && runtimeModules.has(resolved.id) ? `\0runtime:${resolved.id}` : null;
  },
  resolveId: (id) => (id.startsWith('\0runtime:') ? id : null),
  load(id) {
    if (!id.startsWith('\0runtime:')) return null;
    const target = JSON.stringify(id.slice('\0runtime:'.length));
    return `export * from ${target}; export { default } from ${target};`;
  }
});

export default defineConfig({
  plugins: [react(), cdnRuntime()],
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
      external: (id) => runtimeModules.has(id),
      output: {
        entryFileNames: 'api-playground-[hash].js',
        interop: 'esModule',
        globals: (id) => `Bruno.__rt.${runtimeModules.get(id)}`
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
