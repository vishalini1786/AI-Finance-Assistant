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
          blue: '#2563EB',        // Primary Brand Blue
          blueDark: '#1E40AF',    // Active / Darker Blue
          blueHover: '#1D4ED8',
          light: '#F8FAFC',       // SaaS Canvas Background
          card: '#FFFFFF',
          safe: '#10B981',        // Income / Positive (Green)
          danger: '#EF4444',      // Expense / Critical (Red)
          warning: '#F59E0B',     // Alerts / High Utilization (Orange/Amber)
          purple: '#8B5CF6',      // Investments / AI Accent
          teal: '#0D9488',        // Savings Goals
        },
      },
    },
  },
  plugins: [],
}