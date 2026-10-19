# إعادة تصميم نظام المصادقة والجلسات وطلبات الـAPI — تحليل ومقترح

> تاريخ: 2026-09-23 · الحالة: **مقترح بانتظار الموافقة** — لم يتم تعديل أي كود بعد.

---

## 1) المشكلة الحالية بالضبط

### سلسلة الخروج التلقائي (السبب الجذري للـLogout كل 15 دقيقة)

النظام الحالي: Access Token عمره **15 دقيقة** (`AUTH_ACCESS_TOKEN_EXPIRY=15m`) يُخزَّن في
`localStorage`، والـRefresh Token (7–90 يومًا) يُخزَّن في كوكي HttpOnly باسم `ray_session[-SCOPE]`.
عند انتهاء الـAccess Token يفشل الطلب بـ401، فيحاول الفرونت عمل Refresh صامت ثم إعادة الطلب مرة واحدة.

هذا التصميم صحيح **نظريًا**، لكنه ينكسر في الإنتاج لأسباب مرتبة حسب الأهمية:

1. **الـRefresh Cookie لا يصل أصلًا للوحة في مسار الدخول الأساسي للتجّار.**
   تسجيل الدخول يحدث في تطبيق `business` (صفحة `/login` هناك) بنداء مباشر على
   `https://api2.mnmknk.com` **بدون `credentials: 'include'`** — لذلك المتصفح يرفض تخزين كوكي
   `Set-Cookie` القادم من الـBackend (origin مختلف + بدون credentials). ثم يُنقل الـAccess Token
   وحده عبر الـURL إلى `dashboard-web/auth/callback?token=...` ويُحفظ في localStorage.
   النتيجة: المتصفح **لا يملك أي كوكي refresh على نطاق اللوحة**. بعد 15 دقيقة بالضبط:
   401 → محاولة Refresh (بدون كوكي) → فشل → حدث `ray-session-expired` →
   `(guarded)/layout.tsx` يرى `user=null` → تحويل إلى `/admin/gate`.
   **هذا هو الـLogout كل 15 دقيقة.**

2. **اكتشاف الـ401 يعتمد على regex لنص الرسالة** وليس على كود خطأ منظم:
   `/expired|invalid token|invalid_token/i.test(message)`. لو تغيّر نص خطأ الـJWT
   (مثل `token contains an invalid number of segments` أو مشكلة clock skew) لا يحدث refresh إطلاقًا.

3. **لا يوجد Refresh استباقي (Proactive) إطلاقًا** — الـRefresh لا يحدث إلا بعد فشل طلب.
   أول طلب بعد الدقيقة 15 يتجمد لحظة (refresh + retry) وتظهر شرارة خروج لو فشل أي شيء.

4. **فشل Redis في الإنتاج = فشل كل الـRefreshs** (`session_error`) — الجلسات تعتمد على Redis
   بfallback للذاكرة (يصلح للتطوير فقط).

5. مسارات أخرى تُنتج نفس العرض: Google OAuth يرجع عبر نطاق الـAPI (كوكي على نطاق الـAPI
   لا يخدم نطاق اللوحة على vercel.app)، و`dashboardAuthCallbackUrl` مع `returnTo`
   يعيد التوجيه **بدون توكن ولا كوكي** أصلًا.

### ما لا هو السبب
- ليس سببًا "قصر عمر الكوكي" — الكوكي القائم عمره 7–90 يومًا وهو HttpOnly صحيح الإعدادات.
- ليست مشكلة middleware في Next — هو يفحص **وجود** الكوكي فقط (بوابة UX مشروعة).

---

## 2) خريطة الوضع الحالي (إجابة أسئلة الفحص)

