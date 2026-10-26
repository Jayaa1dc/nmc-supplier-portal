import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NMC brand palette (navy / gold), matching existing procurement templates
        navy: { DEFAULT: '#1B2A4A', 50: '#eef2f8', 100: '#dbe3f0', 700: '#243a63' },
        gold: { DEFAULT: '#F2B705', 50: '#FFF8DB', 100: '#FFEFA8' },
        green: { DEFAULT: '#0E9F5A', soft: '#E7F7EF' },
      },
    },
  },
  plugins: [],
};
export default config;
