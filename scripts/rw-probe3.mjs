// Live probe of the Railway deployment. Run: node scripts/rw-probe3.mjs
const B = 'https://nami-aemaluk-eg-production.up.railway.app';

const paths = [
  '/monitoring/live',
  '/monitoring/ready',
  '/monitoring/health',
  '/api/v1/status',
  '/metrics',
  '/api/v1/health',
  '/nonexistent-xyz',
];

const origins = [
  'https://dashboard-web-three-kappa.vercel.app',
  'https://mnmknk.com',
  'https://www.mnmknk.com',
  'https://business-blond-psi.vercel.app',
  '"https://dashboard-web-three-kappa.vercel.app"',
  'http://localhost:3000',
  'https://evil.example.com',
];

async function probePaths() {
  console.log('=== GET probes ===');
  for (const p of paths) {
    try {
      const r = await fetch(B + p, { redirect: 'manual' });
      const t = await r.text();
      console.log(
        String(r.status).padEnd(4),
        p.padEnd(24),
        'len=' + String(t.length).padEnd(6),
        JSON.stringify(t.slice(0, 120))
      );
    } catch (e) {
      console.log('ERR ', p, e.message);
    }
  }
}

async function probeCors() {
  console.log('\n=== CORS preflight (OPTIONS /api/v1/status) ===');
  for (const o of origins) {
    try {
      const r = await fetch(B + '/api/v1/status', {
        method: 'OPTIONS',
        headers: {
          Origin: o,
          'Access-Control-Request-Method': 'GET',
        },
      });
      const acao = r.headers.get('access-control-allow-origin');
      const acac = r.headers.get('access-control-allow-credentials');
      console.log(
        String(r.status).padEnd(4),
        (o || '(none)').padEnd(52),
        'allow-origin=' + String(acao),
        'credentials=' + String(acac)
      );
    } catch (e) {
      console.log('ERR ', o, e.message);
    }
  }
}

async function probeGetWithOrigin() {
  console.log('\n=== GET /api/v1/status with Origin header ===');
  for (const o of origins) {
    try {
      const r = await fetch(B + '/api/v1/status', { headers: { Origin: o } });
      console.log(
        String(r.status).padEnd(4),
        (o || '(none)').padEnd(52),
        'allow-origin=' + String(r.headers.get('access-control-allow-origin'))
      );
    } catch (e) {
      console.log('ERR ', o, e.message);
    }
  }
}

async function main() {
  console.log('probing', B, 'at', new Date().toISOString());
  await probePaths();
  await probeCors();
  await probeGetWithOrigin();
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
