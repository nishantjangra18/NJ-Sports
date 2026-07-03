import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#070707",
          card: "#111111",
          line: "#222222",
          muted: "#A0A0A0",
          accent: "#E50914"
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        premium: "0 24px 80px rgba(0, 0, 0, 0.55)"
      }
    }
  },
  plugins: []
};

export default config;
