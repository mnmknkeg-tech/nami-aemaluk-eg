@echo off
set ROOT=C:\Users\Dream\ray-eg-1
cd /d "%ROOT%"
mkdir logs >nul 2>&1

echo [1/4] تشغيل الباك إند (Go) على المنفذ 4000 ...
start /b "" cmd /c "cd /d ""%ROOT%\gobackend"" && go run ./cmd/api > ""%ROOT%\logs\backend.log"" 2>&1"

echo [2/4] تشغيل المتجر (Marketplace Next.js) على المنفذ 5174 ...
start /b "" cmd /c "cd /d ""%ROOT%\apps\marketplace-next"" && npm run dev > ""%ROOT%\logs\marketplace.log"" 2>&1"

echo [3/4] تشغيل لوحة التحكم (Dashboard Next.js) على المنفذ 3000 ...
start /b "" cmd /c "cd /d ""%ROOT%\apps\dashboard-web"" && npm run dev > ""%ROOT%\logs\dashboard.log"" 2>&1"

echo [4/4] تشغيل بوابة الأعمال (Business Next.js) على المنفذ 1000 ...
start /b "" cmd /c "cd /d ""%ROOT%\apps\business"" && npm run dev > ""%ROOT%\logs\business.log"" 2>&1"

echo.
echo تم إطلاق جميع الخدمات في الخلفية.
echo راجع السجلات في مجلد logs\
