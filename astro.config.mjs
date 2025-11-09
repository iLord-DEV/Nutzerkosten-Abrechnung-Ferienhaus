// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [
    vue(),
    tailwind({
      // Verwende die tailwind.config.js für DaisyUI
      configFile: './tailwind.config.js',
    })
  ],
  output: 'server', // Server-seitiges Rendering aktivieren
  adapter: node({
    mode: 'standalone'
  })
});