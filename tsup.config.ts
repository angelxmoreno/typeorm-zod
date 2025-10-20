import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        cli: 'src/cli.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    // Don't bundle dependencies for the CLI
    external: ['commander', 'chokidar', 'fast-glob', 'reflect-metadata', 'typeorm', 'zod'],
    // Keep Node.js built-ins external
    noExternal: [],
});
