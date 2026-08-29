/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          50: '#F5F6FA',
          100: '#E7E9F3',
          200: '#CDD1E5',
          300: '#A7ADC9',
          400: '#7D84A8',
          500: '#565D82',
          600: '#3D4460',
          700: '#232B45',
          800: '#161C30',
          900: '#0F1424',
          950: '#0A0E1A',
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
        card: '0 1px 2px rgba(15, 20, 36, 0.04), 0 1px 3px rgba(15, 20, 36, 0.06)',
        popover: '0 8px 24px rgba(10, 14, 26, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