| البند | الواقع الحالي |
|---|---|
| Backend | Go + Fiber (`gobackend`)، PostgreSQL، Redis، JWT HS256 |
| Frontend | Next.js App Router: `dashboard-web` (لوحة الأدمن + التاجر)، `business` (استقطاب التاجر)، `marketplace-next` (المتجر)، و`cashier-desktop` (Wails) |
| مكان إنشاء الكوكي | `gobackend/internal/domains/auth/handler.go` — `setAuthCookie` / `setAccessCookie` |
| مكان التحقق من الجلسة | `internal/platform/middleware/auth.go` (`RequireAuth`) + فحص جلسة عند الـRefresh فقط (`service.go: Refresh`) |
| عمر Access Token | 15 دقيقة |
| عمر Refresh Token | 168h افتراضيًا، 2160h في `.env.example` (90 يومًا) — كوكي HttpOnly, Secure(prod), SameSite=Lax |
| Auth endpoints | `/auth/signup, login, logout, refresh, password/forgot, password/reset, verify-email, resend-verification, bootstrap-admin, 2fa/*, me, change-password, deactivate` + dev-logins |
| SSR/CSR | الفرونت CSR فوق Next rewrites `/api/* → BACKEND` (same-origin) — `dashboard-web` و`business` لديهما rewrites؛ `business` في الإنتاج يضرب الـAPI مباشرة |
| مكان الـLogout حاليًا | Frontend: `lib/auth.tsx logout()` يمسح localStorage ثم يطلب `/auth/logout`؛ الخروج الفعلي غير المقصود: فشل الـRefresh → `ray-session-expired` → redirect |
| الـMiddleware | Go: Recovery→RequestID→Logger→Compress→SecurityHeaders→CORS→SlowDown→CircuitBreaker→RateLimit→AdminIP→Idempotency→CSRF؛ Next: `middleware.ts` فحص وجود كوكي لـ`/admin/*` |
| الـCaching | React Query مثبت في الجذر (`@tanstack/react-query@5`) وغير مستخدم إطلاقًا (0 useQuery) |

### ثغرات ومشاكل بنيوية مرصودة (أمنية + هندسية)

1. **3 نسخ مستقلة من منطق الـRefresh والـ401** (كل واحدة بـ`refreshInFlight` خاص بها):
   - `dashboard-web/src/lib/auth.tsx` (مع كاش GET بـ30s + dedup)
   - `dashboard-web/src/lib/api/client.ts` (بدون كاش)
   - `marketplace-next/src/lib/api.ts`
2. **674 موقع نداء `apiRequest(`** في dashboard-web و**160 نداءً لـ`/shops/me`** — نفس البيانات
   تُجلب في كل صفحة/كومبوننت عند الـmount (كاش الـ30s يغطي جزءًا فقط وعميلًا واحدًا).
3. **الـAccess Token في `localStorage`** (`ray_dashboard_token` / `ray_market_token`) — قابل للسرقة بـXSS،
   ولهذا يُحتفظ بالـBearer كمسار أساسي بدل الكوكي.
4. **الـMiddleware في Go يقبل `typ=refresh` من الكوكي كاعتماد مصادقة للطلبات العادية**
   (`auth.go extractUser`) — أي أن الـRefresh Token طويل العمر يعمل فعليًا كـAccess Token
   لكل الطلبات القادمة بالكوكي، فتنهار دلالة "توكن قصير العمر".
5. **لا يوجد Refresh Token Rotation حقيقي**: `service.Refresh` ينشئ جلسة جديدة في كل مرة
   (`issueAuthResponse → CreateSession`) **دون حذف القديمة أو رفضها**. دالة `RotateSession`
   موجودة في `session.go:213` و**غير مستخدمة**. النتيجة:
   - الـRefresh Token القديم يبقى صالحًا حتى انتهاء مدته → **Replay ممكن بالكامل**.
   - تراكم جلسات مهملة في Redis ينمو بلا حدود (جلسة جديدة بكل refresh).
   - لا يوجد كشف إعادة استخدام (Reuse Detection) ولا مفهوم "عائلة جلسة" للإلغاء.
6. **`/auth/refresh` غير مغطى بـrate limiting خاص** (قائمة `isAuthPath` لا تشمله) — يبقى الحد
   العام 10000/15د فقط.
7. **تخزين الـRefresh Token خامًا في قاعدة البيانات**: `audit_login_events.session_token`
   (`audit/repository.go:39`) — أي وصول للقاعدة = سرقة جلسات حية.
8. **نقل توكن عبر الـURL** بين `business → dashboard /auth/callback?token=...` — يتسرب عبر
   history/referrer/سجلات السيرفر.
9. **جلسة ملغاة تبقى "تعمل" حتى 15 دقيقة**: `RequireAuth` لا يفحص مخزن الجلسات (Stateless JWT)،
   والإلغاء يسري فقط عند أول refresh.
10. **Logout في `auth.tsx` لا يرسل `X-CSRF-Token`** (العميل الآخر يرسله) — مسموح اليوم لأن
    `/auth/logout` معفى من CSRF، لكنه ينكسر لاحقًا مع أي تشديد.
