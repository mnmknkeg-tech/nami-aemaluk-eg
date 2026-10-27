import { readFileSync } from 'node:fs';
const TOKEN = process.env.RW_TOKEN;
const GQL = 'https://backboard.railway.com/graphql/v2';
async function gql(query, variables = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return await res.json();
}
const report = JSON.parse(readFileSync('logs/rw-report.json', 'utf8'));
const sv = report.serviceVariables['nami-aemaluk-eg'];
const P = sv.RAILWAY_PROJECT_ID,
  E = sv.RAILWAY_ENVIRONMENT_ID,
  S = sv.RAILWAY_SERVICE_ID;
const q1 = await gql(
  `query($projectId:String!,$environmentId:String!,$serviceId:String!){ variablesForServiceDeployment(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId) }`,
  { projectId: P, environmentId: E, serviceId: S }
);
console.log('=== variablesForServiceDeployment ===');
if (q1.errors) console.log('ERR', JSON.stringify(q1.errors).slice(0, 400));
else {
  const v = q1.data.variablesForServiceDeployment || {};
  for (const k of [
    'FRONTEND_APP_URL',
    'CORS_ORIGIN',
    'DATABASE_URL',
    'APP_ENV',
    'NODE_ENV',
    'METRICS_TOKEN',
    'ADMIN_IP_ALLOWLIST',
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'DB_MIGRATE_ON_BOOT',
  ])
    console.log(k, '=>', JSON.stringify(v[k]));
  console.log('--- ALL KEYS ---');
  console.log(Object.keys(v).sort().join(' '));
}
const q2 = await gql(
  `query($deploymentId:String!){ deploymentLogs(deploymentId:$deploymentId){ message timestamp severity } }`,
  { deploymentId: 'a8154399-5020-4bee-a92c-1a209c153625' }
);
console.log('\n=== deploymentLogs (success deploy) ===');
if (q2.errors) console.log('ERR', JSON.stringify(q2.errors).slice(0, 400));
else {
  const L = q2.data.deploymentLogs || [];
  console.log('lines:', L.length);
  L.slice(-60).forEach((l) =>
    console.log(`[${l.timestamp}] ${l.severity || ''} ${String(l.message).slice(0, 260)}`)
  );
}
