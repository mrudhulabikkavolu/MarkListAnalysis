/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        institutional: {
          primary: '#1e3a5f',
          sidebar: '#0f2744',
          accent: '#2c5282',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Source Serif 4', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 39, 68, 0.08), 0 4px 12px rgba(15, 39, 68, 0.06)',
        elevated: '0 4px 20px rgba(15, 39, 68, 0.12)',
      },
    },
  },
  plugins: [],
};
