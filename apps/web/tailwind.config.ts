import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Driven by CSS variables defined in globals.css; ThemeInjector overrides
        // them at runtime per tenant for white-labelled dashboards.
        brand: {
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark-rgb) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
