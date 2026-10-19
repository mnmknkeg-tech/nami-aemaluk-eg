# Electron Desktop App — دليل التوزيع

> السياق الحالي: تطبيق Electron يتصل بالباك الوحيد `gobackend/` (Go 1.25 + Fiber — باك NestJS القديم حُذف 2026-08-24، وتشغيله عبر `go run ./cmd/api` داخل `gobackend/`) عبر `window.electronApp.backendUrl`. الفرونت ثلاثة تطبيقات Next.js في `apps/`، وقاعدة البيانات PostgreSQL على `localhost:5433` (لا Prisma)، وRedis على `6379`.

## Build محلي

```bash
# بناء الـ .exe (installer فقط بدون رفع)
npm run electron:dist

# النتيجة في: release/نمّي أعمالك Setup 1.0.1.exe
```

## النشر على GitHub Releases

### الطريقة 1: يدوي
```bash
# يحتاج GH_TOKEN في البيئة
set GH_TOKEN=ghp_your_github_token
npm run electron:publish
```

### الطريقة 2: تلقائي عبر GitHub Actions
```bash
# إنشاء tag جديد يحفّز الـ build والنشر تلقائياً
git tag v1.0.1
git push origin v1.0.1
```

ده هيـ trigger الـ workflow في `.github/workflows/electron-release.yml`:
- بيـ build الـ app على windows-latest
- بيـ publish الـ .exe على GitHub Releases تلقائياً
- رابط التحميل: `https://github.com/Sayedtaha55/ray-eg/releases/latest`

## Auto-update (تحديثات تلقائية)

التطبيق بيـ check على التحديثات:
- بعد 10 ثواني من فتحه
- كل ساعة
- لما تحديث متاح → بيـ download تلقائياً
- لما يخلص → notification + يتثبت عند إغلاق التطبيق

كل ده بيشتغل عبر `electron-updater` + GitHub Releases كمصدر.

## Microsoft Store

للنشر على Microsoft Store:

1. احجز حساب Microsoft Partner Center ($19 مرة واحدة)
2. جهّز الـ app:
```bash
# بناء بـ appx target
npm run electron:build-web
npm run electron:build
npx electron-builder --win appx
```
3. ارفع الـ `.appx` على Partner Center
4. التاجر يثبته من المتجر بضغطة واحدة

## Google Drive / Dropbox (بديل سريع)

```bash
npm run electron:dist
# ارفع release/*.exe على Google Drive أو Dropbox
# اعمل رابط مشاركة مباشر
```

## ملاحظات

- الـ app بيـ load من `file://` (offline-ready للـ UI)
- الـ API بيـ connect لـ backend عبر `window.electronApp.backendUrl`
- للتوزيع: set `ELECTRON_BACKEND_URL=https://api.mnmknk.com` قبل الـ build
- المسارات المسموحة في التطبيق: `/business/*`, `/login`, `/signup` فقط
