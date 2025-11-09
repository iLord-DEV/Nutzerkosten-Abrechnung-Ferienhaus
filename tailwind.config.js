/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        wuestenstein: {
          // Primary colors (Soft Blue scheme)
          "primary": "#60a5fa",           // blue-400 (softer, lighter blue)
          "primary-content": "#ffffff",   // white text on primary for good contrast

          // Secondary/Accent (Soft colors)
          "secondary": "#a78bfa",         // violet-400
          "secondary-content": "#ffffff", // white text for contrast

          "accent": "#34d399",            // emerald-400
          "accent-content": "#1e293b",    // dark text works on emerald

          // Semantic colors (softer)
          "success": "#34d399",           // emerald-400
          "success-content": "#1e293b",   // dark text works on emerald

          "warning": "#fbbf24",           // amber-400
          "warning-content": "#1e293b",   // dark text works on amber

          "error": "#f87171",             // red-400
          "error-content": "#ffffff",     // white text for contrast on red

          "info": "#60a5fa",              // blue-400
          "info-content": "#ffffff",      // white text for contrast

          // Neutral colors
          "base-100": "#ffffff",          // White background
          "base-200": "#f8fafc",          // slate-50 (lighter gray)
          "base-300": "#e2e8f0",          // slate-200 (light gray)
          "base-content": "#1e293b",      // slate-800 (dark text)

          // Neutral shades for text/borders
          "neutral": "#64748b",           // slate-500
          "neutral-content": "#ffffff",
        },
        // Dark theme variant
        "wuestenstein-dark": {
          "primary": "#64748b",           // slate-500 (lighter for dark mode)
          "primary-content": "#ffffff",

          "secondary": "#0ea5e9",         // sky-500
          "secondary-content": "#ffffff",

          "accent": "#38bdf8",            // sky-400 (lighter for dark)
          "accent-content": "#0f172a",    // slate-900

          "success": "#10b981",           // emerald-500
          "success-content": "#ffffff",

          "warning": "#f59e0b",           // amber-500
          "warning-content": "#ffffff",

          "error": "#f43f5e",             // rose-500
          "error-content": "#ffffff",

          "info": "#3b82f6",              // blue-500
          "info-content": "#ffffff",

          // Dark backgrounds
          "base-100": "#0f172a",          // slate-900
          "base-200": "#1e293b",          // slate-800
          "base-300": "#334155",          // slate-700
          "base-content": "#f1f5f9",      // slate-100 (light text)

          "neutral": "#475569",           // slate-600
          "neutral-content": "#f1f5f9",   // slate-100
        },
      },
    ],
    darkTheme: "wuestenstein-dark", // Set dark theme name
    base: true, // Apply DaisyUI base styles
    styled: true, // Apply DaisyUI component styles
    utils: true, // Add DaisyUI utility classes
    logs: false, // Disable DaisyUI logs
  },
}
