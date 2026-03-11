/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
          'breath-blue': 'breath-blue 2s ease-in-out infinite',
        },
        keyframes: {
          'breath-blue': {
            '0%, 100%': { boxShadow: '0 0 4px rgba(0, 51, 255, 0.4)', borderColor: 'rgba(0, 51, 255, 0.4)' },
            '50%': { boxShadow: '0 0 16px rgba(0, 51, 255, 0.8)', borderColor: '#0033FF' },
          }
        },
        boxShadow: {
          'card': '0 4px 12px rgba(0,0,0,0.05)',
        },
        colors: {
        success: '#00B578',
        warning: '#FF8F1F',
        danger: '#FF3141',
        background: '#F5F7FA',
        primary: {
          DEFAULT: '#0033FF',
          50: '#E6ECFF',
          100: '#CCD9FF',
          200: '#99B3FF',
          300: '#668CFF',
          400: '#3366FF',
          500: '#0033FF',
          600: '#0029CC',
          700: '#001F99',
          800: '#001466',
          900: '#000A33',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's reset to avoid conflicts with Ant Design
  },
}