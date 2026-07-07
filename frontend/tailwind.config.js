/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // TNEB Navy blue palette
        navy: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1e3a8a',
          700: '#1a3275',
          800: '#152960',
          900: '#0f1f4a',
          950: '#060c1e',
        },
        // Gold / amber palette
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '15%':     { transform: 'translateX(-6px)' },
          '30%':     { transform: 'translateX(6px)' },
          '45%':     { transform: 'translateX(-4px)' },
          '60%':     { transform: 'translateX(4px)' },
          '75%':     { transform: 'translateX(-2px)' },
          '90%':     { transform: 'translateX(2px)' },
        },
      },
    },
  },
  plugins: [],
}
