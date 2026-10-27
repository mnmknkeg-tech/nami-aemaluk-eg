/**
 * Prints the latest deployment logs + service variables for a Railway service.
 *
 * Usage:
 *   RW_TOKEN=<railway-api-token> node scripts/rw-logs.mjs [projectId] [environmentId] [serviceId]
 *
 * Defaults are read from logs/rw-report.json when present.
 */
import { readFileSync } from 'node:fs';

const TOKEN = process.env.RW_TOKEN;
if (!TOKEN) {
  console.error('RW_TOKEN is required (Railway API token).');
  process.exit(1);
}
const GQL = 'https://backboard.railway.com/graphql/v2';

async function gql(query, variables = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

function defaults() {
  let projectId = process.argv[2];
  let environmentId = process.argv[3];
  let serviceId = process.argv[4];
  try {
    const report = JSON.parse(readFileSync('logs/rw-report.json', 'utf8'));
    const vars = report.serviceVariables?.['nami-aemaluk-eg'] || {};
    projectId ||= vars.RAILWAY_PROJECT_ID;
    environmentId ||= vars.RAILWAY_ENVIRONMENT_ID;
    serviceId ||= vars.RAILWAY_SERVICE_ID;
  } catch {
    /* report missing, rely on argv/env */
  }
  return { projectId, environmentId, serviceId };
}

async function main() {
  const { projectId, environmentId, serviceId } = defaults();
  if (!projectId || !environmentId) {
    console.error('projectId/environmentId could not be resolved.');
    process.exit(1);
  }
  console.log('project', projectId, 'environment', environmentId, 'service', serviceId);

  const svc = await gql(
    `query($environmentId: String!) {
      environment(id: $environmentId) {
        deployments(first: 10) {
          edges {
            node {
              id status createdAt serviceId service { name } diagnosis
            }
          }
        }
      }
    }`,
    { environmentId }
  );

  const deps = svc.environment.deployments.edges.map((e) => e.node);
  for (const d of deps) {
    console.log(
      `${d.service?.name || d.serviceId} ${d.status} ${d.createdAt} id=${d.id} ${d.diagnosis || ''}`
    );
  }

  const target = serviceId ? deps.find((d) => d.serviceId === serviceId) : deps[0];
  if (!target) {
    console.error('no deployments found');
    return;
  }

  const logs = await gql(
    `query($deploymentId: String!) {
      deploymentLogs(deploymentId: $deploymentId) { message timestamp severity }
    }`,
    { deploymentId: target.id }
  );
  const rows = logs.deploymentLogs || [];
  console.log(`\n=== ${rows.length} log lines for ${target.id} ===`);
  for (const l of rows) {
    console.log(`[${l.timestamp}] ${l.severity || ''} ${l.message}`);
  }

  if (serviceId) {
    const v = await gql(
      `query($projectId: String!, $environmentId: String!, $serviceId: String!) {
        variablesForServiceDeployment(
          projectId: $projectId
          environmentId: $environmentId
          serviceId: $serviceId
        )
      }`,
      { projectId, environmentId, serviceId }
    );
    const SECRET_RE = /SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL/i;
    const out = Object.fromEntries(
      Object.entries(v.variablesForServiceDeployment || {}).map(([k, val]) => [
        k,
        SECRET_RE.test(k) ? '***' : String(val),
      ])
    );
    console.log('\n=== variables ===');
    console.log(JSON.stringify(out, null, 2));
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
