import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  outDir: 'dist',
  banner: {
    js: '#!/usr/bin/env node',
  },
  clean: true,
});
