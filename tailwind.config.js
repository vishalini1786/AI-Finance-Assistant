/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finman: {
          purple: '#6D28D9',
          purpleDark: '#4C1D95',
          accent: '#A78BFA',
          light: '#F5F3FF',
          safe: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
}