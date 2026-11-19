import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: { DEFAULT: '#c2410c', dark: '#9a3412', light: '#fff7ed' } } } },
  plugins: [],
} satisfies Config;
