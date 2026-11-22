/**
 * Session client en cookie protégé (audit M3-05).
 *
 * Avant : le jeton de session (7 jours) était gardé dans le localStorage du
 * navigateur, lisible par n'importe quel script de la page. Maintenant :
 * - le serveur le pose dans un cookie httpOnly (illisible en JavaScript),
 *   Secure en production, SameSite=Lax, limité au chemin de l'API ;
 * - toute requête qui modifie quelque chose avec ce cookie doit porter
 *   l'en-tête X-Requested-With: coro-portal (protection CSRF : un autre site
 *   ne peut pas ajouter cet en-tête sans passer la liste CORS) ;
 * - l'en-tête Authorization reste accepté pendant la transition (sessions
 *   ouvertes avant le déploiement).
 */
export const CLIENT_SESSION_COOKIE = 'coro_client_session';
export const CLIENT_CSRF_HEADER = 'x-requested-with';
export const CLIENT_CSRF_VALUE = 'coro-portal';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function clientSessionCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax' as const,
    path: '/api',
    maxAge: SEVEN_DAYS_MS,
  };
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim()) || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Jeton présenté : en-tête Bearer valide d'abord, sinon cookie protégé. */
export function extractClientToken(request: any): { token: string | null; viaCookie: boolean } {
  const header: string | undefined = request.headers?.authorization;
  if (header && header.startsWith('Bearer ')) {
    const value = header.slice(7).trim();
    if (value && value !== 'null' && value !== 'undefined') return { token: value, viaCookie: false };
  }
  const cookie = readCookie(request.headers?.cookie, CLIENT_SESSION_COOKIE);
  return { token: cookie, viaCookie: Boolean(cookie) };
}

export function isSafeMethod(method: string | undefined): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
}
