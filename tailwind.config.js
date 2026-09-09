/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#8b5cf6',
        accent: '#3b82f6',
        background: '#0a0a0a',
        foreground: '#fafafa',
      },
    },
  },
  plugins: [],
};