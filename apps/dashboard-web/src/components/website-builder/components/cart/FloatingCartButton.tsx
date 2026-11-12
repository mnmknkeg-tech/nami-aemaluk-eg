import React from 'react';
import { useBuilder } from '../../context/BuilderContext';
import { CartIcon, isCartVisible } from '@ray-eg/shared/builder';

export interface FloatingCartButtonProps {
  contained?: boolean;
}

/**
 * FloatingCartButton – rendered inside the canvas preview or preview viewport as an overlay.
 * Visible when:
 *   • cart.businessType === 'orders'
 *   • cart.showCartIcon !== false
 *   • cart.position === 'floating' | 'both'
 */
export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ contained = false }) => {
  const { website, cartCount, setIsCartOpen } = useBuilder();
  const cartSettings = website.settings?.cart;

  if (!isCartVisible({ settings: cartSettings, placement: 'floating' })) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsCartOpen(true);
      }}
      title="سلة التسوق"
      className={`${
        contained
          ? 'absolute bottom-6 ltr:left-6 rtl:right-6 z-30 pointer-events-auto'
          : 'fixed bottom-24 ltr:left-4 rtl:right-4 z-[9990]'
      } flex items-center justify-center w-14 h-14 rounded-full shadow-2xl cursor-pointer transition-all duration-300 active:scale-95 hover:scale-105 group`}
      style={{
        backgroundColor: website.theme?.colors?.primary || '#2563eb',
        color: '#ffffff',
      }}
    >
      {/* Pulse ring animation */}
      {cartCount > 0 && (
        <span
          className="absolute inset-0 rounded-full opacity-40 animate-ping"
          style={{ backgroundColor: website.theme?.colors?.primary || '#2563eb' }}
        />
      )}

      <CartIcon iconType={cartSettings?.iconType} className="w-6 h-6 relative z-10" />

      {/* Item count badge */}
      {cartCount > 0 && (
        <span className="absolute -top-1 ltr:-right-1 rtl:-left-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md z-10">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </button>
  );
};
