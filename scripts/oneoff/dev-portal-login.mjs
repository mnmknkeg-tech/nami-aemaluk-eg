const baseUrl = String(process.env.BACKEND_URL || '').trim() || `http://127.0.0.1:${process.env.PORT || process.env.BACKEND_PORT || 4000}`;

const run = async () => {
  const url = new URL('/api/v1/portal/auth/dev-portal-login', baseUrl);
  try {
    const res = await fetch(url, { method: 'POST', headers: { accept: 'application/json' } });
    const body = await res.text();
    let json = null;
    try { json = JSON.parse(body); } catch (e) { /* ignore */ }

    console.log('Request URL:', url.toString());
    console.log('Status:', res.status);
    if (json && json.access_token) {
      console.log('\n✅ Dev portal token:');
      console.log(json.access_token);
      console.log('\nOwner:');
      console.log(JSON.stringify(json.owner, null, 2));
      console.log('\nTip: set the cookie `portal_session` or use `Authorization` header if your client accepts it.');
      process.exit(0);
    }

    console.log('\nResponse body:');
    console.log(body.slice(0, 2000));
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    console.error('Request failed:', err?.message || String(err));
    process.exit(1);
  }
};

run();
