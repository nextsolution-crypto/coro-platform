import http from 'node:http';

const port = Number(process.env.QR_BROWSER_API_PORT || 3292);
const token = 'qr001-browser-qa-token';
let version = 1;
let codes = [
  {
    id: 'qr-browser-contact',
    slug: 'contact',
    permanentPath: '/qr/contact',
    destinationUrl: 'https://getcoro.io/contact',
    status: 'ACTIVE',
    configurationVersion: version,
    humanScanCount: 0,
    technicalRequestCount: 0,
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    changes: [],
  },
];

function respond(response, status, body) {
  response.writeHead(status, {
    'access-control-allow-origin': 'http://127.0.0.1:3291',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    'content-type': 'application/json; charset=utf-8',
    vary: 'Origin',
  });
  response.end(JSON.stringify(body));
}

async function json(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return respond(response, 204, {});
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await json(request);
    if (body.email !== 'qr001@example.invalid' || body.password !== 'Qr001-Local-Only!')
      return respond(response, 401, { message: 'Identifiants invalides.' });
    return respond(response, 200, {
      access_token: token,
      refresh_token: 'qr001-browser-refresh',
      user: {
        id: 'qr001-browser-founder',
        email: body.email,
        firstName: 'QR',
        lastName: 'Acceptance',
        role: 'SUPER_ADMIN',
      },
    });
  }
  if (request.headers.authorization !== `Bearer ${token}`)
    return respond(response, 401, { message: 'Non authentifié.' });
  if (request.method === 'GET' && url.pathname === '/api/users/me')
    return respond(response, 200, {
      id: 'qr001-browser-founder',
      email: 'qr001@example.invalid',
      firstName: 'QR',
      lastName: 'Acceptance',
      role: 'SUPER_ADMIN',
    });
  if (request.method === 'GET' && url.pathname === '/api/admin/v1/platform-authority/me')
    return respond(response, 200, {
      authorityStatus: 'ACTIVE',
      founder: true,
      grants: [],
    });
  if (request.method === 'GET' && url.pathname === '/api/qr/admin/codes')
    return respond(response, 200, codes);
  if (request.method === 'POST' && url.pathname === '/api/qr/admin/codes') {
    const body = await json(request);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(body.slug || ''))
      return respond(response, 400, { message: 'Identifiant invalide.' });
    if (codes.some((code) => code.slug === body.slug))
      return respond(response, 409, { message: 'Identifiant déjà utilisé.' });
    version += 1;
    codes = codes.concat({
      id: `qr-browser-${body.slug}`,
      slug: body.slug,
      permanentPath: `/qr/${body.slug}`,
      destinationUrl: body.destinationUrl,
      status: 'ACTIVE',
      configurationVersion: 1,
      humanScanCount: 0,
      technicalRequestCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changes: [{ id: `change-${version}`, action: 'QR_CODE_CREATED', reason: body.reason, actorUserId: 'qr001-browser-founder', createdAt: new Date().toISOString() }],
    });
    return respond(response, 201, codes.at(-1));
  }
  if (request.method === 'PATCH' && url.pathname.startsWith('/api/qr/admin/codes/')) {
    const slug = decodeURIComponent(url.pathname.split('/').at(-1));
    const body = await json(request);
    const current = codes.find((code) => code.slug === slug);
    if (!current) return respond(response, 404, { message: 'Code inconnu.' });
    if (!body.reason?.trim()) return respond(response, 400, { message: 'Une raison est obligatoire.' });
    if (body.expectedVersion !== current.configurationVersion)
      return respond(response, 409, { message: 'Rechargez la page.' });
    version += 1;
    current.destinationUrl = body.destinationUrl ?? current.destinationUrl;
    current.status = body.enabled === undefined ? current.status : body.enabled ? 'ACTIVE' : 'DISABLED';
    current.configurationVersion += 1;
    current.updatedAt = new Date().toISOString();
    current.changes.unshift({ id: `change-${version}`, action: 'QR_CODE_UPDATED', reason: body.reason, actorUserId: 'qr001-browser-founder', createdAt: current.updatedAt });
    return respond(response, 200, current);
  }
  return respond(response, 404, { message: 'Route QA inconnue.' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`QR browser API ready on http://127.0.0.1:${port}`);
});
