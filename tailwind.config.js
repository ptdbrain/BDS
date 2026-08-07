/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdeff',
          300: '#8ec8ff',
          400: '#59a6ff',
          500: '#0066ff',
          600: '#0052e0',
          700: '#003fbc',
          800: '#003699',
          900: '#002f7a',
          950: '#001a4d',
        },
        accent: {
          cyan: '#00d2ff',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#8b5cf6',
        },
        dark: {
          bg: '#0a0d14',
          card: '#121824',
          border: '#1e293b',
          hover: '#1a2333',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(0, 102, 255, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 210, 255, 0.5)' },
        }
      }
    },
  },
  plugins: [],
}
