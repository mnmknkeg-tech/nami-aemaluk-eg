const fs = require('fs');
const f = 'apps/dashboard-web/app/dashboard/(main)/inventory/add-product/service/page.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');

const block = `      {/* Basic Info — two columns: live preview (left) + fields (right) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">المعلومات الأساسية</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Live preview panel */}
          <div className="bg-slate-50 rounded-2xl p-5 lg:sticky lg:top-4 text-center">
            <div className="w-full aspect-square rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center mb-4">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-200">
                  <ImageIcon size={40} />
                </div>
              )}
            </div>
            {name.trim() && (
              <p className="text-sm font-black text-slate-900 mb-1">{name.trim()}</p>
            )}
            {price && (
              <p className="text-sm font-black text-teal-600 mb-2">
                ج.م {Number(price).toFixed(2)}
                {extraData.discountPrice ? (
                  <span className="text-[11px] font-bold text-slate-400 line-through mr-2">
                    ج.م {Number(extraData.discountPrice).toFixed(2)}
                  </span>
                ) : null}
              </p>
            )}
            {(extraData.subtitle || extraData.promoTitle) && (
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                {[extraData.promoTitle, extraData.subtitle].filter(Boolean).join(' — ')}
              </p>
            )}
            {!name.trim() && !price && (
              <div className="text-center">
                <p className="text-xs font-black text-slate-500 mb-1.5">أضف المعلومات الأساسية</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  تُظهر المعاينة الصورة، الاسم، السعر، السعر المخفض، العنوان الفرعي والترويجي.
                  ستتمكن من معاينة صفحة المنتج الكاملة على ثيم متجرك بعد الحفظ.
                </p>
              </div>
            )}
          </div>

          {/* Fields column */}
          <div className="space-y-4 min-w-0">
            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) handleImageUpload({ target: { files: [file] } } as any);
              }}
              className={\`rounded-2xl border-2 border-dashed p-5 text-center transition-all \${dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'}\`}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-xl border-2 border-slate-100 flex items-center justify-center text-slate-300 overflow-hidden shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={22} />
                  )}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-600">اسحب الصورة وأفلتها هنا</p>
                  <label className="inline-block mt-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                    اختار من المعرض
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="mt-2 text-left" dir="ltr">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="أو أضف رابط يوتيوب"
                  className="w-full max-w-xs text-[11px] px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-sky-300 outline-none bg-transparent text-teal-600 underline placeholder:text-slate-300 placeholder:no-underline"
                />
              </div>
            </div>

            {/* Name */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                اسم المنتج <Info size={13} className="text-slate-300" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-16 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-400"
                  placeholder="أدخل اسم المنتج"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 h-7 px-2 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                  AR <ChevronDown size={10} />
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                السعر <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-400"
                  placeholder="أدخل السعر"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">#</span>
              </div>
            </div>

            {/* Cost price */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                سعر التكلفة <Info size={13} className="text-slate-300" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  min="0"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-400"
                  placeholder="أدخل سعر التكلفة"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">#</span>
              </div>
            </div>

            {/* Categories */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                التصنيفات <Info size={13} className="text-slate-300" />
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-sky-400"
                >
                  <option value="">اختر التصنيفات</option>
                  {categories.map((cat: any) => {
                    const val = cat.name || cat.nameAr || cat.name_ar || String(cat.id || '');
                    const label = cat.nameAr || cat.name || cat.name_ar || val;
                    return (
                      <option key={cat.id || val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(true)}
                  className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 text-lg font-bold hover:bg-teal-100 transition-all shrink-0 flex items-center justify-center"
                  title="فئة جديدة"
                >
                  +
                </button>
              </div>
            </div>

            {/* Brand */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                العلامة التجارية <Info size={13} className="text-slate-300" />
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-400"
                placeholder="اختر العلامة التجارية"
              />
            </div>

            {/* Google category */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                تصنيفات جوجل <Info size={13} className="text-slate-300" />
              </label>
              <input
                type="text"
                value={googleCategory}
                onChange={(e) => setGoogleCategory(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-400"
                placeholder="اختار تصنيف جوجل"
              />
            </div>

            {/* Local category */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                تصنيف محلي <Info size={13} className="text-slate-300" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={localCategory}
                  onChange={(e) => setLocalCategory(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-sky-400"
                  placeholder="تصنيف محلي"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-300 text-sm">👑</span>
              </div>
            </div>

            {/* Duration */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                مدة الخدمة
              </label>
              {customDuration ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    min="5"
                    step="5"
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-sky-400"
                    placeholder="بالدقائق"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDuration(false);
                      setDurationMinutes('60');
                    }}
                    className="px-3 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shrink-0"
                  >
                    قوائم جاهزة
                  </button>
                </div>
              ) : (
                <select
                  value={durationMinutes}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setCustomDuration(true);
                      setDurationMinutes('');
                    } else {
                      setDurationMinutes(e.target.value);
                    }
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-sky-400"
                >
                  {DURATION_PRESETS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                  <option value="__CUSTOM__">مدة أخرى...</option>
                </select>
              )}
            </div>

            {/* Description */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                وصف المنتج <Info size={13} className="text-slate-300" />
              </label>
              <RichDescriptionEditor
                value={description}
                onChange={setDescription}
                placeholder="اكتب تفاصيل الخدمة وما تشمله..."
              />
            </div>

            {/* Available for booking */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-teal-600"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                متاحة للحجز
              </label>
            </div>
          </div>
        </div>
      </div>
`;

// Replace lines 277..495 (1-based inclusive) with the new block
const out = [...lines.slice(0, 276), block, ...lines.slice(495)].join('\n');
fs.writeFileSync(f, out);
console.log('replaced; new line count:', out.split('\n').length);
