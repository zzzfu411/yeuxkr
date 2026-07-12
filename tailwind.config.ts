import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Noto Sans KR", "Noto Sans CJK SC", "sans-serif"],
        serif: ["var(--font-serif)", "Noto Serif KR", "Songti SC", "serif"],
        mono: ["var(--font-mono)", "Cascadia Mono", "monospace"]
      },
      boxShadow: {
        editorial: "0 24px 70px rgba(24, 28, 27, 0.13)",
        "paper-sm": "0 12px 34px rgba(24, 28, 27, 0.08)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
