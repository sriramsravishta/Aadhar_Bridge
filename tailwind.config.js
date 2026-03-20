/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FAF8F5',
          raised: '#F2EEED',
        },
        border: '#E0DBD4',
        frame: '#2582A1',
        'text-primary': '#3D4044',
        'text-secondary': '#7A7670',
        'accent-warm': '#C47A5A',
        success: '#2582A1',
        error: '#B85C5C',
      },
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.04)',
      },
      transitionTimingFunction: {
        ink: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
      },
    },
  },
  plugins: [],
};
