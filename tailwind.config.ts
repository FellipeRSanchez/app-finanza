import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "primary": {
          DEFAULT: "#7311d4",
          dark: "#5a0ca8",
          new: "#7311d4", // Para garantir uso interno
        },
        "background-light": "#f7f6f8",
        "background-dark": "#191022",
        "card-light": "#ffffff",
        "card-dark": "#2c2435",
        "text-main-light": "#141118",
        "text-main-dark": "#ffffff",
        "text-secondary-light": "#756189",
        "text-secondary-dark": "#a090b0",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"], // Padronizado conforme design
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        full: "9999px"
      },
      boxShadow: {
        "soft": "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        "hover": "0 10px 25px -5px rgba(115, 17, 212, 0.15), 0 8px 10px -6px rgba(115, 17, 212, 0.1)",
        "card": "0 4px 20px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;