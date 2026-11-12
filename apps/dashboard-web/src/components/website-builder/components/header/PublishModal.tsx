import React, { useState } from 'react';
import {
  X,
  CloudUpload,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Globe,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export const PublishModal: React.FC = () => {
  const {
    isPublishModalOpen,
    setIsPublishModalOpen,
    website,
    publishingStatus,
    runPublishPipeline,
    liveWebsiteUrl,
    publishedSiteUrl,
    builderShopName,
    publishState,
  } = useBuilder();

  const [linkCopied, setLinkCopied] = useState(false);

  if (!isPublishModalOpen) return null;

  // Real, merchant-specific publish state — replaces the old mock-tenant
  // header that showed "المجد للسيارات / almajd-motors.com" to every merchant.
  const stateBadge =
    publishState.status === 'never_published'
      ? { text: 'لم يُنشر من قبل — النشر الأول سيجعل الموقع متاحًا للعملاء', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
      : publishState.status === 'has_changes'
        ? { text: 'لديك تعديلات في المسودة غير منشورة بعد', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
        : publishState.status === 'up_to_date'
          ? { text: 'النسخة المنشورة مطابقة للمسودة الحالية', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
          : null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CloudUpload className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                نشر الموقع إلى بيئة الإنتاج السحابية
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                المتجر:{' '}
                <span className="font-semibold text-slate-700">
                  {builderShopName || 'متجري'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPublishModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Real draft-vs-published state, fetched from the public endpoint —
              replaces the mock-tenant domain line that used to live here */}
          {stateBadge && (
            <div className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold ${stateBadge.cls}`}>
              {stateBadge.text}
            </div>
          )}

              {/* Pipeline Status Box */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    حالة خط النشر الآلي
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      publishingStatus.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : publishingStatus.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : publishingStatus.status === 'idle'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-800 animate-pulse'
                    }`}
                  >
                    {publishingStatus.status === 'published'
                      ? 'تم النشر بنجاح على الإنتاج'
                      : publishingStatus.status === 'failed'
                        ? 'فشل النشر'
                        : publishingStatus.status === 'idle'
                          ? 'بانتظار بدء النشر'
                          : 'جاري المعالجة والبناء...'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      publishingStatus.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${(publishingStatus.currentStep / publishingStatus.totalSteps) * 100}%`,
                    }}
                  />
                </div>

                <p className="text-xs font-mono text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  {publishingStatus.status !== 'published' &&
                    publishingStatus.status !== 'idle' &&
                    publishingStatus.status !== 'failed' && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                    )}
                  {publishingStatus.status === 'published' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  {publishingStatus.status === 'failed' && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  )}
                  <span>{publishingStatus.stepMessage}</span>
                </p>
              </div>

              {/* Persistent public URL: available even before the first publish */}
              {publishingStatus.status !== 'published' && publishedSiteUrl && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>رابط موقع متجرك العام</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    سيصبح الرابط متاحاً للعملاء بعد إتمام أول عملية نشر ناجحة.
                  </p>
                  <div className="flex items-center gap-2">
                    <code
                      dir="ltr"
                      className="flex-1 min-w-0 truncate rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700"
                    >
                      {publishedSiteUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(publishedSiteUrl);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2500);
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
                    >
                      {linkCopied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {linkCopied ? 'تم النسخ' : 'نسخ الرابط'}
                    </button>
                  </div>
                </div>
              )}

              {/* Failure Card */}
              {publishingStatus.status === 'failed' && (
                <div className="p-5 rounded-xl bg-red-50 border border-red-200 space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>تعذّر نشر الموقع</span>
                  </div>
                  {publishingStatus.errors?.map((e, i) => (
                    <p
                      key={i}
                      className="text-xs text-red-700 font-mono bg-white border border-red-100 rounded-lg p-2 break-words"
                    >
                      {e}
                    </p>
                  ))}
                  <p className="text-[11px] text-red-600">
                    لم يتم تغيير النسخة المنشورة على الموقع العام — أعد المحاولة بعد معالجة السبب.
                  </p>
                </div>
              )}

              {/* Published Success Card & Live Store Marketing Link */}
              {publishingStatus.status === 'published' &&
                (() => {
                  const targetUrl = publishingStatus.liveUrl || liveWebsiteUrl || '';
                  const copyStoreLink = () => {
                    if (!targetUrl) return;
                    navigator.clipboard.writeText(targetUrl);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  };
                  const waShareUrl = targetUrl
                    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `تفضل بزيارة موقعنا ومتجرنا الرسمي وتسوّق أفضل المنتجات الآن:\n${targetUrl}`
                      )}`
                    : '#';

                  return (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border-2 border-emerald-300 space-y-4 shadow-sm animate-in fade-in duration-300">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 text-emerald-950 font-black text-sm sm:text-base">
                          <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </span>
                          <span>موقعك منشور الآن ومتاح عالمياً للعملاء!</span>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                          مباشر ومفعّل
                        </span>
                      </div>

                      {/* Prominent URL Card for marketing */}
                      <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-emerald-600" />
                            <span>رابط متجرك الحقيقي للتسويق والنشر:</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">
                            جاهز للمشاركة
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={targetUrl}
                            dir="ltr"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 select-all outline-hidden focus:border-emerald-500 focus:bg-white transition-all truncate"
                          />
                          <button
                            type="button"
                            onClick={copyStoreLink}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                          >
                            {linkCopied ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-200" />
                                <span>تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>نسخ الرابط</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <a
                            href={targetUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-disabled={!targetUrl}
                            onClick={(e) => {
                              if (!targetUrl) e.preventDefault();
                            }}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                              targetUrl
                                ? 'bg-slate-900 text-white hover:bg-black shadow-xs'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                            }`}
                          >
                            <span>زيارة المتجر الآن</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {targetUrl && (
                            <a
                              href={waShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white transition-all shadow-xs cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>مشاركة عبر واتساب</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-300/60 rounded-xl p-3 text-[11px] text-emerald-950 font-medium leading-relaxed">
                        💡 <strong>ملاحظة للمبيعات:</strong> هذا هو الرابط الذي تسوّق به لعملائك
                        ليدخلوا ويتصفحوا موقعك. المنتجات التي تضيفها في المخزون وتفعّل خيار ظهورها
                        في الموقع ستظهر للمشترين هنا مباشرة مع إمكانية الشراء والطلب الفوري.
                      </div>

                      {/* Publish facts (real values only) */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                          <span className="text-[10px] text-slate-500 block">الصفحات المنشورة</span>
                          <span className="text-base font-bold text-slate-900">
                            {website.pages.length}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center">
                          <span className="text-[10px] text-slate-500 block">
                            تحديث النسخة المنشورة
                          </span>
                          <span className="text-xs font-bold text-blue-600">
                            فوري بعد كل نشر
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-right">
                  سيتم تحديث كاش الخوادم السحابية وإرسال طلبات الـRevalidation تلقائياً.
                </div>
                <button
                  id="execute_publish_btn"
                  onClick={runPublishPipeline}
                  disabled={
                    publishingStatus.status !== 'idle' &&
                    publishingStatus.status !== 'published' &&
                    publishingStatus.status !== 'failed'
                  }
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      publishingStatus.status !== 'idle' &&
                      publishingStatus.status !== 'published' &&
                      publishingStatus.status !== 'failed'
                        ? 'animate-spin'
                        : ''
                    }`}
                  />
                  <span>
                    {publishingStatus.status === 'published'
                      ? 'إعادة النشر وتحديث الكاش'
                      : publishingStatus.status === 'failed'
                        ? 'إعادة المحاولة'
                        : 'بدء النشر الفوري'}
                  </span>
                </button>
              </div>
        </div>
      </div>
    </div>
  );
};
