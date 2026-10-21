/**
 * Applies environment-variable fixes to the production Railway service and
 * triggers a redeploy.
 *
 * Usage:
 *   RW_TOKEN=<railway-api-token> node scripts/rw-fix.mjs [fix|introspect-redeploy]
 *
 * The token comes from the environment; it is never stored in the repo.
 */

const TOKEN = process.env.RW_TOKEN;
if (!TOKEN) {
  console.error('RW_TOKEN is required (Railway API token).');
  process.exit(1);
}

const GQL = 'https://backboard.railway.com/graphql/v2';

const PROJECT_ID = process.env.RW_PROJECT_ID || '69091842-0b1e-4181-acd1-ac86b2305c48';
const ENVIRONMENT_ID = process.env.RW_ENVIRONMENT_ID || '51e1fb48-9987-4147-886b-e30eab1d5ee8';
const SERVICE_ID = process.env.RW_SERVICE_ID || 'a8154399-5020-4bee-a92c-1a209c153625';

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
  const mode = process.argv[2] || 'fix';

  if (mode === 'introspect-redeploy') {
    const m = await gql(
      `{ __type(name: "Mutation") { fields { name args { name type { name kind ofType { name } } } } } }`
    );
    for (const name of ['serviceInstanceRedeploy', 'serviceInstanceDeploy']) {
      const f = m.__type.fields.find((x) => x.name === name);
      if (f) {
        console.log(
          `${name}(${f.args.map((a) => `${a.name}: ${a.type.name || a.type.ofType?.name || a.type.kind}`).join(', ')})`
        );
      }
    }
    return;
  }

  // === FIX: Remove quotes from env vars and correct values ===
  const fixes = [
    { name: 'FRONTEND_APP_URL', value: 'https://dashboard-web-three-kappa.vercel.app' },
    {
      name: 'CORS_ORIGIN',
      value:
        'https://mnmknk.com,https://www.mnmknk.com,https://business-blond-psi.vercel.app,https://dashboard-web-three-kappa.vercel.app',
    },
    { name: 'NEXT_PUBLIC_BACKEND_URL', value: 'https://nami-aemaluk-eg-production.up.railway.app' },
    { name: 'VITE_API_URL', value: 'https://nami-aemaluk-eg-production.up.railway.app/api/v1' },
    { name: 'NODE_ENV', value: 'production' },
  ];

  console.log('Applying Railway env var fixes...');
  for (const { name, value } of fixes) {
    try {
      await gql(`mutation($input: VariableUpsertInput!) { variableUpsert(input: $input) }`, {
        input: {
          environmentId: ENVIRONMENT_ID,
          name,
          projectId: PROJECT_ID,
          serviceId: SERVICE_ID,
          value,
          skipDeploys: false,
        },
      });
      console.log(`  ✓ ${name}=${value}`);
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`);
    }
  }

  // === Redeploy the gobackend service ===
  console.log('\nRedeploying gobackend service...');
  let redeployed = false;
  try {
    const result = await gql(
      `mutation($environmentId: String!, $serviceId: String!) { serviceInstanceRedeploy(environmentId: $environmentId, serviceId: $serviceId) }`,
      { environmentId: ENVIRONMENT_ID, serviceId: SERVICE_ID }
    );
    console.log('  ✓ serviceInstanceRedeploy:', JSON.stringify(result));
    redeployed = true;
  } catch (e) {
    console.error(`  ✗ serviceInstanceRedeploy failed: ${e.message}`);
  }

  if (!redeployed) {
    try {
      const result = await gql(
        `mutation($environmentId: String!, $serviceId: String!) { serviceInstanceDeploy(environmentId: $environmentId, serviceId: $serviceId) }`,
        { environmentId: ENVIRONMENT_ID, serviceId: SERVICE_ID }
      );
      console.log('  ✓ serviceInstanceDeploy:', JSON.stringify(result));
      redeployed = true;
    } catch (e2) {
      console.error(`  ✗ serviceInstanceDeploy also failed: ${e2.message}`);
    }
  }

  if (!redeployed) {
    console.log(
      '\nNOTE: variableUpsert with skipDeploys:false should have triggered a redeploy automatically.'
    );
    console.log('Check Railway dashboard for deployment status.');
  }

  console.log(
    '\nDone. Verify: curl https://nami-aemaluk-eg-production.up.railway.app/monitoring/ready'
  );
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
