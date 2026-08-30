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
        editorial: "4px 4px 0 var(--shadow-color)",
        "paper-sm": "3px 3px 0 var(--shadow-color)",
        brutal: "4px 4px 0 var(--shadow-color)",
        "brutal-sm": "3px 3px 0 var(--shadow-color)"
      },
      borderRadius: {
        DEFAULT: "0px"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
