import { readCookie } from '../client-portal/client-session-cookie';

/**
 * Session de l'app conseiller en cookies protégés (audit M3-05, 2e étape).
 *
 * - coro_session : jeton d'accès (15 min), cookie httpOnly limité à /api ;
 * - coro_refresh : jeton de renouvellement (90 j), httpOnly limité à
 *   /api/auth, donc envoyé seulement au renouvellement et à la déconnexion.
 * Aucun des deux n'est lisible par un script de la page. Toute requête qui
 * modifie quelque chose avec le cookie doit porter X-Requested-With: coro-app
 * (protection CSRF). L'en-tête Bearer reste accepté s'il contient un vrai
 * jeton (sessions ouvertes avant le déploiement, outils).
 */
export const ADVISOR_SESSION_COOKIE = 'coro_session';
export const ADVISOR_REFRESH_COOKIE = 'coro_refresh';
export const ADVISOR_CSRF_VALUE = 'coro-app';
const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function base() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}
export const accessCookieOptions = () => ({ ...base(), path: '/api', maxAge: FIFTEEN_MIN_MS });
export const refreshCookieOptions = () => ({ ...base(), path: '/api/auth', maxAge: NINETY_DAYS_MS });

function looksLikeJwt(value: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

export function extractAdvisorToken(request: any): { token: string | null; viaCookie: boolean } {
  const header: string | undefined = request?.headers?.authorization;
  if (header?.startsWith('Bearer ')) {
    const value = header.slice(7).trim();
    if (looksLikeJwt(value)) return { token: value, viaCookie: false };
  }
  const cookie = readCookie(request?.headers?.cookie, ADVISOR_SESSION_COOKIE);
  return { token: cookie, viaCookie: Boolean(cookie) };
}

export function readRefreshCookie(request: any): string | null {
  return readCookie(request?.headers?.cookie, ADVISOR_REFRESH_COOKIE);
}

export function advisorCsrfSatisfied(request: any): boolean {
  const method = String(request?.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  return String(request?.headers?.['x-requested-with'] || '').toLowerCase() === ADVISOR_CSRF_VALUE;
}

/** Pose les cookies et retire les jetons du corps de la réponse. */
export function applySessionCookies<T extends Record<string, any>>(res: any, result: T) {
  if (!result || typeof result !== 'object' || !result.access_token) return result;
  res.cookie(ADVISOR_SESSION_COOKIE, result.access_token, accessCookieOptions());
  if (result.refresh_token)
    res.cookie(ADVISOR_REFRESH_COOKIE, result.refresh_token, refreshCookieOptions());
  const { access_token: _a, refresh_token: _r, ...rest } = result;
  return { ...rest, session: 'cookie' };
}

export function clearSessionCookies(res: any) {
  res.clearCookie(ADVISOR_SESSION_COOKIE, { ...base(), path: '/api' });
  res.clearCookie(ADVISOR_REFRESH_COOKIE, { ...base(), path: '/api/auth' });
}
