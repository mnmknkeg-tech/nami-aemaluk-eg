import { Metadata } from 'next';
import {
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Facebook,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Headset,
} from 'lucide-react';
import ContactForm from './ContactForm';
import { siteConfig } from '@/lib/config';
import { serializeJsonLd } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'تواصل معنا',
  description: 'تواصل مع فريق من مكانك - نحن هنا لمساعدتك في أي استفسار بخصوص منصتنا',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'تواصل معنا - من مكانك',
    description: 'تواصل مع فريق من مكانك',
    url: '/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'تواصل معنا - من مكانك',
    description: 'تواصل مع فريق من مكانك',
  },
};

export default function ContactPage() {
  const contactLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'تواصل معنا - من مكانك',
    url: `${siteConfig.url}/contact`,
    email: 'mnmknk.eg@gmail.com',
    telephone: '+201067461059',
    contactType: 'customer service',
    areaServed: 'EG',
  };

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(contactLd) }}
      />

      {/* Header Section */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-slate-50 dark:bg-slate-950/50 text-right">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-purple/20 via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="w-20 h-20 bg-brand-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-purple/20">
            <Headset className="w-10 h-10 text-brand-purple" />
          </div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            نحن هنا <span className="text-gradient">لمساعدتك</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-semibold max-w-2xl mx-auto leading-relaxed">
            سواء كنت تاجراً يبحث عن تطوير عمله أو عميلاً لديه استفسار، فريقنا مستعد دائماً للرد
            عليك.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          {/* Contact Info Column */}
          <div className="lg:col-span-5 space-y-12 order-2 lg:order-1 text-right">
            <div className="space-y-8">
              <h2 className="text-3xl font-bold tracking-tight">معلومات التواصل</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                لا تتردد في الاتصال بنا عبر أي من القنوات التالية، وسنقوم بالرد عليك في غضون 24
                ساعة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
              {[
                {
                  icon: Mail,
                  title: 'البريد الإلكتروني',
                  value: 'mnmknk.eg@gmail.com',
                  color: 'bg-blue-50 text-blue-600',
                },
                {
                  icon: Phone,
                  title: 'الهاتف',
                  value: '01067461059',
                  color: 'bg-green-50 text-green-600',
                },
                {
                  icon: Clock,
                  title: 'ساعات العمل',
                  value: 'الأحد - الخميس (9ص - 6م)',
                  color: 'bg-amber-50 text-amber-600',
                },
                {
                  icon: MapPin,
                  title: 'الموقع',
                  value: 'القاهرة، مصر',
                  color: 'bg-red-50 text-red-600',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-6 justify-end"
                >
                  <div className="text-right">
                    <h3 className="font-semibold text-sm text-slate-500 mb-1">{item.title}</h3>
                    <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                      {item.value}
                    </p>
                  </div>
                  <div
                    className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center ${item.color}`}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 space-y-6">
              <h3 className="font-bold text-xl tracking-tight">تابعنا على المنصات الاجتماعية</h3>
              <div className="flex gap-4 justify-end">
                {[
                  { icon: Facebook, href: 'https://facebook.com/mnmknk' },
                  { icon: Globe, href: '#' },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-900 dark:text-white hover:bg-brand-black hover:text-white dark:hover:bg-brand-cyan dark:hover:text-brand-black transition-all"
                  >
                    <social.icon className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 relative order-1 lg:order-2">
            <div className="sticky top-24">
              <div className="absolute -inset-4 bg-brand-gradient opacity-5 blur-3xl rounded-2xl pointer-events-none" />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden">
                <div className="p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-8 justify-end">
                    <h2 className="text-2xl font-bold">أرسل لنا رسالة</h2>
                    <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse" />
                  </div>
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map or Bottom Section */}
      <section className="py-20 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/30 text-center">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <Globe className="w-16 h-16 text-brand-cyan mx-auto mb-6 opacity-20" />
          <h2 className="text-3xl font-bold mb-4">نحن نخدم جميع أنحاء الجمهورية</h2>
          <p className="text-slate-500 font-semibold text-lg leading-relaxed">
            مركزنا الرئيسي في القاهرة، ولكن خدماتنا تغطي جميع المحافظات المصرية لتمكين التجار في كل
            مكان.
          </p>
        </div>
      </section>
    </div>
  );
}
