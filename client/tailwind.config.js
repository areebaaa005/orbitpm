/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#172B4D',
          100: '#253858',
          200: '#42526E',
          300: '#505F79',
          400: '#6B778C',
          500: '#8993A4',
          600: '#C1C7D0',
          700: '#DFE1E6',
          800: '#F1F2F4',
          900: '#FFFFFF',
          950: '#F4F5F7',
        },
        gray: {
          50: '#F4F5F7',
          100: '#172B4D',
          200: '#253858',
          300: '#42526E',
          400: '#6B778C',
          500: '#8993A4',
          600: '#6B778C',
          700: '#DFE1E6',
          800: '#F1F2F4',
          900: '#FFFFFF',
        },
        orbit: {
          50: '#E9F2FF',
          100: '#CCE0FF',
          300: '#0055CC',
          500: '#0C66E4',
          600: '#0055CC',
          700: '#09326C',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        ink: {
          900: '#111827',
          600: '#4B5563',
          400: '#9CA3AF',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
        glow: '0 0 0 2px rgba(12,102,228,0.35)',
        popover: '0 8px 24px rgba(10, 14, 26, 0.12)',
      },
      borderRadius: {
        xl2: '0.5rem',
      },
    },
  },
  plugins: [],
};
