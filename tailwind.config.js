/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        criana: {
          50: '#fdf4f5',
          100: '#fbe8eb',
          200: '#f7d5da',
          300: '#f0b5be',
          400: '#e58897',
          500: '#d55f73',
          600: '#be4157',
          700: '#9f3246',
          800: '#852c3c',
          900: '#712936',
        },
      },
    },
  },
  plugins: [],
};
