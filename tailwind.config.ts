import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette douce "skincare" — rosé/terracotta chaleureux + neutres.
        brand: {
          50: "#fdf3f0",
          100: "#fbe4dc",
          200: "#f6c6b6",
          300: "#efa189",
          400: "#e57a5c",
          500: "#d95b3c",
          600: "#c4442a",
          700: "#a33422",
          800: "#852d20",
          900: "#6f2a20",
        },
        ink: {
          DEFAULT: "#2a2320",
          soft: "#6b615b",
          faint: "#a49a92",
        },
        sand: {
          50: "#faf7f4",
          100: "#f3ede7",
          200: "#e7dcd2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 6px 24px -8px rgba(42, 35, 32, 0.18)",
        nav: "0 -4px 20px -6px rgba(42, 35, 32, 0.14)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
