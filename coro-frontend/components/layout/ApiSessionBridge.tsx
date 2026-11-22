"use client";

import { useEffect } from "react";
import { API_URL, CSRF_HEADER, CSRF_VALUE, clearSession, isApiUrl, purgeLegacyTokens, refreshSession } from "@/lib/session";

/**
 * Toutes les requêtes fetch vers l'API partent avec le cookie de session et
 * l'en-tête anti-CSRF ; un 401 déclenche un seul renouvellement puis une
 * nouvelle tentative. Les écrans qui appellent fetch directement n'ont donc
 * rien à gérer.
 */
let installed = false;

export function installApiSessionBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  purgeLegacyTokens();
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!isApiUrl(url)) return nativeFetch(input, init);
    const build = () => {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      headers.set(CSRF_HEADER, CSRF_VALUE);
      const auth = headers.get("Authorization");
      if (auth && !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) headers.delete("Authorization");
      return { ...init, headers, credentials: "include" as RequestCredentials };
    };
    let response = await nativeFetch(input, build());
    const isAuthCall = url.startsWith(`${API_URL}/auth/`);
    if (response.status === 401 && !isAuthCall) {
      if (await refreshSession(nativeFetch)) {
        response = await nativeFetch(input, build());
      } else {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
      }
    }
    return response;
  };
}

// Installé dès le chargement du module, avant le premier appel d'un écran.
if (typeof window !== "undefined") installApiSessionBridge();

export default function ApiSessionBridge() {
  useEffect(() => {
    installApiSessionBridge();
  }, []);
  return null;
}

export { API_URL };
