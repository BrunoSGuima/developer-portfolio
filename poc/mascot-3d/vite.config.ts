import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// ENTRY builds one page alone (for honest size measurements); without it, every page is built.
const pages = ['baseline', 'plain', 'r3f', 'stage', 'bench', 'csp'];
const entry = process.env['ENTRY'];
const names = entry ? [entry] : pages;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: entry ? `dist/sizes/${entry}` : 'dist/site',
    emptyOutDir: true,
    // Same module-preload behaviour as the shell's default build
    rollupOptions: {
      input: Object.fromEntries(names.map((n) => [n, resolve(import.meta.dirname, `${n}.html`)])),
    },
  },
});
