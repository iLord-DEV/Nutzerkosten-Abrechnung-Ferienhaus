/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
    function({ addComponents }) {
      addComponents({
        'input.input, select.select, textarea.textarea': {
          backgroundColor: '#f8fafc',
        },
      })
    }
  ],
  daisyui: {
    themes: ["light", "dark"],
  },
}
