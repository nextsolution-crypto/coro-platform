'use client';

/**
 * Passerelle de session (audit M3-05). Les écrans qui appellent l'API avec
 * fetch() directement (et non par store/auth) envoient encore
 * « Authorization: Bearer <localStorage> ». Depuis le passage au cookie
 * httpOnly, ce jeton n'existe plus : la passerelle, installée une fois,
 * ajoute à chaque appel vers l'API la session en cookie
 * (credentials: include) et l'en-tête anti-CSRF, et retire un en-tête
 * Bearer vide. Les jetons d'autres natures (écrans Display) sont conservés.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
const EMPTY_BEARER = /^Bearer\s*(null|undefined)?\s*$/i;

let installed = false;

export function installApiSessionBridge() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(API_URL)) return originalFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const authorization = headers.get('Authorization');
    if (authorization !== null && EMPTY_BEARER.test(authorization)) headers.delete('Authorization');
    if (!headers.has('X-Requested-With')) headers.set('X-Requested-With', 'coro-portal');
    return originalFetch(input, { ...init, headers, credentials: init?.credentials ?? 'include' });
  };
}

installApiSessionBridge();

export default function ApiSessionBridge() {
  return null;
}
