'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    setCartOpen,
    updateQuantity,
    removeItem,
    totalItems,
    totalPrice,
    itemsByShop,
  } = useCart();

  const shopGroups = itemsByShop();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            /* Must sit above MobileFooter (z-[100]), otherwise the bottom bar
               floats over the drawer and hides the total + "إتمام الطلب". */
            className="fixed top-0 left-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 z-[115] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-cyan" />
                <h2 className="text-lg font-bold">
                  السلة {totalItems > 0 && <span className="text-brand-cyan">({totalItems})</span>}
                </h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <ShoppingBag className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 font-bold text-lg">سلتك فارغة</p>
                  <p className="text-slate-400 text-sm mt-1">أضف منتجات لتبدأ التسوق</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-6 px-6 py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm"
                  >
                    تصفح المتاجر
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(shopGroups).map(([shopId, shopItems]) => (
                    <div key={shopId}>
                      {/* Shop header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Link
                          href={`/shop/${shopItems[0].shopSlug}`}
                          onClick={() => setCartOpen(false)}
                          className="text-sm font-bold text-brand-purple hover:underline"
                        >
                          {shopItems[0].shopName}
                        </Link>
                        <span className="text-xs font-bold text-slate-400">
                          {formatPrice(shopItems.reduce((s, i) => s + i.price * i.quantity, 0))}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-3">
                        {shopItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3"
                          >
                            {/* Image */}
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                                {item.name}
                              </h4>
                              <p className="text-brand-cyan font-bold text-sm mt-1">
                                {formatPrice(item.price)}
                              </p>

                              {/* Quantity controls */}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-bold text-sm w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeItem(item.productId)}
                                  className="mr-auto w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">الإجمالي</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setCartOpen(false)}
                  className="w-full py-4 bg-brand-gradient text-white rounded-xl font-bold text-center flex items-center justify-center gap-2 hover:shadow-glow-cyan transition-all"
                >
                  إتمام الطلب
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
