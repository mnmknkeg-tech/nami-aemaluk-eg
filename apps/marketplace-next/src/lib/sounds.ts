const audioCache: Record<string, HTMLAudioElement> = {};
const checkedSrcs = new Set<string>();

export function playSound(src: string, volume = 0.5) {
  if (typeof window === 'undefined') return;
  if (checkedSrcs.has(src)) return;
  try {
    let audio = audioCache[src];
    if (!audio) {
      audio = new Audio(src);
      audioCache[src] = audio;
      audio.addEventListener('error', () => {
        checkedSrcs.add(src);
        delete audioCache[src];
      });
    }
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

/**
 * صوت ممتع وفوري للإضافة إلى السلة باستخدام Web Audio API (Chime/Success Bubble)
 * يعمل تلقائياً وبكفاءة في كل المتصفحات بدون الحاجة لتحميل ملف خارجي
 */
export function playCartSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // النغمة الأولى (نغمة ترحيبية قصيرة)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.25);

      // النغمة الثانية (صوت Chime مرح وفوري يتبع النغمة الأولى)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.22); // D6

      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.35);

      // رنه ختامية (جرسة قصيرة عالية) — تخلص الإحساس بالجرس
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.18); // G6
      gain3.gain.setValueAtTime(0.12, ctx.currentTime + 0.18);
      gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(ctx.currentTime + 0.18);
      osc3.stop(ctx.currentTime + 0.5);

      return;
    }
  } catch {
    // Fallback إلى ملف الصوت القديم إذا لم يدعم المتصفح الـ AudioContext
  }

  playSound('/sounds/add-to-cart.mp3', 0.5);
}

export function playOrderNotifSound() {
  playSound('/sounds/order-notif.mp3', 0.7);
}