11. `AccessCookieName` غير مضبوط في `app.go:240` — كود كوكي الـAccess موجود لكنه لا يعمل أبدًا.
12. **CORS سليم** (بلا wildcard في الإنتاج، مع credentials) و**CSRF** double-submit موجود
    (`csrf.go`) مع استثناءات مدروسة و**Security Headers** قوية في `next.config.mjs` — هذه نقاط قوة نبقيها.

---

## 3) الـArchitecture المقترحة

### المبادئ
- **الكوكي HttpOnly هي الوعاء الأساسي** للتوكنات في المتصفح — localStorage يُمسح نهائيًا من مسار المصادقة.
- **Access Token قصير (15 د)** + **Refresh Token دوّار (Rotation) مع كشف إعادة الاستخدام**.
- **تجديد استباقي في الخلفية قبل الانتهاء** + **single-flight** لكل الطلبات المتزامنة.
- الإلغاء حقيقي على السيرفر (Redis)، وكل الأدوار تبقى محسوبة على السيرفر.

### تصميم التوكنات والكوكيز

| العنصر | القيمة | التخزين | ملاحظات |
|---|---|---|---|
| Access Token (JWT HS256, `typ=access`, jti=sessionID) | **15 د** (قابل للضبط) | كوكي `ray_access[-SCOPE]` HttpOnly+Secure+Lax، ويرجع في body للعملاء غير المتصفحية (cashier-desktop) | يُحدث في كل login/refresh |
| Refresh Token (JWT HS256, `typ=refresh`, jti=sessionID) | **خمول 7 أيام منزلقة** + **سقف مطلق 30 يومًا** (جديد: `AUTH_SESSION_ABSOLUTE_TTL`) | كوكي `ray_session[-SCOPE]` HttpOnly+Secure+Lax | يُدوَّر في كل refresh؛ ليس نهائيًا ولا سنة كاملة |
| CSRF | كوكي `ray_csrf` غير HttpOnly (كما هو) | double-submit للطفرات المعتمدة على الكوكي | القائم لا يتغير |

- `SameSite=Lax` + الطلبات كلها same-origin عبر rewrites ⇒ الحماية من CSRF موجودة، ونحتفظ
  بمطلب `X-CSRF-Token` للطفرات (POST/PUT/DELETE) في العميل الموحد.
- تُضبط `AccessCookieName=ray_access` في `app.go` لتفعيل الكود الموجود أصلًا.
- تُزال من الـmiddleware إجابة "refresh token يصحّح من الكوكي" بعد تفعيل كوكي الـAccess
  (مع مهلة توافق قصيرة إن لزم للنشر المتدرج).

### تدوير الجلسة: Rotation + Reuse Detection (القلب الأمني)

كل جلسة في Redis تُخزن: `session_id, user_id, family_id, current_token_hash (SHA-256),
previous_token_hash, rotated_at, last_used, issued_at`.

```
POST /auth/refresh (كوكي ray_session)
│
├─ hash(الرمز) == current_hash؟
│    └─ دوران: جلسة جديدة بنفس family_id، حذف القديمة، كوكيان جديدان، وإرجاع الزوج الجديد
│
├─ hash(الرمز) == previous_hash AND (now - rotated_at) ≤ 60s؟
│    └─ سباق تابات/طلبات متوازية: إرجاع الزوج الحالي دون دوران + إعادة ضبط الكوكي
│
└─ غير ذلك (رمز قديم/مسروق يُعاد استخدامه)
     └─ إلغاء كل جلسات family_id بالكامل + تسجيل حدث أمني + 401 session_expired
```

- **إلغاء عائلة الجلسة كاملة** عند اكتشاف إعادة استخدام = سرقة مؤكدة (الطرفان لا يستطيعان المتابعة).
- حذف الجلسة القديمة عند كل دوران ⇒ لا تراكم في Redis.
- `Logout` و`LogoutAll` و`ResetPassword` تبقى تلغي على السيرفر (قائمة)، وتُضاف:
  `DeleteSessionFamily(familyID)`.
- `LogoutAll` يلغي **كل عائلات** المستخدم (كل الأجهزة).
- تخزين hash بدل الرمز الخام في `audit_login_events` (أو session_id فقط).

### تجربة الاستخدام: "مفتوح دائمًا أثناء العمل"

