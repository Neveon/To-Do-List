import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'node',
  format: 'esm',
  sourcemap: true,
  // @todo/shared is TypeScript source inside this repo, so it is compiled into the bundle;
  // every other dependency is loaded from node_modules at runtime.
  deps: { alwaysBundle: ['@todo/shared'] },
});
