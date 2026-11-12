'use client';

import React, { useState, useEffect } from 'react';
import { Shield, BarChart3, Megaphone, Check, ExternalLink } from 'lucide-react';

const CONSENT_KEY = 'ray_consents';

// البانر متوقف بالكامل مؤقتًا لحين استكمال كافة الإجراءات والسياسات القانونية للمنصة.
// لتفعيله لاحقًا عند الجاهزية القانونية: ضع NEXT_PUBLIC_CONSENT_BANNER=true
const consentBannerEnabled = process.env.NEXT_PUBLIC_CONSENT_BANNER === 'true';

type ConsentType = 'essential' | 'analytics' | 'marketing';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const defaultConsents: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
};

function readConsents(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function writeConsentsToStorage(consents: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consents));
}

async function sendConsentToBackend(consents: ConsentState) {
  try {
    const types: string[] = [];
    if (consents.essential) types.push('essential');
    if (consents.analytics) types.push('analytics');
    if (consents.marketing) types.push('marketing');
    await fetch('/api/v1/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ types }),
    });
  } catch {
    // silently fail - consent is stored locally regardless
  }
}

const consentOptions: {
  key: ConsentType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}[] = [
  {
    key: 'essential',
    label: 'كوكيز ضرورية',
    description: 'لازم لتشغيل الموقع ولا يمكن تعطيلها',
    icon: Shield,
    disabled: true,
  },
  {
    key: 'analytics',
    label: 'كوكيز تحليلية',
    description: 'تساعدنا في فهم كيف تستخدم الموقع',
    icon: BarChart3,
  },
  {
    key: 'marketing',
    label: 'كوكيز تسويقية',
    description: 'تُستخدم لعرض إعلانات ذات صلة بك',
    icon: Megaphone,
  },
];

export default function ConsentBanner() {
  // لا بد من استدعاء الـ hooks بشكل غير مشروط قبل أي early return،
  // وإلا خالفنا قاعدة react-hooks/rules-of-hooks.
  const [visible, setVisible] = useState(false);
  const [consents, setConsents] = useState<ConsentState>(defaultConsents);

  useEffect(() => {
    if (!consentBannerEnabled) return;
    const stored = readConsents();
    if (!stored) {
      setVisible(true);
    } else {
      setConsents(stored);
    }
  }, []);

  if (!consentBannerEnabled) return null;

  const toggle = (key: ConsentType) => {
    if (key === 'essential') return;
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const acceptAll = () => {
    const all: ConsentState = { essential: true, analytics: true, marketing: true };
    writeConsentsToStorage(all);
    sendConsentToBackend(all);
    setVisible(false);
  };

  const savePreferences = () => {
    writeConsentsToStorage(consents);
    sendConsentToBackend(consents);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-[9999] flex justify-center pointer-events-none"
      dir="rtl"
    >
      <div className="pointer-events-auto w-full max-w-2xl rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="px-5 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#00E5FF] shrink-0 mt-0.5" />
              <p className="text-white text-[13px] sm:text-sm font-semibold leading-relaxed">
                نستخدم الكوكيز لتحسين تجربتك وفقًا لقانون حماية البيانات الشخصية (151/2020). يمكنك
                اختيار أنواع الكوكيز التي تسمح بها.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {consentOptions.map((opt) => {
                const Icon = opt.icon;
                const checked = consents[opt.key];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggle(opt.key)}
                    disabled={opt.disabled}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-right
                    ${
                      checked
                        ? 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }
                    ${opt.disabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'}
                  `}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                    ${checked ? 'bg-[#00E5FF] border-[#00E5FF]' : 'border-slate-500'}
                  `}
                    >
                      {checked && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="text-xs text-slate-400">{opt.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={acceptAll}
                className="w-full sm:w-auto px-6 py-3 bg-[#00E5FF] text-black font-black rounded-xl hover:scale-105 transition-all shadow-lg"
              >
                قبول الكل
              </button>
              <button
                type="button"
                onClick={savePreferences}
                className="w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 border border-white/20 transition-all"
              >
                حفظ التفضيلات
              </button>
              <a
                href="/privacy"
                className="text-[#00E5FF] text-sm font-semibold hover:underline flex items-center gap-1"
              >
                سياسة الخصوصية
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
