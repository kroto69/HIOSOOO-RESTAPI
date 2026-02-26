import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui"],
      },
      colors: {
        slate: {
          50: "#f3f7fb",
          100: "#e6eef7",
          200: "#d3e1ef",
          300: "#b8cde2",
          400: "#8eabc7",
          500: "#6c8aa6",
          600: "#4f6d88",
          700: "#3d556e",
          800: "#2c3f54",
          900: "#1b2837",
        },
        primary: {
          DEFAULT: "#4478AA",
          foreground: "#FFFFFF",
        },
        success: "#2F9E6B",
        danger: "#D63B4A",
        warning: "#f07e32",
        mint: "#9FD8C5",
        lime: "#9FE085",
        ink: "#1F3247",
        muted: "#4F6D88",
        surface: "#ECF5FB",
      },
      boxShadow: {
        card: "0 12px 28px rgba(27, 40, 55, 0.10)",
        lift: "0 20px 44px rgba(27, 40, 55, 0.14)",
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.06)", opacity: "0.5" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(120deg, rgba(68, 120, 170, 0.96), rgba(94, 153, 192, 0.94) 45%, rgba(159, 216, 197, 0.93) 80%, rgba(159, 224, 133, 0.90))",
        mesh:
          "radial-gradient(circle at 20% 20%, rgba(68, 120, 170, 0.26), transparent 52%), radial-gradient(circle at 78% 8%, rgba(159, 216, 197, 0.26), transparent 44%), radial-gradient(circle at 84% 84%, rgba(159, 224, 133, 0.18), transparent 52%)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
