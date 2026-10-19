const baseUrl = String(process.env.BACKEND_URL || '').trim() || `http://127.0.0.1:${process.env.PORT || process.env.BACKEND_PORT || 4000}`;
const token = String(process.env.RAY_TOKEN || process.env.TOKEN || '').trim();

if (!token) {
  console.error('Missing RAY_TOKEN env var. Example (PowerShell):');
  console.error("  $env:RAY_TOKEN='YOUR_JWT'; npm run backend:smoke:addons");
  process.exit(2);
}

const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
  authorization: `Bearer ${token}`,
};

const print = (title, obj) => {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(obj, null, 2));
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, text: text.slice(0, 1200) };
  }
};

const run = async () => {
  const meUrl = new URL('/api/v1/shops/me', baseUrl);

  const beforeRes = await fetch(meUrl, { method: 'GET', headers });
  const before = await safeJson(beforeRes);
  print('GET /shops/me (before)', before);

  const patchBody = { addons: [] };
  const patchRes = await fetch(meUrl, { method: 'PATCH', headers, body: JSON.stringify(patchBody) });
  const patched = await safeJson(patchRes);
  print('PATCH /shops/me (addons: [])', { request: patchBody, response: patched });

  const afterRes = await fetch(meUrl, { method: 'GET', headers });
  const after = await safeJson(afterRes);
  print('GET /shops/me (after)', after);

  if (!patched.ok) process.exit(1);
  process.exit(0);
};

run().catch((e) => {
  print('ERROR', { message: e?.message || String(e), stack: e?.stack });
  process.exit(1);
});
