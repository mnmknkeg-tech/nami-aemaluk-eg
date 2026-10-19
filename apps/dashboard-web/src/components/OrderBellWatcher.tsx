'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ShoppingBag, Store, Volume2, VolumeX, X } from 'lucide-react';
import { useOrderBell, type OrderBellEvent } from '@/hooks/useOrderBell';
import { ringPosOrder, ringWebsiteOrder, primeAudio } from '@/lib/order-sounds';
import { apiRequest } from '@/lib/auth';
import { loadPosSettings } from '@/lib/posSettings';

/**
 * Mounted once in the dashboard layout. Watches for NEW_ORDER notifications
 * and rings the matching bell:
 *   1) طلب من الموقع (website)  → رنة الموقع
 *   2) طلب من نقطة البيع/الكاشير (pos) → رنة نقطة البيع
 *
 * Merchant-level preferences (رنة/بانر) come from POS cashier settings
 * (`notifications.sound` / `notifications.banner`) — layered on top of the
 * user-level mute toggle below.
 */
export default function OrderBellWatcher() {
  const [event, setEvent] = useState<OrderBellEvent | null>(null);
  const soundOnRef = React.useRef(true);
  // merchant settings — defaults: both enabled (fetch failure → defaults).
  // State (not refs) so toggle updates always re-render reliably.
  const [merchantSound, setMerchantSound] = useState(true);
  const [merchantBanner, setMerchantBanner] = useState(true);
  const { soundOn } = useOrderBell(
    useCallback((evt: OrderBellEvent) => {
      setEvent(evt);
      if (soundOnRef.current && merchantSoundRef.current) {
        if (evt.source === 'pos') ringPosOrder();
        else ringWebsiteOrder();
      }
    }, [])
  );
  const merchantSoundRef = React.useRef(true);
  merchantSoundRef.current = merchantSound;
  soundOnRef.current = soundOn;

  // Load merchant POS settings once + follow live updates from the settings page
  useEffect(() => {
    let cancelled = false;
    const applySettings = (rawShop: any) => {
      const settings = loadPosSettings(rawShop?.data ?? rawShop);
      setMerchantSound(settings.notifications?.sound !== false);
      setMerchantBanner(settings.notifications?.banner !== false);
    };
    apiRequest('/shops/me')
      .then((shop: any) => {
        if (cancelled) return;
        applySettings(shop);
      })
      .catch(() => {}); // fetch failure → keep defaults (both enabled)
    const onSettingsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      applySettings({ layoutConfig: { posSettings: detail?.posSettings } });
    };
    window.addEventListener('pos-settings-changed', onSettingsChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('pos-settings-changed', onSettingsChanged);
    };
  }, []);

  useEffect(() => {
    const unlock = () => primeAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // auto-hide banner after 8s
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 8000);
    return () => clearTimeout(t);
  }, [event]);

  const isPos = event?.source === 'pos';
  // merchant setting: hide the banner entirely when disabled (user mute still applies)
  const showBanner = merchantBanner;

  return (
    <AnimatePresence>
      {event && showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.95 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
            isPos ? 'border-amber-300' : 'border-[#00E5FF]/40'
          }`}
        >
          <div className={`flex items-center gap-3 p-4 ${isPos ? 'bg-amber-50' : 'bg-cyan-50'}`}>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 animate-bounce ${
                isPos ? 'bg-amber-500' : 'bg-slate-900'
              }`}
            >
              {isPos ? (
                <Store size={22} className="text-white" />
              ) : (
                <ShoppingBag size={22} className="text-[#00E5FF]" />
              )}
            </div>
            <div className="flex-1 text-right">
              <div className="font-black text-slate-900 text-sm">{event.title}</div>
              <div className="text-xs text-slate-600 mt-0.5">{event.body}</div>
            </div>
            <button
              onClick={() => setEvent(null)}
              className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
          <div className={`h-1 ${isPos ? 'bg-amber-400' : 'bg-[#00E5FF]'}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SoundToggleIcon({ on, onToggle, size = 18 }: { on: boolean; onToggle: () => void; size?: number }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
      title={on ? 'إيقاف صوت الرنة' : 'تشغيل صوت الرنة'}
    >
      {on ? <Volume2 size={size} className="text-[#00E5FF]" /> : <VolumeX size={size} className="text-slate-400" />}
      <span>{on ? 'الصوت مفعّل' : 'الصوت مغلق'}</span>
      <Bell size={size} className="text-slate-400" />
    </button>
  );
}
