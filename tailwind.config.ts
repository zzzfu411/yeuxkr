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
        sans: ["var(--font-sans)", "Noto Sans KR", "Noto Sans SC", "sans-serif"],
        serif: ["var(--font-serif)", "Noto Serif KR", "Songti SC", "serif"],
        mono: ["var(--font-mono)", "Cascadia Mono", "monospace"],
        brush: ["var(--font-brush)", "Ma Shan Zheng", "serif"],
        script: ["var(--font-script)", "Caveat", "cursive"]
      },
      boxShadow: {
        editorial: "var(--shadow)",
        "paper-sm": "var(--shadow-soft)",
        brutal: "var(--shadow)",
        "brutal-sm": "var(--shadow-soft)"
      },
      borderRadius: {
        DEFAULT: "var(--radius)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
