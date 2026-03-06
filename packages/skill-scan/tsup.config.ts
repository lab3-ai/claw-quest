import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/cli.ts'],
        format: ['cjs'],
        clean: true,
        target: 'node20',
        banner: { js: '#!/usr/bin/env node' },
    },
    {
        entry: ['src/index.ts'],
        format: ['cjs'],
        dts: true,
        target: 'node20',
    },
]);