```
Login ──► Access 15د + Refresh (جلسة Redis منزلقة 7 أيام)
  │
  ├─ العميل يجدول Refresh استباقي عند (ينتهي − 90 ثانية)
  │    (يعاد جدولته بعد كل refresh، وعند عودة التركيز/الظهور visibilitychange/focus)
  │
  ├─ طلب عادي: كوكي ray_access يُرفق تلقائيًا (same-origin) ⇒ لا 401 أصلًا أثناء الاستخدام
  │
  ├─ 401 مع ذلك؟ (جهاز نائم مثلًا) ──► single-flight refresh ──► retry مرة واحدة ──► يستمر
  │
  ├─ خمول أطول من نافذة الخمول؟ ──► أول نشاط: refresh يفشل (انتهت الجلسة) ──► خروج نظيف
  │                                   وهذا سلوك مقصود وليس سنة كاملة بلا حماية
  └─ إغلاق المتصفح وإعادة الفتح خلال النافذة ──► الكوكي قائم ──► refresh عند أول طلب ──► دخول صامت
```

- المستخدم النشط: refresh صامت كل ~14 دقيقة، لا يعود يرى خروجًا.
- لا `setInterval` أعمى: مؤقّت واحد يُعاد ضبطه بعد كل عملية، + فحص عند عودة الظهور.

### سباق الطلبات (Single Flight / Request Queue)

```
Request A ─┐
Request B ─┼─ 401 ──► refreshLock.shared ──► refresh واحد فقط ──► A,B,C يعادون بالتوكن/الكوكي الجديد
Request C ─┘            (نفس الـPromise لكل المعتقلين)
                                   │
                                   └─ فشل ──► حدث session-expired مرة واحدة (guarded flag)
                                              ──► مسح حالة + redirect للدخول
```

- لا حلقة لا نهائية: كل طلب يحمل `_retried` — إعادة محاولة **واحدة فقط**؛ نداء `/auth/refresh`
  نفسه لا يُعاد أبدًا عند 401.
- اكتشاف الحاجة للتجديد لا يعتمد على regex: يستخدم **كود الخطأ المنظم** (`error.code` /
  `error === "invalid_token"`) + status 401، ويظل الـregex احتياطًا للتوافق.

### إصلاح مسار الدخول عبر التطبيقات (بدون توكن في الـURL)

- `business` يتوقف عن تسجيل الدخول بنفسه ونقل التوكن: يحوّل التاجر إلى
  `DASHBOARD_URL/login?returnTo=...` — **اللوحة تسجّل الدخول على نطاقها نفسه** فيُضبط
  الكوكي على نطاقها فورًا (صفحة `/login` موجودة وتعمل أصلاً).
- Google OAuth: يُعاد توجيه العودة إلى callback على نطاق الواجهة نفسه بحيث يُطبع الكوكي
  على النطاق الصحيح (تُراجع إعدادات callback لدى المزود).
- يحذف `/auth/callback?token=` كآلية أساسية (يبقى للتوافق مؤقتًا ثم يُسحب).

---

## 4) ما الذي سيتغير فعليًا (خطة تنفيذ)

### المرحلة A — Backend (Go)
| الملف | التغيير |
|---|---|
| `internal/platform/session/session.go` | حقول الجلسة: `family_id, current_token_hash, previous_token_hash, rotated_at` + `RotateSession` (حذف القديمة) + `DeleteSessionFamily` + دالة مطابقة hash/grace |
| `internal/domains/auth/service.go` | `Refresh` يعتمد hash-matching (دوران/تكافؤ/كشف سرقة) بدل "جلسة جديدة كل مرة"؛ توقيع refresh token بـjti الجديد |
| `internal/domains/auth/handler.go` | `Refresh` يضبط **كوكيي** access+refresh؛ `Logout` يمسح الكوكيين ويغلق العائلة عند طلب `all=true` |
| `internal/app/app.go` | تفعيل `AccessCookieName: "ray_access"` |
| `internal/platform/middleware/auth.go` | ترتيب الاعتماد: Bearer ثم كوكي `ray_access` ثم (توافق مؤقت) `ray_session` |
| `internal/platform/middleware/ratelimit.go` | إضافة `/auth/refresh` بحد مستقل (مثلًا 30/د/IP) |
| `internal/domains/audit/repository.go` | تخزين SHA-256/session_id بدل الرمز الخام |
| `internal/config/config.go` + `.env.example` | `AUTH_SESSION_ABSOLUTE_TTL`, `AUTH_REFRESH_GRACE=60s`, `AUTH_REFRESH_RATE_LIMIT_MAX` |
| اختبارات Go جديدة | دوران/تكافؤ/grace/كشف سرقة/إلغاء عائلة/logout يعطل فورًا |

