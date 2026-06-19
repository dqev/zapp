/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#09090b',
        'element-background': '#2c2c2c',
        'card-background': '#09090b',
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1aa',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['EB Garamond', 'serif'],
        serif: ['EB Garamond', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
