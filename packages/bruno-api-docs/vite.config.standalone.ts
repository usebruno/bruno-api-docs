import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { basename, resolve } from 'path';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const loadFile = resolve(__dirname, 'src/components/Playground/load.ts');
const loadCdnFile = resolve(__dirname, 'src/components/Playground/loadCdn.ts');

const findPlaygroundFile = () => {
  const playgroundDir = resolve(__dirname, '../bruno-api-playground/dist-cdn');
  const file = readdirSync(playgroundDir).find((name) => /^playground-view-.+\.js$/.test(name));
  if (!file) throw new Error(`No playground-view-*.js in ${playgroundDir}; run build:cdn in bruno-api-playground`);
  return resolve(playgroundDir, file);
};

const playgroundCdn = (playgroundPath: string): Plugin => ({
  name: 'playground-cdn',
  enforce: 'pre',
  async resolveId(id, importer) {
    if (!id.endsWith('/load')) return;
    const resolved = await this.resolve(id, importer, { skipSelf: true });
    if (resolved?.id === loadFile) return loadCdnFile;
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: basename(playgroundPath), source: readFileSync(playgroundPath) });
  }
});

const noCss = (): Plugin => ({
  name: 'no-css',
  generateBundle: {
    order: 'post',
    handler(_, bundle) {
      const css = Object.keys(bundle).filter((name) => name.endsWith('.css'));
      if (css.length) this.error(`api-playground.js must not emit CSS (${css.join(', ')}): it would overwrite api-docs.css`);
    }
  }
});

const build = {
  sha: process.env.BUILD_SHA ?? null,
  ref: process.env.BUILD_REF ?? null,
  version: process.env.BUILD_VERSION ?? null,
  env: process.env.BUILD_ENV ?? null,
  run: process.env.BUILD_RUN ?? null,
  built_at: process.env.BUILD_TIME ?? null
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const playgroundPath = mode === 'playground' ? null : findPlaygroundFile();
  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: playgroundPath ? [react(), playgroundCdn(playgroundPath)] : [react(), noCss()],
    define: {
      'process.env.NODE_ENV': '"production"',
      '__BRUNO_BUILD__': JSON.stringify(build),
      ...(playgroundPath && { '__API_PLAYGROUND_FILE__': JSON.stringify(basename(playgroundPath)) })
    },
    build: {
      lib: mode === 'playground'
        ? {
            entry: resolve(__dirname, '../bruno-api-playground/src/standalone.ts'),
            name: 'BrunoApiPlayground',
            fileName: () => 'api-playground.js',
            formats: ['umd']
          }
        : {
            entry: resolve(__dirname, 'src/standalone.ts'),
            name: 'OpenCollectionPlayground',
            fileName: (format) => format === 'umd' ? 'api-docs.js' : 'api-docs.esm.js',
            formats: ['umd', 'es']
          },
      emptyOutDir: mode !== 'playground',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // Bundle everything into a single file
          inlineDynamicImports: true,
          manualChunks: undefined,
          globals: {},
          exports: 'named',
          // Ensure CSS is extracted properly
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'api-docs.css';
            }
            return assetInfo.name || 'asset';
          }
        }
      },
      outDir: 'dist-standalone',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    css: {
      postcss: './postcss.config.cjs'
    }
  };
});
