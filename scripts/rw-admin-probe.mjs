// Verify the production ADMIN_BOOTSTRAP_TOKEN without any side effects.
// Uses a NON-admin email so that even if ADMIN_BOOTSTRAP_ALLOW_RESET=true the
// service refuses with "admin_already_initialized" and never rewrites a password.
// Run: node scripts/rw-admin-probe.mjs
const B = 'https://nami-aemaluk-eg-production.up.railway.app';

const payloads = [
  {
    label: 'invalid token (control)',
    body: {
      token: '__probe_invalid__',
      email: 'probe@example.com',
      password: 'Probe123!Aa',
      name: 'Probe',
    },
  },
  {
    label: 'no token (control)',
    body: { email: 'probe@example.com', password: 'Probe123!Aa', name: 'Probe' },
  },
  {
    label: 'local .env token admin1234',
    body: {
      token: 'admin1234',
      email: 'probe@example.com',
      password: 'Probe123!Aa',
      name: 'Probe',
    },
  },
  {
    label: 'gobackend/.env placeholder token',
    body: {
      token: 'change-this-to-secure-random-string-in-production',
      email: 'probe@example.com',
      password: 'Probe123!Aa',
      name: 'Probe',
    },
  },
  {
    label: '.env.vercel.production token',
    body: {
      token: 'ray-admin-2025-01-25-secure-token-32',
      email: 'probe@example.com',
      password: 'Probe123!Aa',
      name: 'Probe',
    },
  },
];

for (const p of payloads) {
  try {
    const r = await fetch(B + '/api/v1/auth/bootstrap-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p.body),
    });
    const t = await r.text();
    console.log(String(r.status).padEnd(4), p.label.padEnd(42), t.slice(0, 220));
  } catch (e) {
    console.log('ERR ', p.label, e.message);
  }
}
