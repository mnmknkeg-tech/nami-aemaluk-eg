import { readFileSync } from 'node:fs';
const TOKEN = process.env.RW_TOKEN;
const GQL = 'https://backboard.railway.com/graphql/v2';
async function gql(query, variables = {}) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json;
}
const report = JSON.parse(readFileSync('logs/rw-report.json', 'utf8'));
const vars = report.serviceVariables['nami-aemaluk-eg'];
console.log(
  'projectId=',
  vars.RAILWAY_PROJECT_ID,
  'envId=',
  vars.RAILWAY_ENVIRONMENT_ID,
  'svcId=',
  vars.RAILWAY_SERVICE_ID
);
const tests = {
  me: `query { me { id email name } }`,
  projects: `query { projects { edges { node { id name } } } }`,
  env: `query($id:String!){ environment(id:$id){ id name } }`,
  envsOfProject: `query($id:String!){ environments(projectId:$id){ id name } }`,
  deployments: `query($id:String!){ deployments(environmentId:$id, first:5){ edges { node { id status createdAt serviceId service { name } } } } }`,
  serviceInstances: `query($e:String!){ services(environmentId:$e){ edges { node { id name } } } }`,
};
for (const [name, q] of Object.entries(tests)) {
  const varsFor = { id: vars.RAILWAY_ENVIRONMENT_ID, e: vars.RAILWAY_ENVIRONMENT_ID };
  const r = await gql(q, varsFor);
  console.log('---', name, '---');
  console.log(JSON.stringify(r).slice(0, 1200));
}
