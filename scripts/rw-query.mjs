/**
 * Reports the Railway project's services, deployments and logs.
 *
 * Usage:
 *   RW_TOKEN=<railway-api-token> node scripts/rw-query.mjs [projectId] [environmentId]
 *
 * The report is written to logs/rw-report.json (git-ignored).
 */
import { writeFileSync } from 'node:fs';

// Helper: query Railway GraphQL API for project/service/deployment info.
const TOKEN = process.env.RW_TOKEN;
if (!TOKEN) {
  console.error('RW_TOKEN is required (Railway API token).');
  process.exit(1);
}
const GQL = 'https://backboard.railway.com/graphql/v2';
const OUT = process.env.RW_OUT || 'logs/rw-report.json';

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

async function main() {
  const projectId = process.argv[2];
  const environmentId = process.argv[3];

  // 1) Inspect available fields on Service / Environment / Project.
  const typeNames = ['Mutation'];
  for (const name of typeNames) {
    const data = await gql(`{ __type(name: "${name}") { fields { name } } }`);
    const fields = (data.__type?.fields || []).map((f) => f.name).join(', ');
    console.log(`${name}: ${fields}`);
  }

  if (process.env.RW_INTROSPECT === '1') {
    const m = await gql(
      `{ __type(name: "Mutation") { fields { name args { name type { name kind ofType { name } } } } } }`
    );
    for (const f of m.__type.fields) {
      if (!/variable|Variable/i.test(f.name)) continue;
      console.log(
        `Mutation.${f.name}(` +
          f.args
            .map((a) => `${a.name}: ${a.type.name || a.type.ofType?.name || a.type.kind}`)
            .join(', ') +
          ')'
      );
    }
    // Input object shapes for variableUpsert / variableDelete.
    for (const t of ['VariableUpsertInput', 'VariableDeleteInput']) {
      const d = await gql(
        `{ __type(name: "${t}") { inputFields { name type { name kind ofType { name } } } } }`
      );
      const f = (d.__type?.inputFields || [])
        .map((x) => `${x.name}: ${x.type.name || x.type.ofType?.name || x.type.kind}`)
        .join(', ');
      console.log(`${t}: ${f}`);
    }
    return;
  }
  // 2) Pull service instances + deployment URLs for the environment.
  const data = await gql(
    `query($projectId: String!, $environmentId: String!) {
      project(id: $projectId) {
        name
        services { edges { node { id name } } }
      }
      environment(id: $environmentId) {
        name
        serviceInstances {
          edges {
            node {
              serviceName
              serviceId
              domains {
                serviceDomains { domain }
                customDomains { domain }
              }
            }
          }
        }
        deployments(first: 8) {
          edges {
            node {
              id
              status
              createdAt
              url
              staticUrl
              serviceId
              service { name }
            }
          }
        }
      }
    }`,
    { projectId, environmentId }
  );
  // 3) Per-service deployment status + variables + logs.
  const svc = await gql(
    `query($environmentId: String!) {
      environment(id: $environmentId) {
        deployments(first: 20) {
          edges {
            node {
              id status createdAt url staticUrl serviceId
              service { name }
              diagnosis
            }
          }
        }
      }
    }`,
    { environmentId }
  );
  const vars = {};
  const byService = {};
  for (const edge of svc.environment.deployments.edges) {
    const n = edge.node;
    const name = n.service?.name || n.serviceId;
    (byService[name] ||= []).push({
      id: n.id,
      status: n.status,
      createdAt: n.createdAt,
      url: n.url,
      staticUrl: n.staticUrl,
      diagnosis: n.diagnosis,
    });
  }
  for (const [name, list] of Object.entries(byService)) {
    console.log(`\n--- ${name} (${list.length} deployments) ---`);
    for (const d of list) {
      console.log(`  ${d.status.padEnd(8)} ${d.createdAt} url=${d.url} static=${d.staticUrl}`);
      if (d.diagnosis) console.log(`           diagnosis: ${d.diagnosis}`);
    }
  }
  const report = { services: byService, variables: vars, serviceVariables: {}, logs: {} };

  // 4) Deployment logs + service variables for the newest deployment per service.
  const seen = new Set();
  for (const edge of svc.environment.deployments.edges) {
    const dep = edge.node;
    const name = dep.service?.name || dep.serviceId;
    if (seen.has(name)) continue;
    seen.add(name);

    try {
      const logs = await gql(
        `query($deploymentId: String!) {
          deploymentLogs(deploymentId: $deploymentId) { message timestamp severity }
        }`,
        { deploymentId: dep.id }
      );
      const rows = logs.deploymentLogs || [];
      report.logs[name] = rows
        .map((l) => `[${l.timestamp}] ${l.severity || ''} ${l.message}`)
        .join('\n');
    } catch (e) {
      report.logs[name] = `log fetch failed: ${e.message}`;
    }

    try {
      const v = await gql(
        `query($projectId: String!, $environmentId: String!, $serviceId: String!) {
          variablesForServiceDeployment(
            projectId: $projectId
            environmentId: $environmentId
            serviceId: $serviceId
          )
        }`,
        { projectId, environmentId, serviceId: dep.serviceId }
      );
      const varsForSvc = v.variablesForServiceDeployment || {};
      // Keep the real values for non-secret config keys; mask obvious secrets.
      const SECRET_RE = /SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL/i;
      report.serviceVariables[name] = Object.fromEntries(
        Object.entries(varsForSvc).map(([k, val]) => [k, SECRET_RE.test(k) ? '***' : String(val)])
      );
    } catch (e) {
      report.serviceVariables[name] = { error: e.message };
    }
  }

  writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  console.log('WROTE', OUT);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
