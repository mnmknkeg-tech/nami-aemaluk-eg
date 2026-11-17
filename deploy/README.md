# نشر المشروع كامل على VPS (Oracle Always Free أو أي VPS Linux)

الملفات دي بتنشر الباك-إند كامل على سيرفر واحد: `api` + `worker` + `postgres` + `redis` + `caddy` (بروكسي بشهادة HTTPS تلقائية). الصور مش على السيرفر — بتتخزن على S3/R2، فالنقل مفيهوش خطر على الوسائط.

---

## 1) قبل أي حاجة — اتأكد إن حساب Oracle مفعل

- استنى إيميل **"Your Oracle Cloud account is fully activated"** (بيدخل خلال دقائق لساعات).
- ادخل [cloud.oracle.com](https://cloud.oracle.com) وسجل دخول باسم الـ Cloud Account اللي اخترته وقت التسجيل.
- لو الصفحة بتقول حسابك **under review/pending** — استنى لحد ما التفعيل يخلص، مش هتقدر تعمل موارد قبلها.
- رسالة "Update your Oracle account" اللي فوق في الموقع دي مجرد تعديل بيانات البروفايل — **مش محتاج تعملها حاجة دلوقتي**.

## 2) اعمل السيرفر (VM)

من الكونسول: **Compute → Instances → Create Instance**

| الإعداد | القيمة |
|---|---|
| Name | `nami-vps` |
| Image | **Ubuntu 24.04** |
| Shape | **VM.Standard.A1.Flex** (Ampere ARM) |
| OCPU | **4** (الحد الأقصى المجاني) |
| RAM | **24 GB** (الحد الأقصى المجاني) |
| Boot volume | 60–100 GB كفاية |
| SSH keys | حط الـ public key بتاعك (لما تعمل Create الـ private key بينزل عندك — **احتفظ بيه**) |

**ملاحظة مهمة:** لو ظهر **"Out of capacity"** — ده طبيعي وبيحصل كتير على الـ A1. جرب تاني بعد شوية، أو جرب AD تاني (Availability Domain)، أو ابدأ بـ 2 OCPU/12GB ووسّع بعدين من نفس الشاشة.

بعد الإنشاء: خد الـ **Public IP** من صفحة الـ instance واحتفظ بيه.

## 3) افتح المنافذ — في مكانين (خطوة بيتسابها وده أشهر سبب فشل)

### أ) Oracle Security List
**Networking → Virtual Cloud Networks → [الـ VCN بتاعتك] → Security Lists → Default Security List → Add Ingress Rules** وضيف قاعدتين:
- Source `0.0.0.0/0`, Protocol TCP, Destination Port **80**
- Source `0.0.0.0/0`, Protocol TCP, Destination Port **443**

### ب) جدار Ubuntu الداخلي (iptables)
اتصل بالسيرفر:
```bash
ssh ubuntu@<PUBLIC_IP>
```
وعدّل القواعد الافتراضية اللي بتمنع كل حاجة:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4) ركّب Docker وشغّل الستاك

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# الكود
git clone https://github.com/mnmknkeg-tech/nami-aemaluk-eg.git
cd nami-aemaluk-eg/deploy

# ملف الإعدادات
cp .env.example .env
nano .env
```

في `.env` عدّل: `API_DOMAIN` (الدومين بتاع الـ API) + `POSTGRES_PASSWORD` + `JWT_SECRET` (ولّدهم بـ `openssl rand -base64 48`) + `FRONTEND_APP_URL` + `CORS_ORIGIN` + مفاتيح S3 بتاعت الصور.

```bash
docker compose up -d --build
docker compose logs -f api   # شوف الـ migrations بتشتغل والسيرفر قام
```

جرب من جوه السيرفر:
```bash
curl -I http://localhost:4000/monitoring/ready
```

## 5) اربط الدومين

- في مزوّد الدومين: سجل **A Record** باسم الـ API (مثلًا `api.yourdomain.com`) يشاور على الـ **Public IP** بتاع الـ VM.
- استنى الدومين ينتشر، وبعدين Caddy هيفصل شهادة HTTPS لوحده أول ما حد يفتح الدومين.

## 6) انقل داتا Railway (مرة واحدة)

```bash
# على جهازك المحلي — تصدير من Railway
pg_dump "$RAILWAY_DATABASE_URL" --no-owner --no-privileges > backup.sql

# رفعها للسيرفر
scp backup.sql ubuntu@<PUBLIC_IP>:~

# على السيرفر — استيراد جوه الـ container
docker compose exec -T postgres psql -U nami -d nami < ~/backup.sql
docker compose restart api worker
```

## 7) حدّث الفرونتات على Vercel

في كل تطبيق Next.js على Vercel، غيّر متغير الـ API URL للدومين الجديد:
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` (أو اسم المتغير المستخدم في كل app)
- وبعدين **Redeploy** لكل واحد.

## 8) التحقق النهائي

```bash
curl -I https://api.yourdomain.com/monitoring/ready   # لازم 200
```
وافتح الماركت والداشبورد وجرب تسجيل دخول.

---

## ملاحظات مهمة

- **Oracle بيرجع يوقف الـ instances المجانية لو سكتت 7 أيام** — موقع عليه استخدام حقيقي مش هيتأثر، بس لو وقف المشروع فترة طويلة ممكن يتوقف — من الكونسول Start تاني والداتا موجودة.
- **باك أب أسبوعي للداتا:**
  ```bash
  # cron على السيرفر كل يوم 3 الفجر
  docker compose exec -T postgres pg_dump -U nami nami | gzip > ~/backups/$(date +\%F).sql.gz
  ```
- **لما تنقل على VPS مدفوع بعدين**: نفس الملفات دي شغالة على أي VPS — بس انسخ `pgdata` volume أو استورد backup، وغيّر الـ A record.
