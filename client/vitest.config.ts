import { defineProject, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineProject({
    test: {
      name: 'client',
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
);
