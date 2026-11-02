export const dynamic = 'force-dynamic';
type Resolution = { destinationUrl: string; redirectStatus: 302 | 307 };
const ALLOWED_HOSTS = new Set(['getcoro.io', 'www.getcoro.io', 'app.getcoro.io', 'client.getcoro.io']);

function decodedPathname(pathname: string) {
  let decoded = pathname;
  for (let index = 0; index < 3; index += 1) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.replace(/\\/gu, '/').replace(/\/{2,}/gu, '/');
}

function safeDestination(value: string) {
  const destination = new URL(value);
  if (
    destination.protocol !== 'https:' ||
    destination.username ||
    destination.password ||
    destination.port ||
    destination.hash ||
    !ALLOWED_HOSTS.has(destination.hostname.toLowerCase())
  ) throw new Error('Unsafe QR destination');
  if (
    destination.hostname.replace(/^www\./u, '') === 'getcoro.io' &&
    decodedPathname(destination.pathname).toLowerCase().startsWith('/qr/')
  ) throw new Error('QR redirect loop');
  return destination;
}

function qrAuthorityUrl(slug: string) {
  const origin = (process.env.INTERNAL_API_URL || 'http://coro_backend:3002/api').replace(/\/+$/u, '').replace(/\/api$/iu, '');
  return `${origin}/api/qr/public/${encodeURIComponent(slug)}`;
}

async function resolve(request: Request, slug: string, method: 'GET' | 'HEAD') {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) return new Response('Code QR invalide.', { status: 404 });
  try {
    const response = await fetch(qrAuthorityUrl(slug), {
      cache: 'no-store',
      headers: { 'user-agent': request.headers.get('user-agent') ?? '', 'x-coro-original-method': method },
    });
    if (response.status === 404) return new Response('Code QR inconnu.', { status: 404 });
    if (response.status === 410) return new Response('Code QR désactivé.', { status: 410 });
    if (!response.ok) throw new Error(`QR authority returned ${response.status}`);
    const result = (await response.json()) as Resolution;
    const destination = safeDestination(result.destinationUrl);
    return new Response(null, { status: result.redirectStatus === 302 ? 302 : 307, headers: { location: destination.toString(), 'cache-control': 'no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow' } });
  } catch (error) {
    console.error('QR resolution unavailable', error);
    return new Response('Redirection temporairement indisponible.', { status: 503, headers: { 'cache-control': 'no-store, max-age=0', 'retry-after': '60' } });
  }
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return resolve(request, (await context.params).slug, 'GET');
}
export async function HEAD(request: Request, context: { params: Promise<{ slug: string }> }) {
  return resolve(request, (await context.params).slug, 'HEAD');
}
