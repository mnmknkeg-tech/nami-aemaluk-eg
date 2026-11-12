import type { Config } from 'tailwindcss';

/**
 * Ray Marketplace — Tailwind Config (COLOR-ONLY UPDATE)
 *
 * ما تم تغييره: قيم الألوان فقط (cyan → orange, purple → amber)
 * ما لم يتم تغييره: كل التصميم — البنر، الهيرو، الفوتر، الناف بار، الـ layout كله
 *
 * الاستراتيجية:
 *   1) الأسماء القديمة (brand.cyan, brand.purple, brand.black) اتغيّرت قيمها
 *      عشان الكود الموجود يفضل يشتغل بدون أي تعديل.
 *      مثال: bg-brand-cyan دلوقتي بيقى برتقالي تلقائياً.
 *
 *   2) اتضاف أسماء جديدة (brand.orange, brand.amber, brand.cream...)
 *      عشان ProductCard الجديد يستخدمها.
 *
 *   3) التدرجات والـ glow اتحدّثت للألوان الجديدة.
 *
 *   4) كل حاجة تانية (radius, animations, keyframes) زي ما هي.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        alexandria: ['var(--font-alexandria)', 'sans-serif'],
      },
      colors: {
        brand: {
          // ─── Legacy names (kept for backward-compat — كل الكود القديم يفضل يشتغل) ───
          // قيم الألوان اتغيّرت بس الأسماء فضلت زي ما هي عشان مفيش تعديلات في باقي الملفات.
          cyan: '#F97316', // ⚠️ كانت old-cyan — دلوقتي برتقالي (نفس اسم القديم)
          purple: '#F59E0B', // ⚠️ كانت old-purple — دلوقتي أمبر (نفس اسم القديم)
          black: '#1E293B', // ⚠️ كانت #1A1A1A — دلوقتي ink أدفأ (نفس اسم القديم)
          ink: '#0F172A', // unchanged
          sand: '#F8F6F1', // unchanged

          // ─── New tokens (للـ ProductCard الجديد بس — لا تستخدمها في تعديلات تانية) ───
          orange: '#F97316',
          'orange-dark': '#EA580C',
          'orange-light': '#FB923C',
          'orange-soft': '#FEF0DD',
          amber: '#F59E0B',
          'ink-soft': '#334155',
          'ink-muted': '#64748B',
          'ink-faint': '#94A3B8',
          cream: '#F7F8FA',
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
        // ⚠️ اتحدّثت من old-cyan→old-purple إلى #F97316→#F59E0B
        'brand-gradient': 'linear-gradient(to top right, #F97316, #F59E0B)',
        'brand-gradient-reverse': 'linear-gradient(to bottom left, #F97316, #F59E0B)',
      },
      boxShadow: {
        // ⚠️ اتحدّثت للألوان الجديدة
        'glow-cyan': '0 0 30px rgba(249, 115, 22, 0.3)', // كان rgba(0, 229, 255, 0.3)
        'glow-purple': '0 0 30px rgba(245, 158, 11, 0.3)', // كان rgba(189, 0, 255, 0.3)
        brand: '0 10px 40px rgba(249, 115, 22, 0.15), 0 10px 40px rgba(245, 158, 11, 0.1)',
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px -8px rgba(15, 23, 42, 0.12)',
        'card-hover': '0 2px 4px rgba(15, 23, 42, 0.06), 0 20px 44px -12px rgba(15, 23, 42, 0.22)',
        // ─── جديد للـ ProductCard بس ───
        'glow-orange': '0 8px 24px -6px rgba(249, 115, 22, 0.35)',
        'glow-orange-sm': '0 4px 12px rgba(249, 115, 22, 0.25)',
      },
      transitionTimingFunction: {
        // ─── جديد للـ ProductCard بس ───
        soft: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
