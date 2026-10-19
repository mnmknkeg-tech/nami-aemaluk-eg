'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Heart, Percent, Plane, ShoppingCart, Sparkles } from 'lucide-react';
import { HIDE_UNPUBLISHED } from '@/lib/moduleConfig';

const IMG = {
  cart: '/images/new/shopping-cart.webp',
  features: '/images/new/feature-icons.webp',
  services: '/images/new/service-icons.webp',
  store: '/images/new/store-island.webp',
  logo: '/images/new/logo-business.webp',
};

type GrowthFeature = {
  title: string;
  description: string;
  position: string;
  /** Market-launch switch: local-only capabilities are hidden in production. */
  localOnly?: boolean;
};

const  features: GrowthFeature[] = [
  { title: "تجربة أفضل على الموبايل", description: "إدارة أعمالك من أي مكان وفي أي وقت", position: "feature-1" },
  { title: "نظام يتكون حسب نشاطك", description: "اختر الأدوات التي تناسب نشاطك فقط", position: "feature-2" },
  { title: "مصمم موقع أكثر مرونة", description: "صمم متجرك وموقعك بدون خبرة تقنية", position: "feature-3" },
  { title: "لوحة تحكم أسهل", description: "كل بياناتك في مكان واحد وبطريقة أبسط", position: "feature-4" },
  { title: "مساعد الذكاء الاصطناعي", description: "أفكار ذكية تساعدك على التطوير والنمو", position: "feature-5", localOnly: true },
  { title: "إدارة الموظفين", description: "متابعة الحضور والصلاحيات بسهولة", position: "feature-6", localOnly: true },
  { title: "إدارة الشحن والتوصيل", description: "متابعة دقيقة لطلباتك من الباب للباب", position: "feature-7" },
  { title: "طرق دفع متعددة", description: "راحة عملائك وثقتهم أولويتنا", position: "feature-8" },
];

// Market-launch switch: AI + HR are local-only, so their cards are stripped
// from the production landing page.
const visibleFeatures = HIDE_UNPUBLISHED
  ? features.filter((item) => !item.localOnly)
  : features;

