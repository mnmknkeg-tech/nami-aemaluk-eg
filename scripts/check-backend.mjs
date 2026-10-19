const baseUrl = String(process.env.BACKEND_URL || '').trim() || `http://127.0.0.1:${process.env.PORT || process.env.BACKEND_PORT || 4000}`;

const endpoints = [
  '/monitoring/health',
  '/api/v1/media/ping',
  '/api/v1/offers',
  '/api/v1/products',
  '/',
];

const fetchOne = async (path) => {
  const startedAt = Date.now();
  const url = new URL(path, baseUrl);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    const text = await res.text();
    const status = res.status;
    const alive = status >= 200 && status < 500 && status !== 404;
    return {
      ok: res.ok,
      status,
      alive,
      url: url.toString(),
      ms: Date.now() - startedAt,
      body: text.slice(0, 400),
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      alive: false,
      url: url.toString(),
      ms: Date.now() - startedAt,
      error: e?.message || String(e),
    };
  }
};

const run = async () => {
  const results = [];
  for (const p of endpoints) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await fetchOne(p));
  }

  const anyAlive = results.some((r) => r.alive);
  console.log(JSON.stringify({ baseUrl, anyAlive, results }, null, 2));
  process.exit(anyAlive ? 0 : 1);
};

run();
