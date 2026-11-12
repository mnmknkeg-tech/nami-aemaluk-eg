import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/lib/config';
import { serializeJsonLd } from '@/lib/jsonld';

const posts: Record<string, { title: string; content: string; date: string; readTime: string }> = {
  'start-your-online-store': {
    title: 'ابدأ متجرك الإلكتروني',
    date: '15 يناير 2025',
    readTime: '5 دقائق',
    content: 'بدء متجر إلكتروني خطوة مهمة...',
  },
  'inventory-management-secrets': {
    title: 'أسرار إدارة المخزون',
    date: '20 يناير 2025',
    readTime: '7 دقائق',
    content: 'إدارة المخزون بكفاءة...',
  },
  'why-you-need-all-in-one-platform': {
    title: 'لماذا تحتاج منصة متكاملة؟',
    date: '25 يناير 2025',
    readTime: '4 دقائق',
    content: 'فوائد المنصة المتكاملة...',
  },
  'digital-marketing-for-merchants': {
    title: 'التسويق الرقمي للتجار',
    date: '1 فبراير 2025',
    readTime: '6 دقائق',
    content: 'استراتيجيات التسويق...',
  },
  'mobile-first-store-design': {
    title: 'تصميم المتجر للموبايل أولاً',
    date: '5 فبراير 2025',
    readTime: '5 دقائق',
    content: 'أهمية التصميم المتجاوب...',
  },
  'secure-your-store-data': {
    title: 'حماية بيانات متجرك',
    date: '10 فبراير 2025',
    readTime: '8 دقائق',
    content: 'نصائح لحماية البيانات...',
  },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  const title = post?.title || 'مقال غير موجود';
  const description = post?.content || 'مقال من مدونة من مكانك';
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${slug}`,
      type: 'article',
      publishedTime: post?.date,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) notFound();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.date,
    author: { '@type': 'Organization', name: siteConfig.name },
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    mainEntityOfPage: `${siteConfig.url}/blog/${slug}`,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleLd) }}
      />
      <Link
        href="/blog"
        className="flex items-center gap-2 text-brand-cyan font-black text-sm mb-8 hover:gap-3 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        العودة للمدونة
      </Link>
      <div className="flex items-center gap-3 mb-4 text-xs font-bold text-slate-400">
        <span>{post.date}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {post.readTime}
        </span>
      </div>
      <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-8">{post.title}</h1>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-slate-600 dark:text-slate-400 font-bold leading-relaxed text-lg">
          {post.content}
        </p>
      </div>
    </div>
  );
}
