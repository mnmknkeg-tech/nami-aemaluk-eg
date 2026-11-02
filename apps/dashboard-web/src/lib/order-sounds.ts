'use client';

/**
 * رنات الإشعارات:
 *  - رنة طلب الموقع   → ملف public/sounds/order-website.mp3
 *  - رنة طلب الكاشير  → نغمة جرس مولّدة WebAudio (من غير ملفات — صفر تأخير، تشتغل أوفلاين)
 */

const WEBSITE_SOUND_FILE = '/sounds/order-website.mp3';

// كاش لمكتب الصوت عشان نفس الملف يتشغّل من غير إعادة تحميل
let websiteAudio: HTMLAudioElement | null = null;

// آخر AudioContext اشتغل — بنعيد استخدامه عشان القفل يفضل شغال للجلسة كلها
let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioContextClass();
    if (sharedAudioCtx.state === 'suspended') {
      const p = sharedAudioCtx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playWebsiteFile() {
  if (typeof window === 'undefined') return;
  try {
    if (!websiteAudio) {
      websiteAudio = new Audio(WEBSITE_SOUND_FILE);
      websiteAudio.volume = 0.9;
      websiteAudio.preload = 'auto';
    }
    websiteAudio.currentTime = 0;
    const p = websiteAudio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    // تجاهل — مفيش fallback صوتي
  }
}

/** رنة طلب جديد من الموقع — public/sounds/order-website.mp3 */
export function ringWebsiteOrder() {
  playWebsiteFile();
}

/**
 * رنة طلب جديد من نقطة البيع / الكاشير — جرس بسيط بنغمتين (E6 → A6)
 * مولّدة WebAudio: بدون ملف صوتي، بدون تأخير تحميل، وتشتغل أوفلاين.
 */
export function ringPosOrder() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
    const t0 = ctx.currentTime + 0.01;
    // نغمتين سريعتين متتاليتين — E6 (1318.5Hz) بعدين A6 (1760Hz)
    const notes: Array<{ freq: number; start: number; dur: number }> = [
      { freq: 1318.51, start: 0, dur: 0.16 },
      { freq: 1760.0, start: 0.12, dur: 0.28 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // partial خفيف (triangle أعلى أوكتاف) عشان طابع الجرس بدل الصافرة
      osc.frequency.setValueAtTime(n.freq, t0 + n.start);
      gain.gain.setValueAtTime(0.0001, t0 + n.start);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + n.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + n.start);
      osc.stop(t0 + n.start + n.dur + 0.02);
    }
    // partial واحد أعلى أوكتاف مع النغمة التانية لمعة الجرس
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(3520.0, t0 + 0.12);
    shimmerGain.gain.setValueAtTime(0.0001, t0 + 0.12);
    shimmerGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.13);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(t0 + 0.12);
    shimmer.stop(t0 + 0.42);
  } catch {
    // تجاهل — الصوت مش حرج
  }
}

/**
 * فتح قفل الصوت بعد أول تفاعل من المستخدم (سياسة المتصفحات):
 *  - AudioContext صامت يتفعّل (عشان الرنة المولّدة تشتغل من غير إعادة تحميل)
 *  - ملف رنة الموقع يتشغّل بصمت مرة واحدة
 */
export function primeAudio() {
  if (typeof window === 'undefined') return;
  // unlock WebAudio
  try {
    const ctx = getAudioCtx();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
      if (ctx.state === 'suspended') {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    }
  } catch {}
  // unlock the website mp3
  try {
    const a = new Audio(WEBSITE_SOUND_FILE);
    a.muted = true;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {}
}
