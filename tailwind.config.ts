import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NMC brand palette (navy / gold), matching existing procurement templates
        navy: { DEFAULT: '#1B2A4A', 50: '#eef2f8', 100: '#dbe3f0', 700: '#243a63' },
        gold: { DEFAULT: '#C9A227', 50: '#fdf8e7', 100: '#f7ecc4' },
      },
    },
  },
  plugins: [],
};
export default config;
