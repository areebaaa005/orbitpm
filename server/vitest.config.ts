import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 40000,
    hookTimeout: 40000,
    fileParallelism: false, // shared test DB — avoid cross-file race conditions
    setupFiles: ['./src/tests/setup.ts'],
  },
});
