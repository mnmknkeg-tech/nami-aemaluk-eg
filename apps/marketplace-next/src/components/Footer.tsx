'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useApp } from './AppProvider';
import { siteConfig } from '@/lib/config';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Send,
  Wallet,
  Sparkles
} from 'lucide-react';

export function Footer() {
  const { lang } = useApp();
  const ar = lang === 'ar';

  return (
    <footer className="bg-brand-black text-white pt-20 pb-10 border-t border-white/5 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-20 relative z-10 text-right rtl">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center gap-3 justify-end">
              <span className="text-xl md:text-2xl font-bold tracking-tight text-gradient">{ar ? siteConfig.nameArabic : siteConfig.name}</span>
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center p-2 backdrop-blur-sm">
                <Image src="/brand/logo.png" alt="MNMKNK" width={32} height={32} className="w-full h-full object-contain" />
              </div>
            </div>
            
            <p className="text-white/60 text-base font-semibold leading-relaxed max-w-sm mr-auto lg:mr-0">
              {ar 
                ? 'المنصة الأولى والوحيدة في مصر التي تجمع بين التجارة والخدمات والذكاء الاصطناعي في مكان واحد.' 
                : 'The first and only platform in Egypt that combines commerce, services, and AI in one place.'}
            </p>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-brand-cyan">
                {ar ? 'اشترك في نشرتنا الإخبارية' : 'Subscribe to our newsletter'}
              </h4>
              <div className="relative max-w-sm group mr-auto lg:mr-0">
                <input 
                  type="email" 
                  placeholder={ar ? 'بريدك الإلكتروني...' : 'Your email...'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 pl-14 text-white font-semibold text-sm focus:bg-white/10 focus:border-brand-cyan transition-all outline-none text-right"
                />
                <button className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-cyan text-brand-black rounded-lg flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-brand-cyan/20">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-end">
              {[
                { icon: Facebook, href: 'https://facebook.com/mnmknk' },
                { icon: Instagram, href: 'https://instagram.com/mnmknk' },
                { icon: Twitter, href: '#' },
                { icon: Youtube, href: '#' },
                { icon: Linkedin, href: '#' }
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href} 
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-brand-cyan hover:border-brand-cyan hover:bg-brand-cyan/5 transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
              {/* Explore */}
              <div className="space-y-6">
                <h3 className="font-semibold text-xs text-white/40 flex items-center gap-2 justify-end">
                  {ar ? 'استكشف' : 'Explore'}
                  <div className="w-1 h-1 bg-brand-cyan rounded-full" />
                </h3>
                <nav className="flex flex-col gap-4 items-end">
                  {[
                    { label: ar ? 'الدليل التجاري' : 'Business Directory', href: '/dalil' },
                    { label: ar ? 'الخريطة التفاعلية' : 'Interactive Map', href: '/map' },
                    { label: ar ? 'أحدث العروض' : 'Latest Offers', href: '/offers' },
                    { label: ar ? 'المفضلة' : 'Wishlist', href: '/wishlist' },
                    { label: ar ? 'المدونة' : 'Our Blog', href: '/blog' },
                    { label: ar ? 'عن المنصة' : 'About Us', href: '/about' }
                  ].map((link, i) => (
                    <Link 
                      key={i} 
                      href={link.href} 
                      className="text-white/60 hover:text-white font-semibold text-sm transition-colors flex items-center gap-2 group"
                    >
                      {link.label}
                      <ArrowRight className="w-3 h-3 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all rotate-180" />
                    </Link>
                  ))}
                </nav>
              </div>

              {/* For Business */}
              <div className="space-y-6">
                <h3 className="font-semibold text-xs text-white/40 flex items-center gap-2 justify-end">
                  {ar ? 'للأعمال' : 'For Business'}
                  <div className="w-1 h-1 bg-brand-purple rounded-full" />
                </h3>
                <nav className="flex flex-col gap-4 items-end">
                  {[
                    { label: ar ? 'سجل كتاجر' : 'Register as Merchant', href: `${siteConfig.businessUrl}/signup` },
                    { label: ar ? 'بناء موقعك' : 'Website Builder', href: `${siteConfig.businessUrl}/builder` },
                    { label: ar ? 'نظام الـ POS' : 'POS System', href: `${siteConfig.dashboardUrl}/login` },
                    { label: ar ? 'كن مندوب توصيل' : 'Be a Courier', href: '/courier' },
                    { label: ar ? 'حلول الشركات' : 'Enterprise Solutions', href: siteConfig.businessUrl }
                  ].map((link, i) => (
                    <Link 
                      key={i} 
                      href={link.href} 
                      className="text-white/60 hover:text-white font-semibold text-sm transition-colors flex items-center gap-2 group"
                    >
                      {link.label}
                      <ArrowRight className="w-3 h-3 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all rotate-180" />
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Support */}
              <div className="space-y-6">
                <h3 className="font-semibold text-xs text-white/40 flex items-center gap-2 justify-end">
                  {ar ? 'الدعم' : 'Support'}
                  <div className="w-1 h-1 bg-green-400 rounded-full" />
                </h3>
                <nav className="flex flex-col gap-4 items-end">
                  {[
                    { label: ar ? 'مركز المساعدة' : 'Help Center', href: '/support' },
                    { label: ar ? 'تواصل معنا' : 'Contact Us', href: '/contact' },
                    { label: ar ? 'سياسة الخصوصية' : 'Privacy Policy', href: '/privacy' },
                    { label: ar ? 'شروط الاستخدام' : 'Terms of Service', href: '/terms' },
                    { label: ar ? 'سياسة الاسترجاع' : 'Return Policy', href: '/return-policy' }
                  ].map((link, i) => (
                    <Link 
                      key={i} 
                      href={link.href} 
                      className="text-white/60 hover:text-white font-semibold text-sm transition-colors flex items-center gap-2 group"
                    >
                      {link.label}
                      <ArrowRight className="w-3 h-3 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all rotate-180" />
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Bottom Info Grid */}
            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="flex items-center gap-4 text-white/50 hover:text-brand-cyan transition-colors cursor-default group justify-end">
                 <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold">{ar ? 'راسلنا' : 'Email Us'}</span>
                    <span className="text-sm font-semibold text-white">mnmknk.eg@gmail.com</span>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-all">
                    <Mail className="w-5 h-5" />
                 </div>
               </div>

               <div className="flex items-center gap-4 text-white/50 hover:text-brand-cyan transition-colors cursor-default group justify-end">
                 <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold">{ar ? 'اتصل بنا' : 'Call Us'}</span>
                    <span className="text-sm font-semibold text-white">+20 106 746 1059</span>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-all">
                    <Phone className="w-5 h-5" />
                 </div>
               </div>

               <div className="flex items-center gap-4 text-white/50 hover:text-brand-cyan transition-colors cursor-default group justify-end">
                 <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold">{ar ? 'مقرنا' : 'Location'}</span>
                    <span className="text-sm font-semibold text-white">{ar ? 'القاهرة، مصر' : 'Cairo, Egypt'}</span>
                 </div>
                 <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-brand-cyan/10 transition-all">
                    <MapPin className="w-5 h-5" />
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-10 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 order-2 lg:order-1">
            <p className="text-white/30 text-xs font-semibold">
              © {new Date().getFullYear()} {ar ? siteConfig.nameArabic : siteConfig.name}. {ar ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/30 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                {ar ? 'معاملات آمنة' : 'Secure Payments'}
              </div>
              <div className="flex items-center gap-2 text-white/30 text-xs font-semibold">
                <Smartphone className="w-4 h-4 text-brand-cyan" />
                {ar ? 'متوفر على الأندرويد' : 'Available on Android'}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex items-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all order-1 lg:order-2">
            <CreditCard className="w-6 h-6" />
            <Wallet className="w-6 h-6" />
            <div className="h-4 w-px bg-white/20 mx-2" />
            <span className="text-xs font-semibold">Meeza</span>
            <span className="text-xs font-semibold">Valu</span>
          </div>

          <p className="text-white/30 text-xs font-semibold flex items-center gap-2 order-3">
            {ar ? 'صُنع بكل فخر في مصر' : 'Proudly Made in Egypt'}
            <span className="text-red-500">❤️</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
