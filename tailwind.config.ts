import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jc: {
          bg: "var(--jc-bg)",
          surface: "var(--jc-surface)",
          raised: "var(--jc-raised)",
          border: "var(--jc-border)",
          "border-em": "var(--jc-border-em)",
          text: "var(--jc-text)",
          "text-2": "var(--jc-text-2)",
          "text-3": "var(--jc-text-3)",
          red: "var(--jc-red)",
          "red-hover": "var(--jc-red-hover)",
          "red-muted": "var(--jc-red-muted)",
          star: "var(--jc-star)",
          confirm: "var(--jc-confirm)",
          warn: "var(--jc-warn)",
        },
      },
      fontFamily: {
        ui: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Futura PT", "sans-serif"],
      },
      fontSize: {
        micro: ["9px", { lineHeight: "12px" }],
        meta: ["11px", { lineHeight: "14px" }],
        body: ["12px", { lineHeight: "16px" }],
        ui: ["13px", { lineHeight: "18px" }],
        name: ["15px", { lineHeight: "20px" }],
        heading: ["22px", { lineHeight: "28px" }],
      },
    },
  },
  plugins: [],
};
export default config;
