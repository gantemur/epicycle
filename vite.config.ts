import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = new URL('.', import.meta.url);

export default defineConfig({
  root: fileURLToPath(new URL('./web/', here)),
  base: '/epicycle/',
  publicDir: false,
  server: {
    host: '127.0.0.1',
    fs: {
      strict: true,
      allow: [
        fileURLToPath(new URL('./web/', here)),
        fileURLToPath(new URL('./data/', here)),
        fileURLToPath(new URL('./tests/fixtures/', here)),
      ],
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/', here)),
    emptyOutDir: true,
  },
});
