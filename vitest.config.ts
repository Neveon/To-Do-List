import { defineConfig } from 'vitest/config';

// Each workspace owns its own vitest.config.ts (environment, setup files);
// this root config runs them all with a single `npm test`.
export default defineConfig({
  test: {
    projects: ['*/vitest.config.ts'],
  },
});
