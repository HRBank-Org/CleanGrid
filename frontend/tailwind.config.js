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
          DEFAULT: '#00BFA6',
          dark: '#00A896',
          light: '#4DD0B8',
          50: '#E6FAF7',
          100: '#B3F0E8',
          200: '#80E6D9',
          300: '#4DD0B8',
          400: '#26C6A8',
          500: '#00BFA6',
          600: '#00A896',
          700: '#008F80',
          800: '#00766A',
          900: '#005C54',
        },
        secondary: {
          DEFAULT: '#0A2342',
          light: '#1A3A5C',
          50: '#E8EBF0',
          100: '#C5CDD9',
          200: '#9EADC2',
          300: '#778DAB',
          400: '#597498',
          500: '#3B5B85',
          600: '#2D4A70',
          700: '#1F395B',
          800: '#122846',
          900: '#0A2342',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
