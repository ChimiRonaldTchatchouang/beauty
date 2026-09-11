import type { Config } from 'tailwindcss';

/** Charte graphique Nextiaa : orange #FF7100, noir #000000, blanc #FFFFFF. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nextiaa: {
          orange: '#FF7100',
          black: '#000000',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
