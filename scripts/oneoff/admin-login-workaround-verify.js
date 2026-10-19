// One-off: verify the no-deploy workaround for the admin guard on the LIVE site.
// The shipped middleware looks for a cookie named exactly `ray_session`, while
// the API scopes the cookie it sets as `ray_session-DASHBOARD`. Creating a
// `ray_session` cookie from the page (plus the real tokens in localStorage)
// lets an authenticated admin reach /admin/* until the fixed build is deployed.
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.TARGET_URL || 'https://dashboard-web-three-kappa.vercel.app';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

function resolveChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = `${process.env.USERPROFILE}\\AppData\\Local\\ms-playwright`;
  for (const dir of ['chromium-1228', 'chromium-1193']) {
    const p = `${root}\\${dir}\\chrome-win64\\chrome.exe`;
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const WORKAROUND = `(async()=>{
  const r = await fetch('/api/v1/auth/login',{method:'POST',
    headers:{'Content-Type':'application/json','X-App-Scope':'dashboard'},
    credentials:'include',
    body:JSON.stringify({email:'${EMAIL}',password:'${PASSWORD}'})}).then(x=>x.json());
  if(!r||!r.data||!r.data.token){throw new Error('login failed: '+JSON.stringify(r).slice(0,150));}
  localStorage.setItem('ray_dashboard_token', r.data.token.accessToken);
  localStorage.setItem('ray_dashboard_user', JSON.stringify(r.data.user));
  document.cookie='ray_session='+r.data.token.refreshToken+'; path=/; Secure; SameSite=Lax';
  location.href='/admin/dashboard';
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: resolveChrome() });
  const page = await browser.newPage();
  const notes = [];
  page.on('pageerror', (e) => notes.push('PAGEERROR: ' + e.message.slice(0, 200)));

  await page.goto(`${BASE}/admin/gate`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  notes.push(`start url: ${page.url()}`);

  await page.evaluate(WORKAROUND).catch((e) => notes.push('evaluate error: ' + e.message));
  await page.waitForTimeout(9000);

  notes.push(`final url: ${page.url()}`);
  notes.push(
    'cookies: ' +
      JSON.stringify((await page.context().cookies()).map((c) => c.name))
  );
  notes.push(
    'body: ' + (await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 220)))
  );
  console.log(notes.join('\n'));
  await page
    .screenshot({ path: 'scripts/browser-test-out/admin-workaround.png', timeout: 15000 })
    .catch(() => console.log('(screenshot skipped)'));
  await browser.close();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
