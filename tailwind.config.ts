import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: ["Cascadia Code", "Consolas", "Menlo", "monospace"],
      },
      colors: {
        // Azure-themed tokens (Fluent 2 inspired)
        bg: {
          DEFAULT: "var(--bg)",
          subtle: "var(--bg-subtle)",
          muted: "var(--bg-muted)",
          inverse: "var(--bg-inverse)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
          subtle: "var(--border-subtle)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
          inverse: "var(--fg-inverse)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          pressed: "var(--accent-pressed)",
          subtle: "var(--accent-subtle)",
          fg: "var(--accent-fg)",
        },
        success: {
          DEFAULT: "var(--success)",
          subtle: "var(--success-subtle)",
          fg: "var(--success-fg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          subtle: "var(--warning-subtle)",
          fg: "var(--warning-fg)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          subtle: "var(--danger-subtle)",
          fg: "var(--danger-fg)",
        },
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        flat: "0 0 0 1px var(--border)",
        depth8: "0 1.6px 3.6px rgba(0,0,0,0.08), 0 0.3px 0.9px rgba(0,0,0,0.06)",
        depth16: "0 3.2px 7.2px rgba(0,0,0,0.10), 0 0.6px 1.8px rgba(0,0,0,0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
