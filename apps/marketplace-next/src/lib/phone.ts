/**
 * أدوات رقم الموبايل المصري — نفس قواعد السيرفر بالحرف (gobackend
 * internal/domains/auth/phone.go). كل أرقام الحسابات بتتخزن وتتبعت
 * بصيغة E.164 بكود الدولة دايماً: +20XXXXXXXXXX.
 */

/** تحويل الأرقام العربية (٠-٩ / ۰-۹) لأرقام لاتينية. */
function toLatinDigits(s: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const eastern = '۰۱۲۳۴۵۶۷۸۹';
  let out = '';
  for (const ch of s) {
    if (/[0-9]/.test(ch)) out += ch;
    else if (arabic.includes(ch)) out += String(arabic.indexOf(ch));
    else if (eastern.includes(ch)) out += String(eastern.indexOf(ch));
  }
  return out;
}

/**
 * تطبيع رقم موبايل مصري لأي صيغة مدخلة ("01012345678"، "+20 10 1234 5678"،
 * "00201012345678"، أرقام عربية…) إلى "+201012345678". يرجع null لو الرقم
 * مش موبايل مصري صحيح (شبكات 10/11/12/15 فقط).
 */
export function normalizeEgyptianPhone(raw: string): string | null {
  let digits = toLatinDigits(raw).replace(/[^0-9]/g, '');
  digits = digits.replace(/^\+/, '').replace(/^00/, '');
  digits = digits.replace(/^20/, '');
  digits = digits.replace(/^0/, '');
  if (!digits.startsWith('1')) return null;
  // موبايل = 10 أرقام بعد الكود الدولي: 1 + (0|1|2|5) + 8 أرقام
  if (digits.length !== 10 || !'0125'.includes(digits[1])) return null;
  return `+20${digits}`;
}

/** عرض الرقم بشكل مقروء: "+201012345678" → "+20 10 1234 5678". */
export function phoneDisplay(e164: string): string {
  const m = e164.match(/^\+20(\d{2})(\d{4})(\d{4})$/);
  return m ? `+20 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/**
 * رقم محلي للفورمات (0XXXXXXXXXX) — نفس قاعدة تحقق السيرفر للطلبات:
 * موبايل 11 رقم يبدأ بـ 01[0125].
 */
export function toLocalEgyptianPhone(raw: string): string | null {
  const e164 = normalizeEgyptianPhone(raw);
  return e164 ? `0${e164.slice(3)}` : null;
}
