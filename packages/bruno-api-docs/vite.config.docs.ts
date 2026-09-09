import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// One surface per bundle. Same shape as vite.config.standalone.ts, which builds
// both surfaces together; only the entry differs.
export default defineConfig({
  resolve: {
    alias: {
      '@slices': resolve(__dirname, 'src/store/slices'),
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/entries/docs.ts'),
      name: 'OpenCollectionDocs',
      fileName: (format) => format === 'umd' ? 'docs.js' : 'docs.esm.js',
      formats: ['umd', 'es']
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        globals: {},
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'docs.css';
          }
          return assetInfo.name || 'asset';
        }
      }
    },
    outDir: 'dist-docs',
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
});
