import type { Config } from "tailwindcss";


const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2bee7c",
        "background-light": "#f6f8f7",
        "background-dark": "#102218",
        "surface-dark": "#183225",
        "accent-purple": "#a855f7",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-out": "fadeOut 2s ease-in-out forwards",
      },
      keyframes: {
        fadeOut: {
          "0%": { opacity: "0.8", filter: "blur(0)" },
          "100%": { opacity: "0", filter: "blur(4px)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
