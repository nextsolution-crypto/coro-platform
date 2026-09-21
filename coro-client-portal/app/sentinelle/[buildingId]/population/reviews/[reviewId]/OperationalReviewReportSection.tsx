"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileText, RefreshCw } from "lucide-react";
import { apiDownload, apiGet, apiPost } from "../../../../../store/auth";
import { formatMoment } from "../../../../presentation.mjs";
import { buildReportFilename, canStartReportGeneration, formatReportLanguage, formatReportSize, normalizeReportResponse, reportEndpoint, reportStatusLabel } from "../reportPresentation.mjs";
import styles from "./review.module.css";

type OperationalReviewReportSummary = {
  id: string;
  reference: string;
  reviewVersion: number;
  reportVersion: number;
  format: "PDF";
  language: "FR";
  status: "GENERATING" | "FINALIZED";
  generatedAt: string;
  generatorVersion: string;
  fileSize: number | null;
  reportSha256: string | null;
  finalizedAt: string | null;
};

export default function OperationalReviewReportSection({ reviewId, canGenerate }: { reviewId: string; canGenerate: boolean }) {
  const [report, setReport] = useState<OperationalReviewReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState<"generate" | "download" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const result = normalizeReportResponse(await apiGet(reportEndpoint(reviewId))) as OperationalReviewReportSummary | null;
      setReport(result);
      setLoaded(true);
      setError(null);
      return result;
    } catch {
      setError("L'état du rapport n'a pas pu être chargé. Réessayez.");
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (report?.status !== "GENERATING") return;
    const timer = window.setInterval(() => { void refresh(); }, 4000);
    return () => window.clearInterval(timer);
  }, [report?.status, refresh]);
  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirming(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming]);

  const generate = async () => {
    if (!canStartReportGeneration(canGenerate, report, pendingRef.current)) return;
    pendingRef.current = true;
    setConfirming(false);
    setWorking("generate");
    setError(null);
    try {
      await apiPost(reportEndpoint(reviewId), {});
      await refresh();
    } catch {
      const current = await refresh();
      if (!current) setError("Le rapport n'a pas pu être généré. Réessayez.");
    } finally {
      setWorking(null);
      pendingRef.current = false;
    }
  };

  const download = async () => {
    if (working || report?.status !== "FINALIZED") return;
    setWorking("download");
    setError(null);
    try {
      const result = await apiDownload(`${reportEndpoint(reviewId)}/download`);
      const fallback = buildReportFilename(report.reference, report.reviewVersion);
      const filename = /^REX-\d{4}-\d{6}_v\d+_FR\.pdf$/.test(result.filename) ? result.filename : fallback;
      const url = URL.createObjectURL(result.blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Le rapport n'a pas pu être téléchargé. Réessayez ou communiquez avec un administrateur CORO si le problème persiste.");
    } finally {
      setWorking(null);
    }
  };

  const copyHash = async () => {
    if (!report?.reportSha256) return;
    try {
      await navigator.clipboard.writeText(report.reportSha256);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("L'empreinte n'a pas pu être copiée.");
    }
  };

  return <section className={styles.section} aria-labelledby="rex-report-title">
    <div className={styles.sectionHead}>
      <div><span className={styles.sectionTitle}>DOCUMENT OFFICIEL</span><h2 id="rex-report-title">Rapport de retour d&apos;expérience</h2></div>
      {report?.status === "FINALIZED" && <span className={styles.reportBadge}>{reportStatusLabel(report.status)}</span>}
    </div>
    {loading ? <p role="status">Chargement du rapport...</p> : !loaded ? null : report?.status === "GENERATING" ? <>
      <p className={styles.reportStatus}>{reportStatusLabel(report.status)}</p>
      <p>Le rapport est en cours de préparation.</p>
      <button type="button" className={styles.buttonSecondary} onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true" /> Actualiser</button>
    </> : report?.status === "FINALIZED" ? <>
      <p className={styles.reportReference}>{report.reference}</p>
      <dl className={styles.reportMetrics}>
        <div><dt>Version du REX</dt><dd>{report.reviewVersion}</dd></div>
        <div><dt>Version du rapport</dt><dd>{report.reportVersion}</dd></div>
        <div><dt>Langue</dt><dd>{formatReportLanguage(report.language)}</dd></div>
        <div><dt>Format</dt><dd>{report.format}</dd></div>
        <div><dt>Généré le</dt><dd>{formatMoment(report.generatedAt) ?? "Non renseigné"}</dd></div>
        <div><dt>Taille</dt><dd>{report.fileSize === null ? "Non disponible" : formatReportSize(report.fileSize)}</dd></div>
      </dl>
      {report.reportSha256 && <div className={styles.reportHash}><span>Empreinte SHA-256</span><div><code>{report.reportSha256}</code><button type="button" className={styles.buttonSecondary} onClick={() => void copyHash()} title="Copier l'empreinte SHA-256" aria-label="Copier l'empreinte SHA-256">{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</button></div></div>}
      <div className={styles.actions}><button type="button" className={styles.button} disabled={working !== null} onClick={() => void download()}><Download size={17} aria-hidden="true" /> {working === "download" ? "TÉLÉCHARGEMENT..." : "TÉLÉCHARGER LE PDF"}</button></div>
    </> : <>
      <p className={styles.reportStatus}>{reportStatusLabel(null)}</p>
      <p>Le rapport constitue la version documentaire officielle du retour d&apos;expérience finalisé.</p>
      {canGenerate && (confirming ? <div className={styles.confirmation} role="group" aria-label="Confirmer la génération du rapport">
        <p><strong>Générer le rapport officiel ?</strong></p>
        <p>Le rapport sera produit à partir du REX finalisé et conservé de manière privée dans CORO. Une fois généré, il constitue sa version documentaire officielle.</p>
        <p>Les actions correctives poursuivent leur cycle indépendamment; leur état courant n&apos;est pas incorporé au rapport historique.</p>
        <div className={styles.actions}><button ref={cancelRef} type="button" className={styles.buttonSecondary} onClick={() => setConfirming(false)}>ANNULER</button><button type="button" className={styles.button} disabled={working !== null} onClick={() => void generate()}><FileText size={16} aria-hidden="true" /> GÉNÉRER</button></div>
      </div> : <div className={styles.actions}><button type="button" className={styles.button} disabled={working !== null} onClick={() => setConfirming(true)}><FileText size={17} aria-hidden="true" /> GÉNÉRER LE RAPPORT</button></div>)}
    </>}
    {working === "generate" && <p role="status">Génération du rapport en cours...</p>}
    {error && <p className={styles.error} role="alert">{error} <button type="button" className={styles.buttonSecondary} onClick={() => void refresh()}>ACTUALISER</button></p>}
    <p className={styles.reportNote}>Ce rapport reflète le retour d&apos;expérience tel qu&apos;il a été finalisé. Le suivi des actions correctives est géré séparément dans CORO.</p>
  </section>;
}
