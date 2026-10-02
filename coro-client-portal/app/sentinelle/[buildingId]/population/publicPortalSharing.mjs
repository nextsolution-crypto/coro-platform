import QRCode from "qrcode";

export const DEVELOPMENT_PUBLIC_PORTAL_URL = "http://localhost:3003";

export function resolvePublicPortalBaseUrl(configuredBase, runtimeOrigin) {
  const candidate = configuredBase?.trim() || runtimeOrigin?.trim() || DEVELOPMENT_PUBLIC_PORTAL_URL;
  const url = new URL(candidate);

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid public portal base URL');
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function buildPublicRegistrationUrl(publicSlug, configuredBase, runtimeOrigin) {
  const slug = publicSlug.trim();
  if (!slug) return '';

  const base = resolvePublicPortalBaseUrl(configuredBase, runtimeOrigin);
  return new URL(`/population/${encodeURIComponent(slug)}`, base).toString();
}

export async function createPublicPortalQr(publicUrl, render = QRCode.toString) {
  if (!publicUrl) throw new Error('Public URL is required');
  const svg = await render(publicUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
  return { payload: publicUrl, svg };
}

export async function copyPublicPortalUrl(publicUrl, writeText) {
  if (!publicUrl) throw new Error('Public URL is required');
  const copy = writeText ?? globalThis.navigator?.clipboard?.writeText?.bind(globalThis.navigator.clipboard);
  if (!copy) throw new Error('Clipboard is unavailable');
  await copy(publicUrl);
}
