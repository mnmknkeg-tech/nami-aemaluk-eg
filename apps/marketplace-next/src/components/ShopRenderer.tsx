'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Menu,
  X,
  Search,
  ShoppingBag,
  Home,
  Info,
  Image as ImageIcon,
  Users,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Twitter,
  Facebook,
  MessageCircle,
  Share2,
} from 'lucide-react';
import type { Shop, Product } from '@/lib/services';
import { ProductCard } from '@/components/ProductCard';
import { BuilderTreeRenderer } from '@/components/BuilderTreeRenderer';

/**
 * ShopRenderer — public-facing shop page.
 *
 * If the shop has a `builderConfig.website` component tree (set by the
 * dashboard builder), we delegate entirely to BuilderTreeRenderer so the
 * live site is IDENTICAL to the builder preview.
 *
 * Legacy shops that only have `pageDesign` / flat `builderConfig` fields
 * continue to use the LegacyShopView template below.
 */

interface ShopRendererProps {
  shop: Shop;
  products: Product[];
}

type Config = Record<string, any>;

function getConfig(shop: Shop): Config {
  return (shop.builderConfig as Config) || (shop.pageDesign as Config) || {};
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function ShopRenderer({ shop, products }: ShopRendererProps) {
  const config = getConfig(shop);

  // If the shop was designed with the builder, use the tree renderer
  if (config.website?.components && config.website?.pages?.length) {
    return <BuilderTreeRenderer website={config.website} shop={shop} products={products} />;
  }

  // Legacy fallback
  return <LegacyShopView shop={shop} products={products} config={config} />;
}

// ─── LegacyShopView ───────────────────────────────────────────────────────────

function getColors(config: Config) {
  const c = config.colors || {};
  return {
    primary: c.primary || config.primaryColor || '#00E5FF',
    secondary: c.secondary || config.secondaryColor || '#BD00FF',
    background: c.background || config.pageBackgroundColor || '#FFFFFF',
    surface: c.surface || '#F8FAFC',
    text: c.text?.primary || config.headerTextColor || '#0F172A',
    textMuted: c.text?.secondary || '#64748B',
  };
}

function LegacyShopView({
  shop,
  products,
  config,
}: {
  shop: Shop;
  products: Product[];
  config: Config;
}) {
  const colors = useMemo(() => getColors(config), [config]);
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'gallery' | 'info'>('home');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/shop/${shop.slug}`;
    const data = { title: shop.name || 'المتجر', text: shop.bio || 'زور المتجر على من مكانك', url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const elementsVisibility: Record<string, boolean> = config.elementsVisibility || {};
  const isVisible = (key: string, fallback = true) =>
    elementsVisibility[key] !== undefined ? elementsVisibility[key] : fallback;

  const headerBg = config.headerBackgroundColor || '#FFFFFF';
  const headerText = config.headerTextColor || '#0F172A';
  const headerTransparent = config.headerTransparent ?? false;
  const headerOpacity = config.headerOpacity ?? 60;

  const footerBg = config.footerBackgroundColor || '#FFFFFF';
  const footerText = config.footerTextColor || '#0F172A';
  const footerTransparent = config.footerTransparent ?? false;
  const footerOpacity = config.footerOpacity ?? 90;

  const bannerHeight =
    config.bannerSize === 'large' ? '450px' : config.bannerSize === 'medium' ? '350px' : '250px';

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const buttonStyle: React.CSSProperties = {
    backgroundColor: colors.primary,
    color: '#0F172A',
    borderRadius: config.buttonShape || '1rem',
    padding: config.buttonPadding || '0.75rem 1.5rem',
    fontWeight: 800,
  };

  return (
    <div
      className="pb-16 md:pb-0"
      style={{
        backgroundColor: colors.background,
        fontFamily: config.typography?.fontFamily?.body || 'Cairo, Inter, sans-serif',
        direction: 'rtl',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: headerBg,
          color: headerText,
          opacity: headerTransparent ? headerOpacity / 100 : 1,
        }}
        className="sticky top-0 z-50 shadow-sm"
      >
        <div className={`${config.pagePadding || 'p-4 md:p-6'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {shop.logo && (
              <Image
                src={shop.logo}
                alt={shop.name || 'متجر'}
                width={40}
                height={40}
                className="rounded-full border-2 border-white/20 object-cover"
              />
            )}
            <div>
              <h1 className={`font-bold ${config.headingSize || 'text-lg'}`}>
                {shop.name || config.homePageName || 'المتجر'}
              </h1>
              {isVisible('shopFollowersCount', true) && (
                <p className="text-xs opacity-70 font-bold">{shop.followerCount || 0} متابع</p>
              )}
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {isVisible('headerNavHome', true) && (
              <button
                onClick={() => setActiveTab('home')}
                className={`text-sm font-bold transition-all ${activeTab === 'home' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <Home size={16} className="inline ml-1" /> الرئيسية
              </button>
            )}
            {isVisible('headerNavProducts', true) && (
              <button
                onClick={() => setActiveTab('products')}
                className={`text-sm font-bold transition-all ${activeTab === 'products' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <ShoppingBag size={16} className="inline ml-1" /> المنتجات
              </button>
            )}
            {isVisible('headerNavGallery', true) && (
              <button
                onClick={() => setActiveTab('gallery')}
                className={`text-sm font-bold transition-all ${activeTab === 'gallery' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <ImageIcon size={16} className="inline ml-1" /> المعرض
              </button>
            )}
            {isVisible('headerNavInfo', true) && (
              <button
                onClick={() => setActiveTab('info')}
                className={`text-sm font-bold transition-all ${activeTab === 'info' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <Info size={16} className="inline ml-1" /> معلومات
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isVisible('headerSearch', true) && (
              <div className="relative hidden md:block">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 pl-4 py-2 rounded-xl bg-black/5 border border-black/10 text-sm w-40 focus:w-60 transition-all"
                  style={{ color: headerText }}
                />
              </div>
            )}
            {isVisible('headerShareButton', true) && (
              <button
                onClick={handleShare}
                aria-label="مشاركة المتجر"
                title={shareCopied ? 'تم نسخ رابط المتجر' : 'مشاركة المتجر'}
                className={`p-2 hover:bg-black/5 rounded-lg transition-all relative ${shareCopied ? 'text-green-600' : ''}`}
              >
                <Share2 size={18} />
                {shareCopied && (
                  <span className="absolute -bottom-1 right-1/2 translate-x-1/2 translate-y-full whitespace-nowrap text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                    تم نسخ الرابط
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
              className="md:hidden p-2 hover:bg-black/5 rounded-lg transition-all"
            >
              {isHeaderMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {isHeaderMenuOpen && (
          <div className="md:hidden border-t border-black/10 p-4">
            <nav className="flex flex-col gap-4">
              {(['home', 'products', 'gallery', 'info'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setIsHeaderMenuOpen(false);
                  }}
                  className={`text-sm font-bold text-right p-2 rounded-lg transition-all ${activeTab === tab ? 'bg-black/5' : ''}`}
                >
                  {tab === 'home' && (
                    <>
                      <Home size={16} className="inline ml-2" /> الرئيسية
                    </>
                  )}
                  {tab === 'products' && (
                    <>
                      <ShoppingBag size={16} className="inline ml-2" /> المنتجات
                    </>
                  )}
                  {tab === 'gallery' && (
                    <>
                      <ImageIcon size={16} className="inline ml-2" /> المعرض
                    </>
                  )}
                  {tab === 'info' && (
                    <>
                      <Info size={16} className="inline ml-2" /> معلومات
                    </>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Banner */}
      {config.bannerUrl && isVisible('profileBanner', true) && (
        <div className="relative w-full" style={{ height: bannerHeight }}>
          <Image
            src={config.bannerUrl}
            alt="Banner"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: `${config.bannerPosX || 50}% ${config.bannerPosY || 50}%` }}
          />
          {config.bannerTitle && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center text-white">
                <h1 className={`font-black ${config.headingSize || 'text-2xl'} mb-2`}>
                  {config.bannerTitle}
                </h1>
                {config.bannerSubtitle && <p className="font-bold">{config.bannerSubtitle}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className={`${config.pagePadding || 'p-6 md:p-12'}`}>
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {(config.homeRightAdTitle || config.homeLeftAdTitle) && (
              <div className="overflow-hidden bg-white/40 backdrop-blur-sm border border-slate-100 rounded-2xl py-3">
                <div className="flex gap-12 whitespace-nowrap flex-row-reverse px-4">
                  {config.homeRightAdTitle && (
                    <span className="text-xs font-black flex items-center gap-1.5">
                      🚚 {config.homeRightAdTitle}
                    </span>
                  )}
                  {config.homeLeftAdTitle && (
                    <span className="text-xs font-black flex items-center gap-1.5">
                      🔥 {config.homeLeftAdTitle}
                    </span>
                  )}
                  {config.homeStoryText && (
                    <span className="text-xs font-black flex items-center gap-1.5">
                      ⭐ {config.homeStoryText}
                    </span>
                  )}
                </div>
              </div>
            )}

            {config.homeIntroText && (
              <div className="bg-white/90 backdrop-blur-sm border border-slate-100 rounded-2xl p-6 md:p-8">
                <h3 className="text-lg md:text-2xl font-black mb-4">من نحن</h3>
                <p className="text-sm text-slate-500 font-bold leading-relaxed">
                  {config.homeIntroText}
                </p>
              </div>
            )}

            {filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            <div className="text-center">
              <button
                style={buttonStyle}
                onClick={() => setActiveTab('products')}
                className="hover:opacity-90 transition-opacity"
              >
                عرض جميع المنتجات
              </button>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
            ) : (
              <p className="col-span-full text-center text-slate-400 py-12">لا توجد منتجات</p>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice(0, 8).map((p) =>
              p.images?.[0] ? (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="aspect-square rounded-2xl overflow-hidden relative group"
                >
                  <Image
                    src={p.images[0]}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </Link>
              ) : null
            )}
            {products.length === 0 && (
              <p className="col-span-full text-center text-slate-400 py-12">لا توجد صور</p>
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-lg mb-4">تواصل معنا</h3>
              <div className="space-y-4">
                {shop.phone && (
                  <a
                    href={`tel:${shop.phone}`}
                    className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                  >
                    <Phone size={18} style={{ color: colors.primary }} />
                    <span className="font-bold text-sm">{shop.phone}</span>
                  </a>
                )}
                {shop.email && (
                  <a
                    href={`mailto:${shop.email}`}
                    className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                  >
                    <Mail size={18} style={{ color: colors.primary }} />
                    <span className="font-bold text-sm">{shop.email}</span>
                  </a>
                )}
                <div className="flex items-center gap-3">
                  <MapPin size={18} style={{ color: colors.primary }} />
                  <span className="font-bold text-sm">
                    {shop.city || ''}
                    {shop.district ? ` - ${shop.district}` : ''}
                    {shop.address ? `، ${shop.address}` : ''}
                  </span>
                </div>
                {shop.bio && (
                  <p className="text-sm text-slate-500 font-bold leading-relaxed pt-2">
                    {shop.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {isVisible('footer', true) && (
        <footer
          style={{
            backgroundColor: footerBg,
            color: footerText,
            opacity: footerTransparent ? footerOpacity / 100 : 1,
          }}
          className="border-t border-black/10"
        >
          <div className={`${config.pagePadding || 'p-6 md:p-12'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center md:text-right space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {shop.logo && (
                    <Image
                      src={shop.logo}
                      alt={shop.name || 'متجر'}
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white/20"
                    />
                  )}
                  <h4 className="font-black">{shop.name || 'المتجر'}</h4>
                </div>
                <p className="opacity-70 text-sm leading-relaxed font-bold">
                  {shop.bio || 'أفضل المنتجات بجودة عالية'}
                </p>
                {isVisible('shopFollowersCount', true) && (
                  <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                    <div className="bg-black/5 p-2 rounded-xl">
                      <Users size={16} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-50 font-black">المتابعين</p>
                      <p className="text-sm font-black">{shop.followerCount || 0}</p>
                    </div>
                  </div>
                )}
              </div>

              {isVisible('footerQuickLinks', true) && (
                <div className="text-center md:text-right space-y-4">
                  <h5 className="font-black">روابط سريعة</h5>
                  <ul className="space-y-2 font-bold opacity-70 text-sm">
                    <li>
                      <button
                        onClick={() => setActiveTab('home')}
                        className="hover:opacity-100 transition-opacity"
                      >
                        الرئيسية
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="hover:opacity-100 transition-opacity"
                      >
                        المنتجات
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab('gallery')}
                        className="hover:opacity-100 transition-opacity"
                      >
                        المعرض
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setActiveTab('info')}
                        className="hover:opacity-100 transition-opacity"
                      >
                        اتصل بنا
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {isVisible('footerSocialLinks', true) && shop.socialLinks && (
                <div className="text-center md:text-right space-y-4">
                  <h5 className="font-black">تواصل اجتماعي</h5>
                  <div className="flex justify-center md:justify-start gap-3">
                    {shop.socialLinks.instagram && (
                      <a
                        href={shop.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/5 p-2 rounded-xl hover:bg-black/10 transition-all"
                      >
                        <Instagram size={18} />
                      </a>
                    )}
                    {shop.socialLinks.twitter && (
                      <a
                        href={shop.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/5 p-2 rounded-xl hover:bg-black/10 transition-all"
                      >
                        <Twitter size={18} />
                      </a>
                    )}
                    {shop.socialLinks.facebook && (
                      <a
                        href={shop.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/5 p-2 rounded-xl hover:bg-black/10 transition-all"
                      >
                        <Facebook size={18} />
                      </a>
                    )}
                    {shop.whatsapp && (
                      <a
                        href={`https://wa.me/${shop.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-black/5 p-2 rounded-xl hover:bg-black/10 transition-all"
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-black/10 text-center text-xs opacity-50 font-bold">
              © {new Date().getFullYear()} {shop.name || 'المتجر'} — جميع الحقوق محفوظة
            </div>
          </div>
        </footer>
      )}

      {/* Mobile App-like Sticky Bottom Bar */}
      <nav
        aria-label="التنقل السريع للهاتف"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1.5 shadow-xl flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'home' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home size={18} />
          <span>الرئيسية</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('products');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'products' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingBag size={18} />
          <span>المنتجات ({products.length})</span>
        </button>

        {shop.whatsapp ? (
          <a
            href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-all"
          >
            <MessageCircle size={18} />
            <span>واتساب</span>
          </a>
        ) : shop.phone ? (
          <a
            href={`tel:${shop.phone}`}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-all"
          >
            <Phone size={18} />
            <span>اتصال</span>
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setActiveTab('info');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'info' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Info size={18} />
          <span>عن المتجر</span>
        </button>
      </nav>
    </div>
  );
}
