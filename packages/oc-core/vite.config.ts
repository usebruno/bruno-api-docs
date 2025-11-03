import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  // Add server configuration for WASM files
  server: {
    fs: {
      allow: ['../..']
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  // Configure asset handling for WASM files
  assetsInclude: ['**/*.wasm'],
  // Add optimizeDeps configuration
  optimizeDeps: {
    exclude: ['quickjs-emscripten']
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        express: resolve(__dirname, 'src/express.ts'),
        server: resolve(__dirname, 'src/server.ts')
      },
      name: 'OpenCollectionPlayground',
      fileName: (format, entryName) => {
        if (entryName === 'index') {
          return `oc-playground.${format}.js`;
        }
        return `${entryName}.${format === 'es' ? 'js' : 'cjs'}`;
      },
    },
    rollupOptions: {
      // externalize deps that shouldn't be bundled
      external: ['react', 'react-dom', 'express'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          express: 'express',
        },
      },
    },
  },
})
