import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        alexandria: ['var(--font-alexandria)', 'sans-serif'],
      },
      colors: {
        brand: {
          black: '#1A1A1A',
          ink: '#0F172A',
          cyan: '#00E5FF',
          purple: '#BD00FF',
          sand: '#F8F6F1',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to top right, #00E5FF, #BD00FF)',
        'brand-gradient-reverse': 'linear-gradient(to bottom left, #00E5FF, #BD00FF)',
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0, 229, 255, 0.3)',
        'glow-purple': '0 0 30px rgba(189, 0, 255, 0.3)',
        brand: '0 10px 40px rgba(0, 229, 255, 0.15), 0 10px 40px rgba(189, 0, 255, 0.1)',
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px -8px rgba(15, 23, 42, 0.12)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.06), 0 20px 44px -12px rgba(15, 23, 42, 0.22)',
      },
    },
  },
  plugins: [],
};

export default config;
