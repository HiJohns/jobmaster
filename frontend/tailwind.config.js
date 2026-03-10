/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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