/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "#0f172a", // Slate 900
        primary: "#6366f1", // Indigo 500
        secondary: "#10b981", // Emerald 500
        accent: "#f59e0b", // Amber 500
      }
    },
  },
  plugins: [],
}
