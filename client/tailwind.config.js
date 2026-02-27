/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: '#4a6e57',
          light: '#7a9e87',
          lighter: '#b5cfc0',
        },
        cream: {
          DEFAULT: '#f7f4ef',
          dark: '#e8e4dc',
        },
        charcoal: '#2c2c2c',
        mid: '#6b6b6b',
        border: '#e2ddd6',
        amber: {
          DEFAULT: '#d4924a',
          light: '#f2dfc4',
        },
        rose: {
          DEFAULT: '#c47a7a',
          light: '#f2d8d8',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
