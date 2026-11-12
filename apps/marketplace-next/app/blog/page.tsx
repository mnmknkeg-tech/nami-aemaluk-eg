import { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Store,
  PackageCheck,
  Zap,
  BarChart3,
  Smartphone,
  Shield,
  ArrowLeft,
  Search,
  Sparkles,
  User,
  Tag,
} from 'lucide-react';
import { siteConfig } from '@/lib/config';
import { serializeJsonLd } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'المدونة - نصائح وأخبار التجارة الذكية',
  description:
    'مقالات حصرية ونصائح احترافية حول التجارة الإلكترونية، إدارة الأعمال، والتحول الرقمي في مصر - من مكانك',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'المدونة - من مكانك',
    description: 'مقالات ونصائح حول التجارة الإلكترونية وإدارة الأعمال',
    url: '/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'المدونة - من مكانك',
    description: 'مقالات ونصائح حول التجارة الإلكترونية وإدارة الأعمال',
  },
};

const blogPosts = [
  {
    id: 1,
    slug: 'start-your-online-store',
    title: 'دليلك الشامل لبدء متجرك الإلكتروني في 2025',
    excerpt:
      'تعرف على الخطوات الأساسية لبناء علامة تجارية قوية والبدء في البيع عبر الإنترنت بأقل التكاليف.',
    author: 'فريق من مكانك',
    date: '15 يناير 2025',
    readTime: '5 دقائق',
    category: 'تجارة إلكترونية',
    icon: Store,
    catColor: 'bg-brand-cyan/10 text-cyan-600',
  },
  {
    id: 2,
    slug: 'inventory-management-secrets',
    title: '5 أسرار لإدارة المخزون باحترافية وتجنب الخسائر',
    excerpt: 'كيف توازن بين العرض والطلب وتضمن عدم نفاد المنتجات الأكثر مبيعاً في متجرك.',
    author: 'أحمد علي',
    date: '20 يناير 2025',
    readTime: '7 دقائق',
    category: 'إدارة الأعمال',
    icon: PackageCheck,
    catColor: 'bg-brand-purple/10 text-purple-600',
  },
  {
    id: 3,
    slug: 'why-you-need-all-in-one-platform',
    title: 'لماذا تعتبر المنصات المتكاملة مستقبل التجارة المحلية؟',
    excerpt:
      'فوائد دمج نقاط البيع (POS) مع المتجر الإلكتروني وأدوات الذكاء الاصطناعي في منصة واحدة.',
    author: 'فريق من مكانك',
    date: '25 يناير 2025',
    readTime: '4 دقائق',
    category: 'تكنولوجيا',
    icon: Zap,
    catColor: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 4,
    slug: 'digital-marketing-for-merchants',
    title: 'كيف تزيد مبيعاتك عبر التسويق بالذكاء الاصطناعي؟',
    excerpt: 'استراتيجيات حديثة لاستهداف العملاء بدقة وزيادة معدل التحويل في متجرك الإلكتروني.',
    author: 'سارة محمود',
    date: '1 فبراير 2025',
    readTime: '6 دقائق',
    category: 'تسويق رقمي',
    icon: BarChart3,
    catColor: 'bg-amber-50 text-amber-700',
  },
  {
    id: 5,
    slug: 'mobile-first-store-design',
    title: 'لماذا يجب أن تصمم متجرك لمستخدمي الموبايل أولاً؟',
    excerpt:
      'أكثر من 80% من المتسوقين في مصر يستخدمون هواتفهم. تأكد من أن متجرك يوفر لهم تجربة مثالية.',
    author: 'فريق من مكانك',
    date: '5 فبراير 2025',
    readTime: '5 دقائق',
    category: 'تصميم',
    icon: Smartphone,
    catColor: 'bg-blue-50 text-blue-700',
  },
  {
    id: 6,
    slug: 'secure-your-store-data',
    title: 'طرق تأمين بيانات عملائك وحماية متجرك من الاختراق',
    excerpt: 'نصائح أمنية هامة لكل تاجر للحفاظ على سرية المعلومات وبناء ثقة دائمة مع العملاء.',
    author: 'خبير تقني',
    date: '10 فبراير 2025',
    readTime: '8 دقائق',
    category: 'أمان',
    icon: Shield,
    catColor: 'bg-rose-50 text-rose-700',
  },
];

export default function BlogPage() {
  const blogLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'مدونة من مكانك',
    url: `${siteConfig.url}/blog`,
    description: 'مقالات ونصائح حول التجارة الإلكترونية وإدارة الأعمال',
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <div className="bg-white dark:bg-brand-black min-h-screen text-right">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogLd) }}
      />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-white/5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-cyan/20 via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-brand-cyan/10 text-brand-cyan rounded-full font-black text-xs uppercase tracking-widest mb-8">
            <Sparkles className="w-4 h-4" />
            أفكار وحلول ذكية
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
            مدونة <span className="text-gradient">من مكانك</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            بوابتك المعرفية لكل ما يخص التجارة الإلكترونية، التسويق الرقمي، وتقنيات المستقبل في
            السوق المصري.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Content */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {blogPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col"
                >
                  <div className="p-8 space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-4 py-1.5 rounded-xl text-xs font-black ${post.catColor}`}
                      >
                        {post.category}
                      </span>
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-brand-cyan transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="mt-auto pt-8 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                          {post.author}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{post.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-16 flex justify-center">
              <button className="px-10 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl font-black hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                تحميل المزيد من المقالات
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-10">
            {/* Search Widget */}
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-6">
              <h3 className="text-xl font-black">ابحث في المدونة</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="كلمات مفتاحية..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl py-4 pr-12 pl-4 outline-none focus:border-brand-cyan transition-all font-bold text-sm"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* Categories Widget */}
            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-6">
              <h3 className="text-xl font-black">التصنيفات</h3>
              <div className="space-y-2">
                {['تجارة إلكترونية', 'تسويق رقمي', 'إدارة أعمال', 'تكنولوجيا', 'قصص نجاح'].map(
                  (cat, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                    >
                      <span className="text-slate-400 text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">
                        12
                      </span>
                      <div className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-300 group-hover:text-brand-cyan">
                        {cat}
                        <Tag className="w-4 h-4 opacity-30" />
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Newsletter Widget */}
            <div className="p-8 bg-brand-gradient rounded-[2.5rem] text-white space-y-6 shadow-2xl shadow-brand-cyan/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black">اشترك في النشرة البريدية</h3>
              <p className="text-white/80 text-sm font-bold leading-relaxed">
                كن أول من يتلقى أحدث المقالات والنصائح الحصرية مباشرة في بريدك.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="بريدك الإلكتروني"
                  className="w-full bg-white/20 border border-white/30 rounded-xl py-4 px-5 outline-none placeholder:text-white/50 font-bold text-sm"
                />
                <button className="w-full py-4 bg-white text-brand-black rounded-xl font-black text-sm hover:bg-brand-black hover:text-white transition-all">
                  اشترك الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-24 bg-brand-black text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center space-y-10 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            ابدأ رحلتك <br /> <span className="text-gradient">نحو النجاح</span> اليوم
          </h2>
          <p className="text-white/50 font-bold text-lg md:text-xl leading-relaxed">
            لا تكتفِ بالقراءة فقط، حول المعرفة إلى واقع وابدأ مشروعك الخاص مع "من مكانك".
          </p>
          <div className="flex justify-center">
            <a
              href={`${siteConfig.businessUrl}/signup`}
              className="px-12 py-5 bg-brand-gradient text-white rounded-2xl font-black text-lg hover:shadow-glow-cyan transition-all"
            >
              ابدأ متجرك الآن
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
