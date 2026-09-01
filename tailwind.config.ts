import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Accent principal : violet/périwinkle doux (inspiration "Skynex").
        brand: {
          50: "#f4f2fe",
          100: "#eae6fd",
          200: "#d7cffb",
          300: "#bcaef7",
          400: "#9f8bf1",
          500: "#8368e9",
          600: "#6f4fdd",
          700: "#5d3ec4",
          800: "#4d359e",
          900: "#40307d",
        },
        // Fin de dégradé rose/magenta doux.
        accent: {
          400: "#f19ad0",
          500: "#e879c0",
          600: "#d95bab",
        },
        ink: {
          DEFAULT: "#211f2e",
          soft: "#645f7a",
          faint: "#a09bbb",
        },
        // Neutres froids légèrement lilas.
        sand: {
          50: "#f8f7fc",
          100: "#f0eef8",
          200: "#e3dff1",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["Georgia", "'Times New Roman'", "serif"],
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(70, 55, 130, 0.22)",
        card: "0 4px 20px -8px rgba(70, 55, 130, 0.16)",
        nav: "0 -6px 24px -10px rgba(70, 55, 130, 0.18)",
        glow: "0 10px 30px -8px rgba(131, 104, 233, 0.45)",
      },
      backgroundImage: {
        "grad-brand": "linear-gradient(120deg, #8368e9 0%, #a06cf0 45%, #e879c0 100%)",
        "grad-soft": "linear-gradient(160deg, #efe9fe 0%, #f8f4fb 45%, #fdeef4 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.7)", opacity: "0" },
        },
        "pin-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "70%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "pin-pop": "pin-pop 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
