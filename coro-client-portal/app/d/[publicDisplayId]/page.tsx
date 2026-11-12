"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "./player.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";
const SESSION_PREFIX = "coro_display_web_";

type PublicStatus = {
  available: boolean;
  activationRequired: boolean;
  location?: { label: string; floor: string };
  capability?: string;
  emergencyEligible?: boolean;
};
type Manifest = {
  capability: string;
  emergencyEligible: boolean;
  pollingSeconds: number;
  publication: null | {
    id: string;
    versionNumber: number;
    variantVersion: number;
    variantSha256: string;
    variantMimeType: string;
    contentPath: string;
  };
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "Activation ou session refusée." : "Service temporairement indisponible.");
  return response.json();
}

export default function DisplayWebPlayer({ params }: { params: Promise<{ publicDisplayId: string }> }) {
  const [publicDisplayId, setPublicDisplayId] = useState("");
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    void params.then(({ publicDisplayId: id }) => {
      setPublicDisplayId(id);
      setToken(localStorage.getItem(`${SESSION_PREFIX}${id}`) ?? "");
      void json<PublicStatus>(`${API}/display-public/d/${id}`).then(setStatus).catch((e: Error) => setError(e.message));
    });
  }, [params]);

  const sync = useCallback(async () => {
    if (!publicDisplayId || !token) return;
    try {
      const next = await json<Manifest>(`${API}/display-public/d/${publicDisplayId}/manifest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManifest(next);
      setOffline(false);
      if (!next.publication) return;
      const response = await fetch(`${API}${next.publication.contentPath}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Plan indisponible.");
      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      setContent((old) => {
        if (old) URL.revokeObjectURL(old);
        return nextUrl;
      });
      await json(`${API}/display-public/d/${publicDisplayId}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ publicationId: next.publication.id, version: next.publication.versionNumber }),
      });
    } catch (cause) {
      setOffline(true);
      if (!content) setError(cause instanceof Error ? cause.message : "Synchronisation impossible.");
    }
  }, [content, publicDisplayId, token]);

  useEffect(() => {
    void sync();
    if (!manifest?.pollingSeconds) return;
    const timer = window.setInterval(() => void sync(), Math.max(15, manifest.pollingSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [manifest?.pollingSeconds, sync]);

  async function activate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
      const publicKeyJwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
      const result = await json<{ token: string }>(`${API}/display-public/d/${publicDisplayId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, keyId: crypto.randomUUID(), publicKeyJwk }),
      });
      localStorage.setItem(`${SESSION_PREFIX}${publicDisplayId}`, result.token);
      setToken(result.token);
      setCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Activation impossible.");
    }
  }

  if (!status) return <main className={styles.shell}><p>Connexion sécurisée à CORO Display…</p></main>;
  if (!status.available) return <main className={styles.shell}><h1>CORO Display</h1><p role="alert">Cet affichage n’est pas disponible.</p></main>;
  if (!token)
    return (
      <main className={styles.shell}>
        <section className={styles.activation}>
          <p className={styles.brand}>CORO Display</p>
          <h1>Activer cet affichage</h1>
          <p>{status.location?.floor} — {status.location?.label}</p>
          <p>Cet appareil n’est pas encore activé. Entrez le code temporaire fourni par le responsable autorisé.</p>
          <form onSubmit={activate}>
            <label>Code d’activation<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></label>
            <button type="submit">Activer l’appareil</button>
          </form>
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </section>
      </main>
    );
  return (
    <main className={styles.player}>
      <header><span>CORO Display</span><span>{offline ? "Hors ligne — dernière version conservée" : "Synchronisé"}</span></header>
      {content ? <img src={content} alt="Plan d’évacuation approuvé" /> : <p>{error || "Aucun plan approuvé publié pour cet emplacement."}</p>}
      <footer>Profil {manifest?.capability ?? "WEB_VIEW_ONLY"} · urgence réelle non admissible</footer>
    </main>
  );
}
