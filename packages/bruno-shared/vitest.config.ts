import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});
