"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import PortalLayout from "../../../../components/PortalLayout";
import { apiDownload, apiGet, apiPost, getUser } from "../../../../store/auth";
import styles from "../../population/reviews/[reviewId]/review.module.css";

type Action = {
  id: string; reference: string | null; buildingId: string | null;
  title: string; description: string | null; status: string; priority: string;
  assignedTo: string | null; dueDate: string | null; completionComment: string | null;
  completedAt: string | null; verifiedAt: string | null; closedAt: string | null;
  verificationBlockedForCurrentUser: boolean;
};
type Evidence = { id: string; title: string; type: string; status: string; noteText?: string | null; externalUrl?: string | null; submittedAt: string };
type Verification = { id: string; attemptNumber: number; verdict: string; comment: string | null; verifiedAt: string };
const formatted = (value?: string | null) => value ? new Date(value).toLocaleString("fr-CA") : "—";
const statusLabel: Record<string, string> = { PLANNED: "Planifiée", IN_PROGRESS: "En cours", COMPLETED: "Réalisation déclarée", VERIFIED: "Vérifiée", CLOSED: "Fermée" };

export default function CorrectiveActionPage() {
  const { buildingId, actionId } = useParams<{ buildingId: string; actionId: string }>();
  const router = useRouter();
  const permissions = new Set(getUser()?.correctiveActionPermissions ?? []);
  const [action, setAction] = useState<Action | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const base = `/client-portal/corrective-actions/${actionId}`;
      const [record, proofs, history] = await Promise.all([
        apiGet(base), apiGet(`${base}/evidence`), apiGet(`${base}/verifications`),
      ]);
      const safe = record as Action;
      if (safe.buildingId !== buildingId) throw new Error("Action introuvable pour ce bâtiment.");
      setAction(safe);
      setEvidence(proofs as Evidence[]);
      setVerifications(history as Verification[]);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action indisponible.");
    } finally { setLoading(false); }
  }, [actionId, buildingId]);

  useEffect(() => { void load(); }, [load]);

  const verify = async (verdict: "ACCEPTED" | "REJECTED") => {
    const comment = window.prompt(verdict === "REJECTED" ? "Motif du rejet (obligatoire)" : "Commentaire de vérification (optionnel)");
    if (comment === null || (verdict === "REJECTED" && !comment.trim())) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/client-portal/corrective-actions/${actionId}/verify`, {
        clientIntentId: crypto.randomUUID(), verdict, comment: comment.trim() || undefined,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vérification refusée.");
    } finally { setBusy(false); }
  };

  const close = async () => {
    if (!window.confirm("Fermer cette action corrective ?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/client-portal/corrective-actions/${actionId}/close`, {});
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fermeture refusée.");
    } finally { setBusy(false); }
  };

  const download = async (evidenceId: string) => {
    try {
      const { blob, filename } = await apiDownload(`/client-portal/corrective-actions/${actionId}/evidence/${evidenceId}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Téléchargement impossible."); }
  };

  return <PortalLayout><main className={styles.page}>
    <div className={styles.actions}>
      <button type="button" onClick={() => router.back()} title="Retour"><ArrowLeft size={18} /></button>
      <button type="button" onClick={() => void load()} title="Actualiser"><RefreshCw size={18} /></button>
    </div>
    {loading ? <p>Chargement...</p> : action ? <>
      <header><span>{action.reference ?? "Action corrective"}</span><h1>{action.title}</h1><strong>{statusLabel[action.status] ?? action.status}</strong></header>
      <p>{action.description}</p>
      <div className={styles.actionMeta}><span>Priorité : {action.priority}</span><span>Responsable : {action.assignedTo || "Non assigné"}</span><span>Échéance : {formatted(action.dueDate)}</span></div>
      <section><h2>Réalisation</h2><p>{action.completionComment || "Aucun commentaire de réalisation."}</p><p>Déclarée le {formatted(action.completedAt)}</p></section>
      <section><h2>Preuves</h2>{evidence.length ? evidence.map((item) => <article key={item.id} className={styles.evidenceRow}>
        <strong>{item.title}</strong><span>{item.type} · {item.status} · {formatted(item.submittedAt)}</span>
        {item.noteText && <p>{item.noteText}</p>}
        {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">Ouvrir le lien</a>}
        {(item.type === "DOCUMENT" || item.type === "PHOTO") && <button type="button" onClick={() => void download(item.id)}>Télécharger</button>}
      </article>) : <p>Aucune preuve.</p>}</section>
      <section><h2>Vérification</h2>
        {action.status === "COMPLETED" && action.verificationBlockedForCurrentUser && <p>Cette réalisation doit être vérifiée par un autre utilisateur autorisé.</p>}
        {action.status === "COMPLETED" && permissions.has("CORRECTIVE_ACTION_VERIFY") && !action.verificationBlockedForCurrentUser && <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={() => void verify("ACCEPTED")}>ACCEPTER</button>
          <button type="button" disabled={busy} onClick={() => void verify("REJECTED")}>REJETER</button>
        </div>}
        {action.status === "VERIFIED" && permissions.has("CORRECTIVE_ACTION_CLOSE") && <button type="button" disabled={busy} onClick={() => void close()}>FERMER L&apos;ACTION</button>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <h3>Historique des vérifications</h3>{verifications.length ? verifications.map((item) => <p key={item.id}>#{item.attemptNumber} · {item.verdict} · {formatted(item.verifiedAt)}{item.comment ? ` · ${item.comment}` : ""}</p>) : <p>Aucune tentative.</p>}
      </section>
    </> : <p role="alert">{error || "Action introuvable."}</p>}
  </main></PortalLayout>;
}
