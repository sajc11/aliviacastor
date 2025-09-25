import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class', '[data-mode="personal"]'],
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        professional: { background: '#f7f7fb', foreground: '#151826', accent: '#1f6feb' },
        personal: { background: '#0f172a', foreground: '#f8fafc', accent: '#f97316' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [typography],
};
export default config;