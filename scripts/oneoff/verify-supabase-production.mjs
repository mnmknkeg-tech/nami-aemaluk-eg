// One-off: verify that the PRODUCTION backend is healthy and running on the
// intended (Supabase) database. No dependencies — Node 18+ built-in fetch.
//
// Checks:
//   1. (optional) DNS resolves the Supabase DB host          → SUPABASE_DB_HOST
//   2. (optional) GET /monitoring/ready on the backend origin → BACKEND_ORIGIN
//   3. Admin login through the public API                     → ADMIN_EMAIL/ADMIN_PASSWORD
//   4. GET /api/v1/users returns 200 with rows                → schema is current
//   5. Signup probe + admin cleanup                           → writes hit the new DB
//
// Usage (PowerShell / bash):
//   API_BASE=https://dashboard-web-three-kappa.vercel.app \
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
//   [SUPABASE_DB_HOST=db.xxxx.supabase.co] [BACKEND_ORIGIN=https://api...] [SKIP_PROBE=1] \
//   node scripts/oneoff/verify-supabase-production.mjs
//
// Exit code 0 = all checks passed. See docs/08-supabase-production-switch.md.

import dns from 'node:dns/promises';

const API_BASE = (process.env.API_BASE || 'https://dashboard-web-three-kappa.vercel.app').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SUPABASE_DB_HOST = process.env.SUPABASE_DB_HOST;
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;
const SKIP_PROBE = process.env.SKIP_PROBE === '1';

const results = [];
let failed = false;

function report(name, ok, detail) {
  if (!ok) failed = true;
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n      ${detail}` : ''}`);
}

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-App-Scope': 'dashboard' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, json };
}

// 1) Supabase DB host DNS
if (SUPABASE_DB_HOST) {
  try {
    const addrs = await dns.resolve(SUPABASE_DB_HOST).catch(() => dns.resolve6(SUPABASE_DB_HOST));
    report(`DNS ${SUPABASE_DB_HOST}`, true, `resolved: ${addrs.join(', ')}`);
  } catch {
    report(`DNS ${SUPABASE_DB_HOST}`, false,
      'الـ DNS مش بيحل — المشروع متمسوح أو متوقف أو الـ ref غلط');
  }
} else {
  console.log('SKIP  DNS check (SUPABASE_DB_HOST not set)');
}

// 2) Direct backend readiness
if (BACKEND_ORIGIN) {
  try {
    const res = await fetch(`${BACKEND_ORIGIN.replace(/\/+$/, '')}/monitoring/ready`, {
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json().catch(() => null);
    const checks = j?.checks || {};
    const ok = res.status === 200 && checks.database === 'ok' && checks.schema === 'ok';
    report('GET /monitoring/ready (backend origin)', ok,
      `HTTP ${res.status} checks=${JSON.stringify(checks)}` +
      (ok ? '' : ' — لو schema=incomplete: الـ migrations مش متطبقة (شوف docs/08)'));
  } catch (e) {
    report('GET /monitoring/ready (backend origin)', false, String(e?.message || e));
  }
} else {
  console.log('SKIP  /monitoring/ready (BACKEND_ORIGIN not set)');
}

// 3) Admin login
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('حط ADMIN_EMAIL و ADMIN_PASSWORD في البيئة — مفيش بيانات دخول أدمن.');
  process.exit(2);
}
let token = '';
try {
  const r = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  token = r.json?.data?.token?.accessToken || r.json?.token?.accessToken || '';
  report('POST /api/v1/auth/login (admin)', r.status === 200 && !!token,
    token ? 'لوجين الأدمن ناجح — الـ API حي وبيوصل لقاعدة المستخدمين' : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
} catch (e) {
  report('POST /api/v1/auth/login (admin)', false, String(e?.message || e));
}

// 4) Users list — proves the users table has the newest columns (migrations applied)
if (token) {
  try {
    const r = await req('/api/v1/users', { token });
    const users = Array.isArray(r.json?.data) ? r.json.data : [];
    report('GET /api/v1/users', r.status === 200 && users.length > 0,
      r.status === 200
        ? `${users.length} مستخدم — السكيما كاملة والمقروءات شغالة`
        : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 160)} — سكيما قاعدة الإنتاج متأخرة عن الكود`);
  } catch (e) {
    report('GET /api/v1/users', false, String(e?.message || e));
  }
}

// 5) Write probe: signup a throwaway user, then delete it as admin
if (!SKIP_PROBE && token) {
  const probeEmail = `db-probe-${Date.now()}@ray-probe.invalid`;
  const probePassword = `Px#${Math.random().toString(36).slice(2, 10)}A1`;
  try {
    const r = await req('/api/v1/auth/signup', {
      method: 'POST',
      body: { email: probeEmail, password: probePassword, name: 'DB Probe' },
    });
    const id = r.json?.data?.user?.id || r.json?.data?.id;
    report('POST /api/v1/auth/signup (probe)', r.status === 200 || r.status === 201,
      (r.status === 200 || r.status === 201)
        ? 'الكتابة شغالة على قاعدة الإنتاج'
        : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
    if (id) {
      const d = await req(`/api/v1/users/${id}`, { method: 'DELETE', token });
      report('DELETE probe user (cleanup)', d.status === 200 || d.status === 204,
        `HTTP ${d.status}`);
    }
  } catch (e) {
    report('POST /api/v1/auth/signup (probe)', false, String(e?.message || e));
  }
} else if (!SKIP_PROBE) {
  console.log('SKIP  write probe (no admin token)');
}

console.log('\n--- Summary ---');
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}`);
console.log(failed ? '\nالنتيجة: فيه إخفاقات — راجع docs/08-supabase-production-switch.md'
  : '\nالنتيجة: كله تمام — الباك متصل بقاعدة سليمة وسكيما مكتملة');
process.exit(failed ? 1 : 0);
