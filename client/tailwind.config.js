/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#F4F5F9',
          100: '#E4E7EF',
          200: '#C8CDDB',
          300: '#A2A9BC',
          400: '#7A8298',
          500: '#525A6E',
          600: '#313644',
          700: '#22262F',
          800: '#161922',
          900: '#0E1016',
          950: '#07080B',
        },
        orbit: {
          50: '#EEF0FF',
          100: '#E0E3FF',
          300: '#ABA9FF',
          500: '#5B5FEF',
          600: '#4A4DD9',
          700: '#3A3DB0',
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
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgba(91,95,239,0.45), 0 8px 30px rgba(91,95,239,0.18)',
        popover: '0 8px 24px rgba(10, 14, 26, 0.12)',
      },
      borderRadius: {
        xl2: '0.875rem',
      },
    },
  },
  plugins: [],
};
