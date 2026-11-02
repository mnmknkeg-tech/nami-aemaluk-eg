import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000';
const targetShopSlug = __ENV.TARGET_SHOP_SLUG || 'demo-shop';

export const options = {
  scenarios: {
    ramp_up_and_hold: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '3m', target: 600 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<900', 'p(99)<1500'],
  },
};

function jsonGet(path) {
  const response = http.get(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
    },
    tags: {
      endpoint: path,
    },
  });

  check(response, {
    [`${path} status is < 500`]: (r) => r.status < 500,
  });

  return response;
}

export default function () {
  jsonGet('/api/health');
  jsonGet('/api/shops');
  jsonGet(`/api/shops/slug/${targetShopSlug}`);

  sleep(1);
}