### المرحلة B — Frontend (dashboard-web أولًا ثم marketplace-next)
| الملف | التغيير |
|---|---|
| `src/lib/api/core.ts` **(جديد)** | نواة موحدة: ربط الطلبات (كوكي أولًا + Bearer اختياري للتوافق)، `X-CSRF-Token` للطفرات، **single-flight refresh**، طابور إعادة المحاولة (مرة واحدة)، **كاش GET + dedup in-flight**، مفاتيح cache بpath+query، تجاهل كاش بـ`no-store` |
| `src/lib/auth.tsx` | `apiRequest` يفوّض إلى `core.ts` (توقيع الدوال كما هو ⇒ **674 موقع نداء لا تُمس**)؛ `login/logout` يعتمدان الكوكي؛ إزالة قراءة/كتابة localStorage للمصادقة |
| `src/lib/api/client.ts` | يفوّض إلى `core.ts` أيضًا (قضاء على العميلين المتوازيين) |
| `src/lib/session-keys.ts` | الترحيل: قراءة توكن قديم من localStorage لمرة واحدة لإكمال جلسة قائمة ثم مسحه؛ لا كتابة جديدة |
| `src/lib/auth-scheduler.ts` **(جديد)** | مجدول refresh استباقي: مؤقّت واحد يُعاد ضبطه بعد كل refresh/عند visibilitychange-focus |
| `business/src/app/login/page.tsx` + `appUrls.ts` | التحويل إلى `DASHBOARD_URL/login` بدل token handoff |
| `dashboard-web/app/auth/callback/page.tsx` | ترحيل توافق ثم إسحاب |
| صفحات ساخنة (الرئيسية/التحليلات/الطلبات) | ترحيل إلى **React Query** (مثبت أصلًا — لا مكتبة جديدة): `staleTime`، `refetchInterval` واعٍ بالظهور، `queryKey` موحد — أبرزها `/shops/me` عبر `useShop` |
| `src/hooks/useOrderBell.ts` | استبدال `setInterval` الأعمى بـpolling واعٍ بحالة الصفحة |

### المرحلة C — الاختبارات (خطة الحالات العشر)

| # | الحالة | الأداة |
|---|---|---|
| 1 | دخول ⇒ بقاء في اللوحة أثناء الاستخدام الطبيعي | E2E Playwright (بيئة تطوير بـ`ACCESS_TOKEN_EXPIRY=45s`) |
| 2 | اقتراب الانتهاء ⇒ refresh استباقي صامت بدون logout | Jest على المجدول + E2E |
| 3 | 10 طلبات متزامنة عند الانتهاء ⇒ refresh واحد | Jest (spying على `fetch('/auth/refresh')` = 1 نداء) |
| 4 | refresh token غير صالح ⇒ خروج آمن مرة واحدة | Jest + Go test |
| 5 | 401 ⇒ refresh واحد ⇒ retry واحد | Jest |
| 6 | فشل refresh ⇒ لا حلقة لا نهائية | Jest (عدّاد المحاولات) |
| 7 | logout ⇒ إلغاء على السيرفر | Go test + E2E (كوكي ميت بعد logout) |
| 8 | استخدام جلسة ملغاة ⇒ رفض من Backend | Go test |
| 9 | تابات متعددة ⇒ لا تعارض (grace window ينجح السباق، لا قتل عائلة) | Go test للـgrace + E2E تابّين |
| 10 | إغلاق المتصفح وإعادة الفتح ⇒ سلوك حسب سياسة النافذة (خمول/سقف مطلق) | E2E يدوي |

### ما لا يتغير
- كل الـAPI contracts وشكل الاستجابات (`{success, data, meta}`) والـBusiness Logic والـUI.
- نقاط القوة القائمة: CORS، CSRF double-submit، Security Headers، lockout تسجيل الدخول،
  auth_events، 2FA، idempotency.
- `cashier-desktop` يواصل Bearer (يأخذ الزوج من body الاستجابة كما هو اليوم).

---

## 5) المراقبة في الإنتاج (بعد التنفيذ)

