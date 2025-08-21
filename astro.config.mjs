// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [vue()],
  output: 'server', // Server-seitiges Rendering aktivieren

  vite: {
    plugins: [tailwindcss()]
  }
});