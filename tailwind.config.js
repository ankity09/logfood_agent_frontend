/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00E599',
          50: '#E6FFF6',
          100: '#B3FFE6',
          200: '#80FFD6',
          300: '#4DFFC6',
          400: '#1AFFB6',
          500: '#00E599',
          600: '#00B377',
          700: '#008055',
          800: '#004D33',
          900: '#001A11',
        },
        accent: {
          DEFAULT: '#FF3621',
          light: '#FF5C4A',
          dark: '#CC2B1A',
        },
        neon: {
          green: '#00E599',
          blue: '#00D4FF',
          purple: '#A855F7',
          pink: '#EC4899',
          orange: '#FF3621',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          50: '#1A1A1A',
          100: '#141414',
          200: '#0F0F0F',
          300: '#0A0A0A',
          400: '#050505',
          500: '#000000',
        },
        gray: {
          850: '#1F2937',
          950: '#0D1117',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 229, 153, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(0, 229, 153, 0.6)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glow-gradient': 'linear-gradient(135deg, rgba(0, 229, 153, 0.1) 0%, rgba(0, 212, 255, 0.1) 50%, rgba(168, 85, 247, 0.1) 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 229, 153, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 229, 153, 0.4)',
        'glow-accent': '0 0 20px rgba(255, 54, 33, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(0, 229, 153, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
