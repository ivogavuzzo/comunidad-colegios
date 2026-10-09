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
        petroleo: {
          DEFAULT: '#2F4F4F',
          dark: '#233B3B',
          light: '#3C6464',
          50: '#F4F7F7',
          100: '#E6ECEC',
          200: '#C7D5D5',
          300: '#A1BABE',
          400: '#5A7E7E',
          500: '#2F4F4F',
          600: '#284343',
          700: '#203737',
          800: '#182A2A',
          900: '#101C1C',
        },
        coral: {
          DEFAULT: '#C96D68',
          hover: '#BA5B56',
          light: '#F8ECEB',
          dark: '#A64F4A',
        },
        mostaza: {
          DEFAULT: '#C08A33',
          hover: '#AA7728',
          light: '#F9F4E9',
          dark: '#8D631F',
        },
        ivory: '#FCFBF8',
        menta: '#EEF4F3',
        arena: '#F6F0E3',
        secondary: '#5A7E7E',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Raleway', 'sans-serif'],
        display: ['"Josefin Sans"', 'sans-serif'],
      },
      boxShadow: {
        criana: '0 10px 30px rgba(47, 79, 79, 0.04)',
        'criana-hover': '0 16px 36px rgba(47, 79, 79, 0.08)',
        'criana-card': '0 4px 20px rgba(47, 79, 79, 0.03)',
      },
      borderRadius: {
        card: '24px',
        pill: '50px',
      },
    },
  },
  plugins: [],
};