1. **معدل نجاح/فشل `/auth/refresh`** (وحده لا يكفي 401 العام) — ارتفاع الفشل = مشكلة Redis أو عملاء قدماء.
2. **عدّاد أحداث Reuse Detection** — أي تكرار خلال ساعة = تحقيق أمني فوري (تنبيه).
3. عدد الجلسات الحية في Redis (`user_sessions:*`) وعدد العائلات لكل مستخدم.
4. معدل 401 لكل مسار قبل/بعد — يجب أن يهبط بشدة بعد التجديد الاستباقي.
5. حجم كاش GET ودقته (hit ratio) قبل الترحيل الواسع لـReact Query.
6. زمن استجابة `/shops/me` (سيصبح الأكثر الطلبًا) — مع كاش 30s + React Query لاحقًا.
7. لوحة `auth_events` لرصد Credential Stuffing (تكرار فشل من IP واحد رغم الـlockout).

---

## 6) إجابات مباشرة على الأسئلة العشرة

1. **المشكلة الحالية؟** مصادقة مبنية على Bearer من localStorage + refresh تفاعلي هش يعتمد على
   regex، وكوكي الـrefresh لا يضبط أصلًا على نطاق اللوحة في مسار الدخول عبر تطبيق business.
2. **لماذا الـlogout كل 15 دقيقة؟** لا يوجد كوكي refresh على نطاق اللوحة ⇒ أول refresh بعد
   انتهاء الـ15 دقيقة يفشل ⇒ `ray-session-expired` ⇒ redirect. (تفصيل القسم 1.)
3. **الـArchitecture الجديدة؟** كوكي HttpOnly مزدوج (access 15د + refresh دوّار منزلق) + دوران
   مع كشف إعادة استخدام على مستوى عائلة الجلسة + تجديد استباقي single-flight + عميل API موحد.
4. **ما الذي تغيّر؟** الجدولان في القسم 4 (Backend/Frontend) — بنفس التوقيعات الحالية حيث
   أمكن حتى لا تنكسر الـ674 موقع نداء.
5. **كيف يتجدد الـSession؟** استباقيًا عند (الانتهاء − 90ث) بواسطة مؤقّت يُعاد ضبطه، وعند عودة
   الظهور، وردّيًا عند 401 (retry مرة واحدة) — كلها عبر refresh واحد مشترك.
6. **كيف قلّت الـRequests؟** عميل واحد بكاش GET + dedup in-flight لكل النداءات (بدل كاش في
   عميل واحد فقط)، ثم React Query على الصفحات الساخنة، وإيقاف النقل المزدوج لـ`/shops/me`
   (160 موقع نداء ⇒ استعلامات مشتركة).
7. **التعامل مع 401؟** 401 ⇒ (فلتر: ليس endpoint مصادقة) ⇒ single-flight refresh ⇒ إعادة الطلب
   مرة واحدة ⇒ فشل مجددًا = خروج نظيف مرة واحدة (guarded event) — لا حلقات.
8. **منع سباقات الـRefresh؟** قفل واحد module-level (وعد مشترك) داخل التاب + grace window
   60ث على السيرفر للطلبات المتوازية بين التابات + الكوكي مشترك أصلًا بين التابات.
9. **المخاطر المعالجة؟** Hijacking (كوكي HttpOnly + دوران)، Fixation (دوران بجلسة جديدة)،
   Token Theft (لا توكن مقروء لـJS)، Replay (كشف إعادة الاستخدام + إلغاء العائلة)، CSRF
   (Lax + double-submit للطفرات)، XSS (لا توكنات في localStorage)، Brute Force/Credential
   Stuffing (lockout + rate limits + توسيعها لـrefresh)، Unauthorized Access/Broken Access
   Control/IDOR (تبقى صلاحيات محسوبة على السيرفر، RequireAuth + RBAC قائم)، Leakage (إزالة
   التوكن من الـURL ومن سجل التدقيق الخام).
10. **المراقبة؟** القسم 5 أعلاه.

---

## 7) قراران بحاجة موافقتك

1. **نوافذ الجلسة المقترحة**: خمول 7 أيام منزلقة + سقف مطلق 30 يومًا (كلاهما متغيرات بيئة
   قابلة للضبط: `AUTH_REFRESH_TOKEN_EXPIRY`, `AUTH_SESSION_ABSOLUTE_TTL`). تصلح؟ أم تفضيل
   خمول أطول/أقصر؟
2. **إزالة localStorage من مسار المصادقة بالكامل** (الكوكي HttpOnly هو الأساس، مع ترحيل
   لمرة واحدة للجلسات القائمة). موافق؟
