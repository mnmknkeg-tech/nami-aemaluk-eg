import React from 'react';
import { BaseRendererProps } from './types';
import { Star, MessageCircle } from 'lucide-react';

export const UtilityRenderers: React.FC<BaseRendererProps> = (props) => {
  const {
    node,
    website,
    outlineClass,
    getComputedStyles,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
    renderChildren,
    isInteractivePreview,
    handleInteraction,
  } = props;
  const themeColors = website.theme?.colors;
  const isMobile = props.currentViewport === 'mobile';

  switch (node.type) {
    // ── Testimonials ──────────────────────────────────────────────────────────
    case 'testimonials': {
      const items: any[] = node.props.items || [
        {
          name: 'أحمد محمد',
          role: 'عميل مميز',
          text: 'خدمة ممتازة وتوصيل سريع، أنصح الجميع بالتعامل معهم!',
          rating: 5,
        },
        {
          name: 'فاطمة علي',
          role: 'عميلة دائمة',
          text: 'منتجات أصلية وجودة عالية، سعيدة جداً بتجربتي.',
          rating: 5,
        },
        {
          name: 'محمود حسن',
          role: 'عميل جديد',
          text: 'سهولة الطلب والدفع عند الاستلام خلاني ما أتردد.',
          rating: 4,
        },
      ];
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-8 sm:py-12 px-3 sm:px-6 ${outlineClass}`}
        >
          <div className="max-w-6xl mx-auto text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 break-words">
              {node.props.title || 'آراء عملائنا'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8 break-words">
              {node.props.subtitle || 'ماذا قالوا عنّا'}
            </p>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'} gap-4 sm:gap-5`}>
              {items.map((t: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating || 5 }).map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 break-words">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(t.name || '؟')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Gallery ────────────────────────────────────────────────────────────────
    case 'gallery': {
      const images: any[] = node.props.images || [
        { src: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400', caption: '' },
        { src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', caption: '' },
        { src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', caption: '' },
        { src: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', caption: '' },
      ];
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-6 sm:py-10 px-3 sm:px-6 ${outlineClass}`}
        >
          <div className="max-w-6xl mx-auto text-right">
            {node.props.title && (
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4 sm:mb-6 break-words">{node.props.title}</h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {images.map((img: any, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={img.src || img}
                    alt={img.caption || `صورة ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Team ───────────────────────────────────────────────────────────────────
    case 'team': {
      const members: any[] = node.props.members || [
        { name: 'محمد أحمد', role: 'المدير التنفيذي', image: '' },
        { name: 'سارة علي', role: 'مدير المبيعات', image: '' },
        { name: 'خالد حسن', role: 'مدير العمليات', image: '' },
      ];
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-8 sm:py-12 px-3 sm:px-6 ${outlineClass}`}
        >
          <div className="max-w-5xl mx-auto text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 break-words">
              {node.props.title || 'فريقنا'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8 break-words">
              {node.props.subtitle || 'نخبة من الخبراء في خدمتك'}
            </p>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'} gap-4 sm:gap-6`}>
              {members.map((m: any, i: number) => (
                <div
                  key={i}
                  className="text-center bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                    {m.name[0]}
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">{m.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{m.role}</p>
                </div>
              ))}
            </div>
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Stats ──────────────────────────────────────────────────────────────────
    case 'stats': {
      const statsList: any[] = node.props.stats || [
        { value: '+١٠,٠٠٠', label: 'عميل سعيد' },
        { value: '٩٩٪', label: 'نسبة الرضا' },
        { value: '٢٤/٧', label: 'دعم فني متواصل' },
        { value: '+٥ سنوات', label: 'خبرة في السوق' },
      ];
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-8 sm:py-12 px-3 sm:px-6 bg-slate-900 text-white ${outlineClass}`}
        >
          <div className={`max-w-5xl mx-auto grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4 sm:gap-6 text-center`}>
            {statsList.map((st: any, i: number) => (
              <div key={i} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-blue-400">
                  {st.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-400">{st.label}</div>
              </div>
            ))}
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Services Grid ──────────────────────────────────────────────────────────
    case 'services-grid':
    case 'services': {
      const items: any[] = node.props.items || [
        { title: 'خدمة ١', description: 'وصف مختصر للخدمة الأولى وما تقدمه من قيمة.', icon: '✨' },
        { title: 'خدمة ٢', description: 'وصف مختصر للخدمة الثانية وما تقدمه من قيمة.', icon: '🚀' },
        { title: 'خدمة ٣', description: 'وصف مختصر للخدمة الثالثة وما تقدمه من قيمة.', icon: '💎' },
      ];
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-8 sm:py-12 px-3 sm:px-6 ${outlineClass}`}
        >
          <div className="max-w-5xl mx-auto text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 break-words">
              {node.props.title || 'خدماتنا'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8 break-words">
              {node.props.subtitle || 'نقدم لك أفضل الخدمات'}
            </p>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'} gap-4 sm:gap-5`}>
              {items.map((s: any, i: number) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-2xl sm:text-3xl mb-3">{s.icon || '⚡'}</div>
                  <h3 className="font-bold text-slate-800 mb-2 break-words">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed break-words">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Spacer ─────────────────────────────────────────────────────────────────
    case 'spacer': {
      const h = node.props.height || 60;
      return (
        <div
          id={node.id}
          style={{ height: h, ...getComputedStyles() }}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all w-full relative ${outlineClass}`}
        >
          {!isInteractivePreview && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                مسافة {h}px
              </span>
            </div>
          )}
        </div>
      );
    }

    // ── Divider ────────────────────────────────────────────────────────────────
    case 'divider': {
      const style = node.props.style || 'solid';
      const color = node.props.color || '#e2e8f0';
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all px-4 py-3 ${outlineClass}`}
        >
          <hr
            style={{
              borderStyle: style,
              borderColor: color,
              borderTopWidth: node.props.thickness || 1,
            }}
            className="w-full"
          />
        </div>
      );
    }

    // ── Trust Badges ───────────────────────────────────────────────────────────
    case 'trust-badges':
    case 'trust_badges': {
      const badges = node.props.badges || [
        { icon: '🚚', label: 'توصيل سريع' },
        { icon: '💰', label: 'دفع عند الاستلام' },
        { icon: '🔄', label: 'إرجاع مجاني' },
        { icon: '🔒', label: 'تسوق آمن' },
        { icon: '⭐', label: 'جودة مضمونة' },
      ];
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-4 sm:py-6 px-3 sm:px-4 bg-slate-50 border-y border-slate-100 ${outlineClass}`}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-8">
              {badges.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-slate-700">
                  <span className="text-lg sm:text-xl">{b.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold break-words">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Before / After ─────────────────────────────────────────────────────────
    case 'before-after':
    case 'before_after': {
      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-8 sm:py-12 px-3 sm:px-6 ${outlineClass}`}
        >
          <div className="max-w-4xl mx-auto text-right">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 break-words">
              {node.props.title || 'قبل وبعد'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8 break-words">
              {node.props.subtitle || 'شاهد الفرق بنفسك'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative overflow-hidden rounded-2xl border-2 border-red-200 bg-red-50">
                {node.props.beforeImage ? (
                  <img
                    src={node.props.beforeImage}
                    alt="قبل"
                    className="w-full h-40 sm:h-48 object-cover"
                  />
                ) : (
                  <div className="h-40 sm:h-48 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-red-400 text-4xl">
                    📷
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  قبل
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl border-2 border-green-200 bg-green-50">
                {node.props.afterImage ? (
                  <img src={node.props.afterImage} alt="بعد" className="w-full h-40 sm:h-48 object-cover" />
                ) : (
                  <div className="h-40 sm:h-48 bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-green-400 text-4xl">
                    ✨
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  بعد
                </div>
              </div>
            </div>
          </div>
          {renderChildren()}
        </section>
      );
    }

    // ── Promo Banner / Announcement Bar ───────────────────────────────────────
    case 'promo-banner':
    case 'promo_banner':
    case 'announcement-bar':
    case 'announcement_bar': {
      const bgColor = node.props.bgColor || themeColors?.primary || '#1d4ed8';
      const textColor = node.props.textColor || '#ffffff';
      return (
        <div
          id={node.id}
          style={{ backgroundColor: bgColor, color: textColor, ...getComputedStyles() }}
          onClick={(event) =>
            isInteractivePreview
              ? handleInteraction(
                  event,
                  node.props.link || node.props.url,
                  node.props.pageId,
                  node.props.text
                )
              : handleClick(event)
          }
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all py-2.5 px-3 sm:px-6 text-center ${outlineClass}`}
        >
          <p className="text-xs sm:text-sm font-semibold break-words">
            {node.props.text || '🎉 عرض خاص — خصم ١٠٪ على أول طلب! استخدم الكود: WELCOME10'}
          </p>
          {renderChildren()}
        </div>
      );
    }

    // ── WhatsApp Float ─────────────────────────────────────────────────────────
    case 'whatsapp-float':
    case 'whatsapp_button': {
      const whatsappNumber = String(
        node.props.phone || node.props.whatsapp || '201000000000'
      ).replace(/[^0-9]/g, '');
      const whatsappMessage = encodeURIComponent(
        node.props.message || `مرحباً، أود الاستفسار عن ${website.name || 'الخدمات'}`
      );
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all ${outlineClass}`}
        >
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-2 bg-[#25D366] text-white rounded-full px-4 py-2 shadow-lg w-fit hover:brightness-95 active:scale-95 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-bold">{node.props.label || 'تواصل عبر واتساب'}</span>
          </a>
          <p className="text-[10px] text-slate-400 mt-1 text-right">
            (سيظهر عائماً في الزاوية على الموقع المنشور)
          </p>
          {renderChildren()}
        </div>
      );
    }

    // ── Mobile Footer ──────────────────────────────────────────────────────────
    case 'mobile_footer': {
      const buttons: string[] = Array.isArray(node.props.buttons)
        ? node.props.buttons
        : ['home', 'products', 'cart', 'whatsapp'];
      const labels: Record<string, string> = {
        home: 'الرئيسية',
        products: 'المنتجات',
        cart: 'السلة',
        whatsapp: 'واتساب',
        phone: 'اتصال',
      };
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all ${outlineClass}`}
        >
          <div
            className="flex items-stretch justify-around rounded-xl overflow-hidden border border-white/10"
            style={{ backgroundColor: node.props.bgColor || '#0f172a' }}
          >
            {buttons.map((key) => (
              <div
                key={key}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 ${
                  key === 'whatsapp' ? 'text-emerald-400' : 'text-white/80'
                }`}
              >
                <span className="w-5 h-5 rounded bg-white/15" />
                <span className="text-[9px] font-bold">{labels[key] || key}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-right">
            (سيظهر ثابتاً أسفل الشاشة على الموبايل فقط في الموقع المنشور — زر السلة يفتح السلة
            الموحدة)
          </p>
          {renderChildren()}
        </div>
      );
    }

    default:
      return null;
  }
};