const services = [
  { title: "تغطية جميع محافظات مصر", description: "مع شبكة واسعة من المندوبين", position: "service-1" },
  { title: "الدفع الإلكتروني المتكامل", description: "بكل سهولة وأمان", position: "service-2" },
  { title: "التكامل مع شركات الشحن", description: "في جميع أنحاء مصر", position: "service-3" },
  { title: "مندوبين خاصين", description: "لخدمة أسرع وأوسع", position: "service-4" },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function Cloud({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`cloud ${className}`}><i /><i /><i /></span>;
}

function Brand() {
  return (
    <div className="brand" aria-label="نمي أعمالك">
      <img src={IMG.logo} width={160} height={160} alt="شعار نمي أعمالك" decoding="async" />
      <strong>نمي أعمالك</strong>
    </div>
  );
}

function FloatingTile({ type, className }: { type: "cart" | "heart" | "percent"; className: string }) {
  const Icon = type === "cart" ? ShoppingCart : type === "heart" ? Heart : Percent;
  return <motion.span aria-hidden="true" className={`floating-tile ${className}`} animate={{ y: [0, -10, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}><Icon /></motion.span>;
}

function Navbar() {
  return (
    <nav className="navbar" aria-label="الترويسة">
      <Brand />
      <div className="update-pill"><Sparkles size={16} /> تحديثات جديدة</div>
    </nav>
  );
}

function Hero() {
  const reduced = useReducedMotion();
  return (
    <header className="hero">
      <Navbar />
      <Cloud className="cloud-top" />
      <motion.div className="paper-plane plane-top" animate={reduced ? {} : { y: [0, -10, 0], x: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity }}><Plane /></motion.div>
      <div className="hero-grid">
        <motion.div className="hero-copy" initial="hidden" animate="visible" variants={reveal} transition={{ duration: .7 }}>
          <motion.div className="new-sticker" initial={{ opacity: 0, scale: .8, rotate: -5 }} animate={{ opacity: 1, scale: 1, rotate: -4 }}><span>جديد</span> من</motion.div>
          <h1>نمي أعمالك</h1>
          <p>تجربة أفضل .. إمكانيات أوسع ..<br />لأنك تستحق الأفضل</p>
        </motion.div>
        <motion.div className="hero-art" animate={reduced ? {} : { y: [0, -13, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}>
          <img src={IMG.cart} width={1024} height={1024} alt="عربة تسوق ممتلئة بالمنتجات والطرود" fetchPriority="high" decoding="async" />
          <FloatingTile type="cart" className="tile-a" />
          <FloatingTile type="cart" className="tile-b" />
          <FloatingTile type="heart" className="tile-c" />
          <FloatingTile type="percent" className="tile-d" />
        </motion.div>
      </div>
    </header>
  );
}

function SectionHeading({ children, description }: { children: ReactNode; description?: string }) {
  return <div className="section-heading"><h2><span>‹</span>{children}<span>›</span></h2>{description && <p>{description}</p>}</div>;
}

function FeatureCard({ item, index }: { item: (typeof features)[number]; index: number }) {
  return (
    <motion.article className="feature-card" variants={reveal} transition={{ duration: .45, delay: (index % 4) * .08 }}>
      <div className={`sprite feature-sprite ${item.position}`}><img src={IMG.features} loading="lazy" decoding="async" width={1536} height={1024} alt="" /></div>
      <h3>{item.title}</h3><p>{item.description}</p>
    </motion.article>
  );
}

function FeaturesSection() {
  return (
    <section className="features-band" aria-labelledby="features-title">
      <SectionHeading><span id="features-title">مميزات جديدة .. لتجربة أسهل وأقوى</span></SectionHeading>
      <motion.div className="features-grid" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .18 }}>
        {visibleFeatures.map((item, index) => <FeatureCard key={item.title} item={item} index={index} />)}
      </motion.div>
    </section>
  );
}

function ComingSoonSection() {
  return (
    <section className="coming-section" aria-labelledby="soon-title">
      <SectionHeading description="نجهز لك تحديثات جديدة لتجربة متكاملة"><span id="soon-title">قريباً .. المزيد من المميزات</span></SectionHeading>
      <div className="route-line" aria-hidden="true"><span /><span /><span /><span /></div>
      <motion.div className="services-grid" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .22 }}>
        {services.map((item, index) => (
          <motion.article className="service-card" key={item.title} variants={reveal} transition={{ delay: index * .1 }} whileHover={{ y: -6 }}>
            <div className={`sprite service-sprite ${item.position}`}><img src={IMG.services} loading="lazy" decoding="async" width={1536} height={512} alt="" /></div>
            <h3>{item.title}</h3><p>{item.description}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

function BottomCTA() {
  const reduced = useReducedMotion();
  return (
    <section className="bottom-cta" aria-label="نمي أعمالك">
      <Cloud className="cloud-bottom-right" /><Cloud className="cloud-bottom-left" />
      <motion.div className="cta-store" animate={reduced ? {} : { y: [0, -10, 0] }} transition={{ duration: 4.5, repeat: Infinity }}>
        <img src={IMG.store} loading="lazy" decoding="async" width={1024} height={1024} alt="متجر إلكتروني على جزيرة خضراء عائمة" />
      </motion.div>
      <div className="cta-copy"><h2>نمي أعمالك ..</h2><p>كل ما تحتاجه في مكان واحد</p><svg viewBox="0 0 80 46" aria-hidden="true"><path d="M74 6C56 35 31 39 7 23M7 23l8-3M7 23l3 8" /></svg></div>
      <motion.div className="paper-plane plane-bottom" animate={reduced ? {} : { x: [0, 10, 0], y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}><Plane /></motion.div>
    </section>
  );
}

export function GrowthPage() {
  return <main className="growth-page"><Hero /><FeaturesSection /><ComingSoonSection /><BottomCTA /></main>;
}
