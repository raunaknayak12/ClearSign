import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── ClearSign Design Tokens (UX Brief §14) ──
      colors: {
        // Shadcn UI compatibility mapping
        background: "#FFFFFF",
        foreground: "#0F1E35",
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#4F6EF7",
        primary: {
          DEFAULT: "#2C5EE8",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F1F5FD",
          foreground: "#4B5563",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F8F9FC",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#F1F5FD",
          foreground: "#0F1E35",
        },
        brand: {
          DEFAULT: "#2C5EE8",
          accent: "#4F6EF7",
          dark: "#1A3DA8",
          light: "#E0E7FF",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F8F9FC",
          secondary: "#F1F5FD",
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
        info: "#0EA5E9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "'Courier New'", "monospace"],
      },
      keyframes: {
        slideIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        in: "slideIn 200ms ease-out both",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
