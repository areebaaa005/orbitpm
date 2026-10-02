/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, v(`space-${n}`)])
        ),
        // Tailwind's default grays used by older code, mapped onto the same theme tokens
        gray: {
          50: v('space-950'),
          100: v('space-50'),
          200: v('space-100'),
          300: v('space-200'),
          400: v('space-400'),
          500: v('space-500'),
          600: v('space-400'),
          700: v('space-700'),
          800: v('space-800'),
          900: v('space-900'),
        },
        orbit: Object.fromEntries([50, 100, 300, 500, 600, 700].map((n) => [n, v(`orbit-${n}`)])),
        column: v('column'),
        sidebar: v('sidebar'),
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
