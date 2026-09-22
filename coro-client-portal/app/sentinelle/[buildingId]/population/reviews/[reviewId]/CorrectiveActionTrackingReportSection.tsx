"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileText, RefreshCw } from "lucide-react";
import { apiDownload, apiGet, apiPost } from "../../../../../store/auth";
import { formatMoment } from "../../../../presentation.mjs";
import { deriveTrackingView, parseTrackingList, trackingActionCount, trackingEndpoint, trackingFilename, trackingFileSize, trackingStatusLabel, trackingVersion } from "../trackingPresentation.mjs";
import styles from "./review.module.css";

type CorrectiveActionTrackingReportSummary = {
  reportVersion: number;
  snapshotAt: string;
  status: "SNAPSHOT_READY" | "GENERATING" | "FINALIZED";
  actionCount: number;
  generatedAt: string | null;
  fileSize: number | null;
  reportSha256: string | null;
  language: "FR" | "EN";
  format: "PDF";
};

const storageKey = (reviewId: string) => `coro:corrective-action-tracking-intent:${reviewId}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readIntent(reviewId: string) {
  try { const value = sessionStorage.getItem(storageKey(reviewId)); return value && uuidPattern.test(value) ? value : null; }
  catch { return null; }
}
function saveIntent(reviewId: string, value: string | null) {
  try { if (value) sessionStorage.setItem(storageKey(reviewId), value); else sessionStorage.removeItem(storageKey(reviewId)); }
  catch { /* L'intention reste en mémoire pour la session active. */ }
}

export default function CorrectiveActionTrackingReportSection({ reviewId, reference, canGenerate }: { reviewId: string; reference: string; canGenerate: boolean }) {
  const [reports, setReports] = useState<CorrectiveActionTrackingReportSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"create" | "materialize" | "download" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);
  const intentRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const pollStartedRef = useRef<number | null>(null);
  const { latest, latestFinalized, history } = deriveTrackingView(reports) as { latest: CorrectiveActionTrackingReportSummary | null; latestFinalized: CorrectiveActionTrackingReportSummary | null; history: CorrectiveActionTrackingReportSummary[] };
  const endpoint = trackingEndpoint(reviewId);

  const refresh = useCallback(async () => {
    try {
      const result = parseTrackingList(await apiGet(trackingEndpoint(reviewId))) as CorrectiveActionTrackingReportSummary[];
      if (!mountedRef.current) return;
      setReports(result);
      setLoaded(true);
      setError(null);
    } catch {
      if (mountedRef.current) setError("Les états de suivi n'ont pas pu être chargés. Actualisez pour réessayer.");
    } finally { if (mountedRef.current) setLoading(false); }
  }, [reviewId]);

  useEffect(() => {
    mountedRef.current = true;
    intentRef.current = readIntent(reviewId);
    void Promise.resolve().then(refresh);
    return () => { mountedRef.current = false; };
  }, [reviewId, refresh]);
  useEffect(() => {
    if (latest?.status !== "GENERATING" || pollExpired) { pollStartedRef.current = null; return; }
    if (pollStartedRef.current === null) pollStartedRef.current = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - (pollStartedRef.current ?? Date.now()) > 120000) { setPollExpired(true); return; }
      void refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [latest?.status, pollExpired, refresh]);
  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirming(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming]);

  const materialize = async (version: number) => {
    if (!canGenerate || pendingRef.current) return;
    pendingRef.current = true;
    setWorking("materialize");
    setError(null);
    try { await apiPost(`${endpoint}/${version}/materialize`, {}); await refresh(); }
    catch { await refresh(); if (mountedRef.current) setError("Le rapport n'a pas pu être généré. Terminez la génération pour réessayer."); }
    finally { if (mountedRef.current) setWorking(null); pendingRef.current = false; }
  };

  const create = async () => {
    if (!canGenerate || !loaded || pendingRef.current || (latest && latest.status !== "FINALIZED")) return;
    pendingRef.current = true;
    setConfirming(false);
    setWorking("create");
    setError(null);
    const intent = intentRef.current ?? crypto.randomUUID();
    intentRef.current = intent;
    saveIntent(reviewId, intent);
    try {
      const created = await apiPost(endpoint, { clientIntentId: intent }) as { reportVersion?: number; status?: string };
      if (!Number.isSafeInteger(created?.reportVersion) || !created.reportVersion || created.reportVersion < 1) throw new Error("Réponse de création invalide");
      const version = created.reportVersion;
      await refresh();
      if (created.status === "SNAPSHOT_READY") {
        pendingRef.current = false;
        await materialize(version);
      }
      intentRef.current = null;
      saveIntent(reviewId, null);
    } catch {
      await refresh();
      if (mountedRef.current) setError("L'état de suivi n'a pas pu être généré. Réessayez avec la même demande.");
    } finally { if (mountedRef.current) setWorking(null); pendingRef.current = false; }
  };

  const download = async (item: CorrectiveActionTrackingReportSummary) => {
    if (working || item.status !== "FINALIZED") return;
    setWorking("download");
    setError(null);
    try {
      const result = await apiDownload(`${endpoint}/${item.reportVersion}/download`);
      if (result.blob.type !== "application/pdf" || result.blob.size === 0) throw new Error("PDF invalide");
      const fallback = trackingFilename(reference, item.reportVersion, item.language);
      const filename = result.filename === fallback ? result.filename : fallback;
      const url = URL.createObjectURL(result.blob);
      try { const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); }
      finally { URL.revokeObjectURL(url); }
    } catch { setError("Le rapport n'a pas pu être téléchargé. Réessayez ou communiquez avec un administrateur CORO si le problème persiste."); }
    finally { setWorking(null); }
  };

  const copyHash = async (hash: string) => {
    try { await navigator.clipboard.writeText(hash); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError("L'empreinte n'a pas pu être copiée."); }
  };

  const details = (item: CorrectiveActionTrackingReportSummary) => <>
    <strong className={styles.reportReference}>{trackingVersion(item.reportVersion)}</strong>
    <p className={styles.reportStatus}>{trackingStatusLabel(item.status)}</p>
    <dl className={styles.reportMetrics}>
      <div><dt>Situation au</dt><dd>{formatMoment(item.snapshotAt) ?? "Non renseigné"}</dd></div>
      <div><dt>Actions</dt><dd>{trackingActionCount(item.actionCount)}</dd></div>
      {item.status === "FINALIZED" && <><div><dt>Généré le</dt><dd>{formatMoment(item.generatedAt) ?? "Non renseigné"}</dd></div><div><dt>Taille</dt><dd>{trackingFileSize(item.fileSize)}</dd></div><div><dt>Format</dt><dd>{item.format} · {item.language}</dd></div></>}
    </dl>
    {item.status === "FINALIZED" && item.reportSha256 && <div className={styles.reportHash}><span>Empreinte SHA-256</span><div><code>{item.reportSha256}</code><button type="button" className={styles.buttonSecondary} aria-label="Copier l'empreinte SHA-256" title="Copier l'empreinte SHA-256" onClick={() => void copyHash(item.reportSha256!)}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</button>{copied && <span role="status">Copié</span>}</div></div>}
    <div className={styles.actions}>
      {item.status === "FINALIZED" && <button type="button" className={styles.button} disabled={working !== null} onClick={() => void download(item)}><Download size={16} aria-hidden="true" />{working === "download" ? "TÉLÉCHARGEMENT..." : "TÉLÉCHARGER LE PDF"}</button>}
      {item.status === "SNAPSHOT_READY" && canGenerate && <button type="button" className={styles.button} disabled={working !== null} onClick={() => void materialize(item.reportVersion)}><FileText size={16} aria-hidden="true" />TERMINER LA GÉNÉRATION</button>}
    </div>
  </>;

  return <section className={styles.section} aria-labelledby="tracking-title">
    <div className={styles.sectionHead}><div><span className={styles.sectionTitle}>DOCUMENT DE SUIVI</span><h2 id="tracking-title">Suivi des actions correctives</h2></div></div>
    {loading && !loaded ? <p role="status">Chargement des états de suivi...</p> : !loaded ? null : !latest ? <><p className={styles.reportStatus}>Aucun état de suivi généré</p><p>Un état de suivi permet de conserver une situation datée de l&apos;avancement des actions correctives liées à ce REX.</p></> : <>
      <p className={styles.sectionTitle}>ÉTAT LE PLUS RÉCENT</p>{details(latest)}
      {latest.status === "GENERATING" && <><p role="status">Génération du rapport en cours...</p>{pollExpired && <p>Le suivi automatique est interrompu. Actualisez pour vérifier l&apos;état.</p>}<button type="button" className={styles.buttonSecondary} onClick={() => { setPollExpired(false); void refresh(); }}><RefreshCw size={16} aria-hidden="true" />ACTUALISER</button></>}
      {latest.status !== "FINALIZED" && latestFinalized && <div className={styles.trackingPrevious}><h3>Dernier rapport disponible</h3>{details(latestFinalized)}</div>}
      {history.length > 0 && <div className={styles.trackingHistory}><h3>États antérieurs</h3>{history.filter((item) => item.reportVersion !== latestFinalized?.reportVersion || latest.status === "FINALIZED").map((item) => <div key={item.reportVersion} className={styles.trackingHistoryItem}>{details(item)}</div>)}</div>}
    </>}
    {loaded && canGenerate && (!latest || latest.status === "FINALIZED") && (confirming ? <div className={styles.confirmation} role="group" aria-label="Confirmer la création de l'état de suivi"><p><strong>{intentRef.current ? "Reprendre la demande de création ?" : latest ? "Créer un nouvel état de suivi ?" : "Créer le premier état de suivi ?"}</strong></p><p>{intentRef.current ? "La réponse précédente est incertaine. CORO réutilisera la même demande sans créer un doublon." : "Une situation des actions correctives sera enregistrée à la date et à l'heure actuelles. Elle restera conservée même si les actions évoluent ensuite."}</p><div className={styles.actions}><button ref={cancelRef} type="button" className={styles.buttonSecondary} onClick={() => { setConfirming(false); openRef.current?.focus(); }}>ANNULER</button><button type="button" className={styles.button} disabled={working !== null} onClick={() => void create()}>{intentRef.current ? "RÉESSAYER" : "CRÉER L'ÉTAT"}</button></div></div> : <div className={styles.actions}><button ref={openRef} type="button" className={latest ? styles.buttonSecondary : styles.button} disabled={working !== null} onClick={() => setConfirming(true)}><FileText size={16} aria-hidden="true" />{intentRef.current ? "REPRENDRE LA DEMANDE" : latest ? "GÉNÉRER UN NOUVEL ÉTAT" : "GÉNÉRER LE PREMIER ÉTAT"}</button></div>)}
    {working && <p role="status">{working === "create" ? "Enregistrement de la situation..." : working === "materialize" ? "Génération du rapport en cours..." : "Téléchargement du rapport..."}</p>}
    {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" className={styles.buttonSecondary} onClick={() => void refresh()}>ACTUALISER</button></div>}
    <p className={styles.reportNote}>Chaque état de suivi constitue une situation datée. Les actions peuvent évoluer après sa génération sans modifier les états précédents.</p>
  </section>;
}
