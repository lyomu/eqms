import type { Config } from "tailwindcss";

/**
 * Design tokens from CLAUDE-FRONTEND.md (SimplerQMS design system).
 * - Brand palette exposed as `brand.*` / `success` / `warning` / `error` utilities.
 * - shadcn/ui semantic tokens (`primary`, `muted`, ...) come from CSS vars in globals.css
 *   so they stay themeable; `--primary` is mapped to the brand primary blue (#1F4E79).
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "16px",
    },
    extend: {
      colors: {
        // --- SimplerQMS brand palette (raw hex) ---
        brand: {
          primary: "#1F4E79", // primary blue
          secondary: "#2E75B6", // secondary blue
          light: "#D6E4F0", // light blue background
        },
        success: "#70AD47",
        warning: "#FFC107",
        error: "#DC3545",

        // --- shadcn/ui semantic tokens (CSS variables, themeable) ---
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Arial", "Helvetica", "sans-serif"],
      },
      fontSize: {
        // Typographic scale: H1/H2/H3, body, label
        h1: ["28px", { lineHeight: "36px", fontWeight: "700" }],
        h2: ["22px", { lineHeight: "30px", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        body: ["14px", { lineHeight: "22px", fontWeight: "400" }],
        label: ["13px", { lineHeight: "18px", fontWeight: "500" }],
      },
      spacing: {
        // 16px default spacing unit (per design system)
        DEFAULT: "16px",
      },
      borderRadius: {
        // 4–8px radius range
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      keyframes: {
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
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
