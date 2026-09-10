import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
        },
        indigo: {
          600: '#6366f1',
          700: '#4f46e5',
          500: '#818cf8',
        },
      },
    },
  },
  plugins: [],
}
export default config