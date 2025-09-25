import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const KONVA = resolve(__dirname, 'node_modules/konva/lib/index.js');
const KONVA_CORE = resolve(__dirname, 'node_modules/konva/lib/Core.js');
const KONVA_GLOBAL = resolve(__dirname, 'node_modules/konva/lib/Global.js');

export default defineConfig({
  integrations: [react(), tailwind()],
  site: 'https://aliviacastor.github.io',
  vite: {
    resolve: {
      alias: [
        { find: /^konva$/, replacement: KONVA },
        { find: /^konva\/lib\/Core\.js$/, replacement: KONVA_CORE },
        { find: /^konva\/lib\/Global\.js$/, replacement: KONVA_GLOBAL },
      ]
    },
    optimizeDeps: { include: ['konva', 'react-konva', 'use-image'] },
    ssr: { noExternal: ['konva', 'react-konva'] },
  },
});
