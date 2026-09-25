import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ------------------------------------------------------------------
// Métricas personalizadas para el reporte y contraste con SLA/SLO
// ------------------------------------------------------------------
const errorRate = new Rate('errores_negocio');
const loginDuration = new Trend('duracion_login');
const searchDuration = new Trend('duracion_busqueda');

// ------------------------------------------------------------------
// Parametrización vía variables de entorno (documentadas en config.md)
// Ejecutar por defecto: k6 run k6-load-test-dummyjson.js
// Ejecutar con overrides: k6 run -e BASE_URL=... -e VUS=30 k6-load-test-dummyjson.js
// ------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'https://dummyjson.com';
const TARGET_VUS = Number(__ENV.VUS || 20);

// Usuarios de prueba provistos por la propia API de DummyJSON (docs oficiales)
const USERS = [
  { username: 'emilys', password: 'emilyspass' },
  { username: 'michaelw', password: 'michaelwpass' },
  { username: 'sophiab', password: 'sophiabpass' },
];

const SEARCH_TERMS = ['phone', 'laptop', 'shirt', 'shoes', 'watch'];

// ------------------------------------------------------------------
// Modelado de carga: perfil normal (carga sostenida), no estrés ni spike
// ------------------------------------------------------------------
export const options = {
  scenarios: {
    carga_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: TARGET_VUS }, // ramp-up
        { duration: '3m', target: TARGET_VUS },  // steady state
        { duration: '30s', target: 0 },          // ramp-down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // SLA/SLO 
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    errores_negocio: ['rate<0.01'],
    duracion_login: ['p(95)<600'],
    duracion_busqueda: ['p(95)<700'],
  },
};

// Helper de selección aleatoria (variabilidad representativa de datos)
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  // --- Step 1: Browse productos (lectura simple, sin auth) ---
  let res = http.get(`${BASE_URL}/products?limit=10`, { tags: { step: 'browse' } });
  check(res, {
    'browse: status 200': (r) => r.status === 200,
    'browse: tiene productos': (r) => JSON.parse(r.body).products.length > 0,
  }) || errorRate.add(1);
  sleep(Math.random() * 1 + 1); // think time 1-2s

  // --- Step 2: Búsqueda (parametrizada con datos representativos) ---
  const term = pick(SEARCH_TERMS);
  const searchStart = Date.now();
  res = http.get(`${BASE_URL}/products/search?q=${term}`, { tags: { step: 'search' } });
  searchDuration.add(Date.now() - searchStart);
  check(res, {
    'search: status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(Math.random() * 1.5 + 1); // think time 1-2.5s

  // --- Step 3: Login (correlación: se reutiliza el token en el step 4) ---
  const user = pick(USERS);
  const loginStart = Date.now();
  res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: user.username, password: user.password, expiresInMins: 5 }),
    { headers: { 'Content-Type': 'application/json' }, tags: { step: 'login' } }
  );
  loginDuration.add(Date.now() - loginStart);
  const loginOk = check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: recibe accessToken': (r) => !!JSON.parse(r.body).accessToken,
  });
  if (!loginOk) {
    errorRate.add(1);
    sleep(1);
    return; // sin token no continúa el flujo (evita falso error en step 4)
  }
  const token = JSON.parse(res.body).accessToken;
  sleep(0.5); // think time corto tras login

  // --- Step 4: Perfil autenticado (usa el token correlacionado) ---
  res = http.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { step: 'perfil' },
  });
  check(res, {
    'perfil: status 200': (r) => r.status === 200,
    'perfil: username coincide': (r) => JSON.parse(r.body).username === user.username,
  }) || errorRate.add(1);

  sleep(Math.random() * 1 + 1.5); // think time 1.5-2.5s antes del siguiente ciclo
}
