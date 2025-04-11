/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {},
      screens: {
        sm: "480px",
        md: "600px", // ← 기존보다 줄임!
        lg: "1024px",
        xl: "1280px",
      },
    },
    plugins: [],
  }
  