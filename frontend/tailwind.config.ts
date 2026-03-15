/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3eaa13',
        brand: {
          DEFAULT: '#3eaa13',
          dark: '#2d7a0e',
          light: '#e8f5e3',
          muted: '#f0f7ed',
        },
        sage: '#9EB384',
        cream: '#FAF1E4',
        stone: {
          DEFAULT: '#CEDEBD',
          warm: '#f2f0e9',
          border: '#e2e0d5',
        },
        earth: {
          DEFAULT: '#435334',
          dark: '#2d3a23',
          light: '#5d4037',
        },
        terracotta: {
          DEFAULT: '#c26d52',
          light: '#fdf4f2',
        },
        moss: '#4a5d23',
        clay: {
          50: '#f9f8f6',
          100: '#f2f0eb',
          200: '#e5e1d8',
          300: '#d1cdc2',
          400: '#9ca3af',
          500: '#6b7280',
        },
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        fraunces: ['Fraunces', 'serif'],
        sans: ['Manrope', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      borderRadius: {
        twelve: '12px',
        custom: '12px',
        twenty: '20px',
        card: '20px',
        btn: '14px',
        clay: '32px',
      },
      boxShadow: {
        clay: '12px 12px 24px rgba(0,0,0,0.06), inset -8px -8px 16px rgba(0,0,0,0.03), inset 8px 8px 16px rgba(255,255,255,0.85)',
        'clay-sm': '6px 6px 12px rgba(0,0,0,0.06), inset -4px -4px 8px rgba(0,0,0,0.03), inset 4px 4px 8px rgba(255,255,255,0.85)',
        'clay-btn': '6px 6px 12px rgba(0,0,0,0.12), inset -4px -4px 8px rgba(0,0,0,0.2), inset 4px 4px 8px rgba(255,255,255,0.3)',
        card: '0 4px 20px -2px rgba(0,0,0,0.05)',
        glow: '0 0 20px rgba(62,170,19,0.3)',
        'clay-card': '12px 12px 24px rgba(0, 0, 0, 0.05), inset -10px -10px 15px rgba(0, 0, 0, 0.03), inset 10px 10px 15px rgba(255, 255, 255, 0.9)',
      },
      animation: {
        breathing: 'breathing 5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        breathing: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.01)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(62, 170, 19, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(62, 170, 19, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
