/**
 * Session conseiller en cookies httpOnly (audit M3-05).
 * Les jetons ne sont plus jamais gardés dans le navigateur : seul un repère
 * non secret indique qu'une session est ouverte. Les cookies coro_session et
 * coro_refresh sont posés et lus par l'API uniquement.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_VALUE = 'coro-app';
const MARKER = 'coro_session_active';
const LEGACY_KEYS = ['coro_token', 'coro_refresh_token'];

function stores(): Storage[] {
  if (typeof window === 'undefined') return [];
  return [window.sessionStorage, window.localStorage];
}

/** Retire les anciens jetons gardés en clair avant le passage aux cookies. */
export function purgeLegacyTokens() {
  for (const s of stores()) for (const key of LEGACY_KEYS) s.removeItem(key);
}

export function markSession() {
  purgeLegacyTokens();
  if (typeof window !== 'undefined') window.localStorage.setItem(MARKER, '1');
}

export function clearSession() {
  purgeLegacyTokens();
  for (const s of stores()) {
    s.removeItem(MARKER);
    s.removeItem('coro_user');
  }
}

export function hasSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(MARKER) === '1' || Boolean(window.localStorage.getItem('coro_user'));
}

/**
 * Ancien point d'accès au jeton, conservé pour les écrans qui testent encore
 * « une session existe ». Ne renvoie jamais de secret : l'API ignore
 * « Bearer cookie » et lit le cookie protégé.
 */
export function sessionMarker(): string | null {
  return hasSession() ? 'cookie' : null;
}

let refreshing: Promise<boolean> | null = null;

/** Renouvelle la session via le cookie coro_refresh (une seule fois à la fois). */
export function refreshSession(nativeFetch: typeof fetch = fetch): Promise<boolean> {
  if (!refreshing) {
    refreshing = nativeFetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: CSRF_VALUE },
      body: '{}',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

export function isApiUrl(url: string): boolean {
  return url.startsWith(API_URL);
}
