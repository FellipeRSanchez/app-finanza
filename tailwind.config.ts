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
        // Existing colors (merged or replaced as needed)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // New colors from the design model
        "primary-new": "#7311d4",
        "background-light": "#f7f6f8",
        "background-dark": "#191022",
        "card-light": "#ffffff",
        "card-dark": "#2c2435",
        "text-main-light": "#141118",
        "text-main-dark": "#ffffff",
        "text-secondary-light": "#756189",
        "text-secondary-dark": "#a090b0",
        "success-new": "#10B981",
        "danger-new": "#EF4444",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        body: ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        lg: "1rem", // Updated to match new design's 'lg'
        md: "0.5rem", // Updated to match new design's 'DEFAULT'
        sm: "calc(var(--radius) - 4px)", // Kept existing sm
        xl: "1.5rem", // New from design
        "2xl": "2rem", // New from design
        full: "9999px", // New from design
      },
      boxShadow: {
        "soft": "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        "hover": "0 10px 25px -5px rgba(115, 17, 212, 0.15), 0 8px 10px -6px rgba(115, 17, 212, 0.1)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;