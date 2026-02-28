// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    vue(),
    tailwind({
      // Verwende die tailwind.config.js für DaisyUI
      configFile: './tailwind.config.js',
    }),
    AstroPWA({
      mode: 'production',
      base: '/',
      scope: '/',
      includeAssets: ['favicon.svg'],
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Wüstenstein Nutzerkosten',
        short_name: 'Wüstenstein',
        description: 'Nutzerkosten-Abrechnung für Schloss Wüstenstein',
        theme_color: '#2563eb',
        background_color: '#1f2937',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff,woff2}'],
        globIgnores: ['uploads/**']
      },
      devOptions: {
        enabled: false // Dev-Modus deaktiviert (PWA nur in Production)
      }
    })
  ],
  output: 'server', // Server-seitiges Rendering aktivieren
  adapter: node({
    mode: 'standalone'
  })
});