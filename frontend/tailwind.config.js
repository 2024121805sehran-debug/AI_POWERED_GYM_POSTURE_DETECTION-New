/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Premium brand colors
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Background colors
        bg: {
          primary: '#FFFFFF',
          secondary: '#F8FAFC',
          tertiary: '#F4F7FB',
        },
        // Text colors
        text: {
          primary: '#111827',
          secondary: '#374151',
          muted: '#6B7280',
        },
        // Status colors
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#16A34A',
          600: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
        },
        // Glass colors
        glass: {
          white: 'rgba(255, 255, 255, 0.70)',
          light: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(15, 23, 42, 0.05)',
        },
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
        'glass-hover': '0 8px 40px rgba(0, 0, 0, 0.08)',
        'float': '0 10px 40px rgba(79, 70, 229, 0.15)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      borderRadius: {
        'glass': '20px',
        'glass-lg': '28px',
        'glass-sm': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
