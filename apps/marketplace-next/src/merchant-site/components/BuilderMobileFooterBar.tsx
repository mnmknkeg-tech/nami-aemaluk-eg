import React from 'react';
import { Home, LayoutGrid, MessageCircle, Phone } from 'lucide-react';
import {
  CartIcon,
  isCartVisible,
  type WebsiteCartSettings,
} from '@ray-eg/shared/builder';

type MobileFooterNode = {
  id: string;
  props: Record<string, any>;
};

export function MobileFooterBar({
  node,
  cartSettings,
  totalItems,
  shop,
  onOpenCart,
}: {
  node: MobileFooterNode;
  cartSettings?: WebsiteCartSettings;
  totalItems: number;
  shop?: { phone?: string; whatsapp?: string };
  onOpenCart: () => void;
}) {
  const showCart = isCartVisible({ settings: cartSettings, placement: 'floating' });
  const rawButtons: string[] = Array.isArray(node.props.buttons)
    ? node.props.buttons
    : ['home', 'products', 'cart', 'whatsapp'];
  const barBg = node.props.bgColor || '#0f172a';

  const scrollToProducts = () => {
    const el =
      document.querySelector('[data-section="products"]') || document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderBtn = (key: string) => {
    switch (key) {
      case 'home':
        return (
          <button
            key={key}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold">الرئيسية</span>
          </button>
        );
      case 'products':
        return (
          <button
            key={key}
            type="button"
            onClick={scrollToProducts}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[9px] font-bold">المنتجات</span>
          </button>
        );
      case 'cart':
        if (!showCart) return null;
        return (
          <button
            key={key}
            type="button"
            onClick={onOpenCart}
            className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
          >
            <CartIcon iconType={cartSettings?.iconType} className="w-5 h-5" />
            <span className="text-[9px] font-bold">السلة</span>
            {totalItems > 0 && (
              <span className="absolute top-0 left-1/2 ltr:translate-x-2 rtl:-translate-x-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        );
      case 'whatsapp': {
        const wa = node.props.whatsapp || shop?.whatsapp || node.props.phone || shop?.phone;
        if (!wa) return null;
        return (
          <a
            key={key}
            href={`https://wa.me/${String(wa).replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[9px] font-bold">واتساب</span>
          </a>
        );
      }
      case 'phone': {
        const phone = node.props.phone || shop?.phone;
        if (!phone) return null;
        return (
          <a
            key={key}
            href={`tel:${phone}`}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
          >
            <Phone className="w-5 h-5" />
            <span className="text-[9px] font-bold">اتصال</span>
          </a>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      id={node.id}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-md"
      style={{ backgroundColor: barBg }}
    >
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {rawButtons.map(renderBtn)}
      </div>
    </div>
  );
}
