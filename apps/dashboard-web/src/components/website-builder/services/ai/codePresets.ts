import { CodePreset } from './types';

export const CODE_PRESETS: CodePreset[] = [
  {
    id: 'interactive_3d_card',
    name: 'بطاقة ثلاثية الأبعاد متوهجة (3D Glow Card)',
    category: 'مكونات تفاعلية',
    description: 'بطاقة عصرية بتأثير دوران 3D عند تحريك المؤشر مع ظل نيون متوهج وشارة متحركة.',
    icon: 'Sparkles',
    html: `<div class="custom-3d-card-wrapper">
  <div class="custom-3d-card">
    <div class="card-badge">حصري 2026</div>
    <div class="card-icon">⚡</div>
    <h3 class="card-title">خدمة VIP فائقة السرعة</h3>
    <p class="card-desc">تجربة رقمية فريدة مصممة بأحدث تقنيات الويب مع استجابة فورية وتفاعل انسيابي.</p>
    <div class="card-stats">
      <div class="stat-item"><span class="stat-val">99.9%</span><span class="stat-lbl">دقة الأداء</span></div>
      <div class="stat-item"><span class="stat-val">&lt; 15ms</span><span class="stat-lbl">سرعة التنفيذ</span></div>
    </div>
    <button class="card-action-btn" onclick="alert('تم تفعيل الخدمة بنجاح!')">ابدأ الآن مجاناً &larr;</button>
  </div>
</div>`,
    css: `.custom-3d-card-wrapper {
  perspective: 1000px;
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}
.custom-3d-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 1.5rem;
  padding: 2rem;
  color: #ffffff;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.3);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
  position: relative;
  overflow: hidden;
}
.custom-3d-card:hover {
  transform: translateY(-8px) rotateX(4deg) rotateY(-4deg);
  box-shadow: 0 30px 60px -15px rgba(99, 102, 241, 0.5);
  border-color: rgba(165, 180, 252, 0.8);
}
.card-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(129, 140, 248, 0.4);
}
.card-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.card-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #f8fafc;
}
.card-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}
.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.5rem;
}
.stat-val {
  display: block;
  font-size: 1.125rem;
  font-weight: 800;
  color: #38bdf8;
  font-family: monospace;
}
.stat-lbl {
  font-size: 0.75rem;
  color: #64748b;
}
.card-action-btn {
  width: 100%;
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.card-action-btn:hover {
  opacity: 0.95;
  transform: scale(1.02);
}`,
    js: `// Interactive 3D tilt effect on mousemove
const card = document.querySelector('.custom-3d-card');
if (card) {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    card.style.transform = \`rotateY(\${x / 15}deg) rotateX(\${-y / 15}deg) translateY(-5px)\`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
  });
}`,
    tsxSnippet: `import React, { useState } from 'react';

export default function Custom3DGlowCard() {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="p-6 bg-slate-900 text-white rounded-3xl border border-indigo-500/30 shadow-2xl hover:scale-105 transition-all duration-300">
      <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full">حصري 2026</span>
      <h3 className="text-xl font-black mt-3 mb-1">خدمة VIP فائقة السرعة</h3>
      <p className="text-sm text-slate-400">تجربة رقمية فريدة مصممة بأحدث معايير الأداء.</p>
    </div>
  );
}`,
  },
  {
    id: 'live_animated_counter',
    name: 'عداد إحصائيات حي ونبض تفاعلي (Live Counter)',
    category: 'إحصائيات وبيانات',
    description: 'شريط إحصائيات متحرك مع مؤشر نبض مباشر وحساب تلقائي للزوار والطلبات الناجحة.',
    icon: 'Activity',
    html: `<div class="live-counter-bar">
  <div class="live-status-pill">
    <span class="live-indicator-dot"></span>
    <span>تحديث مباشر للبيانات</span>
  </div>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-number" id="counter-orders">+14,850</div>
      <div class="metric-label">طلب مكتمل بنجاح</div>
      <div class="metric-badge">+18% هذا الأسبوع</div>
    </div>
    <div class="metric-card">
      <div class="metric-number" id="counter-satisfaction">99.8%</div>
      <div class="metric-label">نسبة رضا العملاء</div>
      <div class="metric-badge">تقييم 5 نجوم ⭐</div>
    </div>
    <div class="metric-card">
      <div class="metric-number" id="counter-active">342</div>
      <div class="metric-label">عميل نشط الآن</div>
      <div class="metric-badge pulse">متصلين مباشرة</div>
    </div>
  </div>
</div>`,
    css: `.live-counter-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
}
.live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ecfdf5;
  color: #059669;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  margin-bottom: 1.25rem;
}
.live-indicator-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  animation: pulse-glow 1.5s infinite;
}
@keyframes pulse-glow {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}
.metric-card {
  border-right: 2px solid #f1f5f9;
  padding-right: 1rem;
}
.metric-card:last-child {
  border-right: none;
}
.metric-number {
  font-size: 1.75rem;
  font-weight: 900;
  color: #0f172a;
  font-family: monospace;
  letter-spacing: -0.05em;
}
.metric-label {
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 600;
  margin-top: 0.25rem;
}
.metric-badge {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #2563eb;
  background: #eff6ff;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
}`,
    js: `// Auto increment random live visitors
setInterval(() => {
  const activeEl = document.getElementById('counter-active');
  if (activeEl) {
    const current = parseInt(activeEl.innerText) || 340;
    const diff = Math.floor(Math.random() * 5) - 2;
    activeEl.innerText = Math.max(300, current + diff);
  }
}, 3000);`,
    tsxSnippet: `import React, { useState, useEffect } from 'react';

export default function LiveCounterWidget() {
  const [count, setCount] = useState(342);
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + (Math.random() > 0.5 ? 1 : -1)), 2500);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-2xl font-black font-mono text-blue-600">{count}</div>
        <div className="text-xs text-slate-500 font-semibold">عميل متصل الآن</div>
      </div>
      <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
    </div>
  );
}`,
  },
  {
    id: 'floating_whatsapp_vip',
    name: 'زر واتساب VIP العائم الذكي (Floating WhatsApp)',
    category: 'إجراءات وتحويلات',
    description: 'زر واتساب عائم ذكي مع قائمة خيارات سريعة (طلب تسعيرة، حجز موعد، دعم فني) ومحادثة مسبقة.',
    icon: 'MessageCircle',
    html: `<div class="whatsapp-vip-container">
  <div class="whatsapp-popup-card" id="wa-popup">
    <div class="wa-header">
      <div class="wa-avatar">👑</div>
      <div>
        <div class="wa-title">خدمة عملاء VIP 24/7</div>
        <div class="wa-status">متواجدون لخدمتك فوراً</div>
      </div>
      <button class="wa-close" onclick="document.getElementById('wa-popup').classList.toggle('active')">&times;</button>
    </div>
    <div class="wa-body">
      <p class="wa-msg">أهلاً بك! كيف يمكننا مساعدتك اليوم؟ اختر الإجراء السريع:</p>
      <div class="wa-quick-actions">
        <a href="https://wa.me/966500000000?text=طلب%20استشارة%20أو%20تسعير" target="_blank" class="wa-action-btn">🚗 طلب تسعير فوري</a>
        <a href="https://wa.me/966500000000?text=حجز%20موعد%20تجربة%20أو%20فحص" target="_blank" class="wa-action-btn">📅 حجز موعد VIP</a>
        <a href="https://wa.me/966500000000?text=محادثة%20مباشرة%20مع%20المستشار" target="_blank" class="wa-action-btn">💬 محادثة مباشرة</a>
      </div>
    </div>
  </div>
  <button class="whatsapp-floating-btn" onclick="document.getElementById('wa-popup').classList.toggle('active')">
    <span class="wa-icon">💬</span>
    <span class="wa-btn-text">تحدث مع مستشار VIP</span>
  </button>
</div>`,
    css: `.whatsapp-vip-container {
  position: relative;
  display: inline-block;
}
.whatsapp-floating-btn {
  background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 0.85rem 1.75rem;
  font-weight: 800;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  box-shadow: 0 10px 25px -5px rgba(37, 211, 102, 0.5);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.whatsapp-floating-btn:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 15px 30px -5px rgba(37, 211, 102, 0.7);
}
.wa-icon {
  font-size: 1.25rem;
}
.whatsapp-popup-card {
  display: none;
  position: absolute;
  bottom: calc(100% + 1rem);
  right: 0;
  width: 320px;
  background: #ffffff;
  border-radius: 1.25rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  z-index: 100;
  animation: slideUp 0.25s ease-out;
}
.whatsapp-popup-card.active {
  display: block;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.wa-header {
  background: #075e54;
  color: #ffffff;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
}
.wa-avatar {
  width: 36px;
  height: 36px;
  background: #128c7e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}
.wa-title {
  font-weight: 800;
  font-size: 0.875rem;
}
.wa-status {
  font-size: 0.6875rem;
  color: #a7f3d0;
}
.wa-close {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.8;
}
.wa-body {
  padding: 1rem;
  background: #f8fafc;
}
.wa-msg {
  font-size: 0.75rem;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}
.wa-quick-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.wa-action-btn {
  display: block;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 0.6rem 0.85rem;
  border-radius: 0.625rem;
  color: #0f172a;
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.2s;
}
.wa-action-btn:hover {
  background: #25d366;
  color: #ffffff;
  border-color: #25d366;
}`,
    js: `// Auto open popup after 5 seconds
setTimeout(() => {
  const popup = document.getElementById('wa-popup');
  if (popup && !popup.classList.contains('active')) {
    // popup.classList.add('active');
  }
}, 5000);`,
    tsxSnippet: `import React from 'react';

export default function FloatingWhatsAppButton() {
  return (
    <a
      href="https://wa.me/966500000000"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl hover:scale-105 transition-all"
    >
      <span>💬</span>
      <span>تواصل فوري عبر الواتساب</span>
    </a>
  );
}`,
  },
  {
    id: 'cyberpunk_neon_hero',
    name: 'بانر نيون مستقبلي متوهج (Cyberpunk Neon Banner)',
    category: 'لافتات وأقسام رئيسية',
    description: 'بانر بتأثيرات إضاءة نيون متحركة، تدرجات مستقبلية، وأزرار زجاجية تفاعلية.',
    icon: 'Zap',
    html: `<div class="neon-banner-wrapper">
  <div class="neon-glow-bg"></div>
  <div class="neon-content">
    <div class="neon-tag">🚀 الجيل القادم من المنصات الرقمية</div>
    <h1 class="neon-heading">صمم موقعك بالذكاء الاصطناعي <span class="neon-highlight">بسرعة الضوء</span></h1>
    <p class="neon-subtext">أحدث محرّك لتوليد واجهات الويب فائقة السرعة مع دعم كامل لكود Next.js وتأثيرات حركة مذهلة.</p>
    <div class="neon-cta-group">
      <button class="neon-btn-primary" onclick="alert('جاري إطلاق التجربة!')">ابدأ البناء الفوري ⚡</button>
      <button class="neon-btn-secondary" onclick="alert('فتح المعرض التفاعلي')">استكشف القوالب &larr;</button>
    </div>
  </div>
</div>`,
    css: `.neon-banner-wrapper {
  position: relative;
  background: #090a10;
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 2rem;
  padding: 3.5rem 2rem;
  text-align: center;
  overflow: hidden;
  box-shadow: 0 0 50px -10px rgba(168, 85, 247, 0.3);
}
.neon-glow-bg {
  position: absolute;
  top: -50%;
  left: 20%;
  width: 60%;
  height: 200%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.15) 50%, transparent 70%);
  filter: blur(50px);
  pointer-events: none;
  animation: rotateGlow 8s infinite alternate ease-in-out;
}
@keyframes rotateGlow {
  0% { transform: scale(0.9) rotate(0deg); }
  100% { transform: scale(1.1) rotate(15deg); }
}
.neon-content {
  position: relative;
  z-index: 2;
  max-width: 700px;
  margin: 0 auto;
}
.neon-tag {
  display: inline-block;
  background: rgba(236, 72, 153, 0.15);
  border: 1px solid rgba(236, 72, 153, 0.4);
  color: #f472b6;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.35rem 1rem;
  border-radius: 9999px;
  margin-bottom: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.neon-heading {
  font-size: 2.25rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.3;
  margin-bottom: 1rem;
}
.neon-highlight {
  background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.neon-subtext {
  font-size: 0.9375rem;
  color: #94a3b8;
  line-height: 1.7;
  margin-bottom: 2rem;
}
.neon-cta-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.neon-btn-primary {
  background: linear-gradient(90deg, #ec4899 0%, #a855f7 100%);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.875rem;
  padding: 0.85rem 2rem;
  border-radius: 0.85rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.5);
  transition: all 0.25s;
}
.neon-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -5px rgba(236, 72, 153, 0.7);
}
.neon-btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.85rem 1.75rem;
  border-radius: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.neon-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}`,
    js: `// Optional audio or micro pulse trigger
console.log('Neon Hero Initialized');`,
    tsxSnippet: `import React from 'react';

export default function CyberpunkBanner() {
  return (
    <div className="p-12 rounded-3xl bg-slate-950 text-white text-center border border-pink-500/30 shadow-2xl">
      <span className="text-pink-400 font-bold text-xs">🚀 تقنيات الجيل القادم</span>
      <h1 className="text-3xl font-black mt-3 mb-4">تصميم فوري مدعوم بالذكاء الاصطناعي</h1>
    </div>
  );
}`,
  },
  {
    id: 'interactive_discount_calculator',
    name: 'حاسبة أسعار فورية مع كود خصم (Price Calculator)',
    category: 'تجارة ومبيعات',
    description: 'أداة تفاعلية لحساب تكلفة الخدمات واختيار الباقات مع إدخال كود كوبون خصم مباشر.',
    icon: 'CreditCard',
    html: `<div class="calc-container">
  <div class="calc-header">
    <div class="calc-title">💡 حاسبة التكلفة التقديرية الفورية</div>
    <div class="calc-subtitle">اختر حجم مشروعك واحصل على خصم فوري</div>
  </div>
  <div class="calc-body">
    <div class="calc-row">
      <label class="calc-label">باقة الخدمة المطلوبة:</label>
      <select id="calc-plan" class="calc-select" onchange="window.updateCalc && window.updateCalc()">
        <option value="1500">باقة الانطلاق السريع (1,500 ج.م)</option>
        <option value="3500" selected>باقة الشركات المتقدمة (3,500 ج.م)</option>
        <option value="7500">باقة المؤسسات الشاملة VIP (7,500 ج.م)</option>
      </select>
    </div>
    <div class="calc-row">
      <label class="calc-label">كوبون الخصم (جرب: VIP2026):</label>
      <div class="coupon-group">
        <input type="text" id="calc-coupon" placeholder="أدخل الكوبون هنا..." class="calc-input" />
        <button class="coupon-apply-btn" onclick="window.applyCoupon && window.applyCoupon()">تطبيق</button>
      </div>
    </div>
    <div class="calc-summary">
      <div class="summary-line"><span>السعر الأساسي:</span><span id="calc-base-price">3,500 ج.م</span></div>
      <div class="summary-line text-emerald"><span id="calc-discount-label">الخصم المطبق:</span><span id="calc-discount-val">0 ج.م</span></div>
      <div class="summary-total"><span>الإجمالي النهائي:</span><span id="calc-total-price">3,500 ج.م</span></div>
    </div>
    <button class="calc-submit-btn" onclick="alert('تم حجز الباقة بالسعر المخفض!')">تأكيد الحجز الفوري &larr;</button>
  </div>
</div>`,
    css: `.calc-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 1.5rem;
  padding: 1.75rem;
  box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.08);
  max-width: 440px;
  margin: 0 auto;
}
.calc-header {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
}
.calc-title {
  font-size: 1.125rem;
  font-weight: 800;
  color: #0f172a;
}
.calc-subtitle {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
}
.calc-row {
  margin-bottom: 1rem;
}
.calc-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.35rem;
}
.calc-select, .calc-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  background: #f8fafc;
  color: #0f172a;
  outline: none;
}
.coupon-group {
  display: flex;
  gap: 0.5rem;
}
.coupon-apply-btn {
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 0 1.25rem;
  border-radius: 0.625rem;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}
.calc-summary {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  padding: 1rem;
  margin: 1.25rem 0;
  font-size: 0.8125rem;
}
.summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: #64748b;
}
.text-emerald {
  color: #059669;
  font-weight: 700;
}
.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 1.125rem;
  font-weight: 900;
  color: #0f172a;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}
.calc-submit-btn {
  width: 100%;
  background: #2563eb;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.875rem;
  padding: 0.85rem;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.calc-submit-btn:hover {
  background: #1d4ed8;
}`,
    js: `window.couponDiscount = 0;
window.updateCalc = function() {
  const select = document.getElementById('calc-plan');
  if (!select) return;
  const base = parseInt(select.value) || 3500;
  const discVal = base * window.couponDiscount;
  const total = base - discVal;
  
  document.getElementById('calc-base-price').innerText = base.toLocaleString() + ' ج.م';
  document.getElementById('calc-discount-val').innerText = '-' + discVal.toLocaleString() + ' ج.م';
  document.getElementById('calc-total-price').innerText = total.toLocaleString() + ' ج.م';
};

window.applyCoupon = function() {
  const code = (document.getElementById('calc-coupon')?.value || '').trim().toUpperCase();
  if (code === 'VIP2026' || code === 'DISCOUNT20' || code === 'المجد') {
    window.couponDiscount = 0.20;
    alert('🎉 تم تطبيق خصم 20% بنجاح!');
  } else if (code) {
    alert('عذراً، هذا الكوبون غير صالح. جرب: VIP2026');
  }
  window.updateCalc();
};`,
    tsxSnippet: `import React, { useState } from 'react';

export default function PricingCalculator() {
  const [plan, setPlan] = useState(3500);
  const [discount, setDiscount] = useState(0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-md mx-auto">
      <h3 className="font-bold text-lg mb-4">حاسبة الأسعار التفاعلية</h3>
      <div className="flex justify-between font-mono font-bold text-xl text-blue-600">
        <span>الإجمالي:</span>
        <span>{(plan - discount).toLocaleString()} ج.م</span>
      </div>
    </div>
  );
}`,
  },
];
