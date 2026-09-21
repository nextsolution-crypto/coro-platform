"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import PortalLayout from "../../../../components/PortalLayout";
import { formatDay, formatMoment, plural } from "../../../presentation.mjs";
import { apiDownload, apiGet, apiPost, apiPut, getUser } from "../../../../store/auth";
import CorrectiveActionEvidenceForm from "../CorrectiveActionEvidenceForm";
import { actionsAvailable, actionStatusLabel, evidenceTypeLabel, priorityLabel, verdictLabel } from "../actionState.mjs";
import styles from "../action.module.css";

type Action = {
  id: string; reference: string | null; buildingId: string | null;
  title: string; description: string | null; status: string; priority: string;
  assignedTo: string | null; dueDate: string | null; completionComment: string | null;
  completedAt: string | null; verifiedAt: string | null; closedAt: string | null; closureComment: string | null;
  verificationBlockedForCurrentUser: boolean;
};
type Evidence = { id: string; title: string; type: string; status: string; noteText?: string | null; externalUrl?: string | null; systemReferenceType?: string | null; submittedAt: string; withdrawnAt?: string | null; withdrawalReason?: string | null };
type Verification = { id: string; attemptNumber: number; verdict: string; comment: string | null; verifiedAt: string };
const moment = formatMoment;
const day = (value?: string | null) => formatDay(value) ?? "Aucune";

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
  const [success, setSuccess] = useState<string | null>(null);
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false);
  const [completionComment, setCompletionComment] = useState("");
  const [verificationComment, setVerificationComment] = useState("");
  const loadGeneration = useRef(0);

  const load = useCallback(async (): Promise<boolean> => {
    const generation = ++loadGeneration.current;
    try {
      const base = `/client-portal/corrective-actions/${actionId}`;
      const [record, proofs, history] = await Promise.all([
        apiGet(base), apiGet(`${base}/evidence`), apiGet(`${base}/verifications`),
      ]);
      const safe = record as Action;
      if (safe.buildingId !== buildingId) throw new Error("Action introuvable pour ce bâtiment.");
      if (generation !== loadGeneration.current) return false;
      setAction(safe);
      setEvidence(proofs as Evidence[]);
      setVerifications(history as Verification[]);
      setError(null);
      return true;
    } catch (caught) {
      if (generation !== loadGeneration.current) return false;
      setAction(null);
      setEvidence([]);
      setVerifications([]);
      setError(caught instanceof Error ? caught.message : "Action indisponible.");
      return false;
    } finally { if (generation === loadGeneration.current) setLoading(false); }
  }, [actionId, buildingId]);

  useEffect(() => {
    setAction(null);
    setEvidence([]);
    setVerifications([]);
    setLoading(true);
    void load();
  }, [load]);

  const mutate = async (work: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await work();
      if (await load()) {
        setCompletionComment("");
        setVerificationComment("");
        setEvidenceFormOpen(false);
        setSuccess(message);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L'opération a été refusée.");
    } finally { setBusy(false); }
  };

  const verify = (verdict: "ACCEPTED" | "REJECTED") => {
    if (verdict === "REJECTED" && !verificationComment.trim()) {
      setError("Un motif est requis pour rejeter la réalisation.");
      return;
    }
    void mutate(() => apiPost(`/client-portal/corrective-actions/${actionId}/verify`, {
      clientIntentId: crypto.randomUUID(), verdict, comment: verificationComment.trim() || undefined,
    }), verdict === "ACCEPTED" ? "Réalisation acceptée." : "Réalisation rejetée. L'action est de nouveau en cours.");
  };

  const close = async () => {
    if (!window.confirm("Fermer cette action corrective ?")) return;
    await mutate(() => apiPost(`/client-portal/corrective-actions/${actionId}/close`, {}), "Action fermée.");
  };

  const withdraw = async (evidenceId: string) => {
    if (!window.confirm("Retirer cette preuve ? Elle restera dans l'historique.")) return;
    const reason = window.prompt("Motif du retrait (obligatoire)");
    if (!reason?.trim()) return;
    await mutate(() => apiPost(`/client-portal/corrective-actions/${actionId}/evidence/${evidenceId}/withdraw`, { withdrawalReason: reason.trim() }), "Preuve retirée.");
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

  const available = action ? actionsAvailable(action.status, [...permissions], action.verificationBlockedForCurrentUser) : null;
  const activeEvidence = evidence.filter((item) => item.status === "ACTIVE");
  const lastVerification = verifications.at(-1);
  const correctionRequested = action?.status === "IN_PROGRESS" && lastVerification?.verdict === "REJECTED";

  return <PortalLayout><main className={styles.page}>
    <nav className={styles.navigation} aria-label="Navigation action corrective">
      <button type="button" className={styles.back} onClick={() => router.back()}><ArrowLeft size={17} /> Actions correctives</button>
      <button type="button" className={styles.refresh} onClick={() => void load()} title="Actualiser l'action"><RefreshCw size={17} /> <span>Actualiser</span></button>
    </nav>
    {loading ? <p>Chargement de l&apos;action...</p> : action && action.id === actionId && action.buildingId === buildingId && available ? <>
      <header className={styles.header}>
        <div className={styles.heading}><div><span className={styles.eyebrow}>ACTION CORRECTIVE</span><p className={styles.reference}>{action.reference ?? "Action corrective"}</p><h1>{action.title}</h1></div>
          <span className={styles.status}>{actionStatusLabel[action.status] ?? action.status}</span></div>
        {action.description && <p className={styles.description}>{action.description}</p>}
        <dl className={styles.meta}>
          <div><dt>Priorité</dt><dd>{priorityLabel[action.priority] ?? action.priority}</dd></div>
          <div><dt>Responsable</dt><dd>{action.assignedTo || "Non assigné"}</dd></div>
          <div><dt>Échéance</dt><dd>{day(action.dueDate)}</dd></div>
          <div><dt>Preuves</dt><dd>{plural(activeEvidence.length, "preuve", "preuves")}</dd></div>
        </dl>
      </header>

      {correctionRequested && <section className={styles.correction} aria-label="Correction demandée">
        <strong>CORRECTION DEMANDÉE</strong>
        <p>La dernière réalisation a été rejetée lors de la vérification. L&apos;action est retournée en cours.</p>
        {lastVerification.comment && <p><b>Motif :</b> {lastVerification.comment}</p>}
      </section>}

      <section className={styles.next} aria-labelledby="next-action-title">
        <span className={styles.eyebrow}>PROCHAINE ACTION</span>
        <h2 id="next-action-title">{action.status === "PLANNED" ? "Action à démarrer" : action.status === "IN_PROGRESS" ? "Correction en cours" : action.status === "COMPLETED" ? action.verificationBlockedForCurrentUser ? "Vérification par un autre utilisateur requise" : "Vérification requise" : action.status === "VERIFIED" ? "Réalisation vérifiée" : action.status === "CLOSED" ? "Action fermée" : "Action annulée"}</h2>
        <p>{action.status === "PLANNED" ? "Démarrez l'action pour documenter sa réalisation." : action.status === "IN_PROGRESS" ? correctionRequested ? "Apportez la correction demandée, ajoutez une preuve si nécessaire, puis soumettez de nouveau la réalisation." : "Ajoutez les preuves nécessaires puis déclarez la réalisation lorsque l'action est terminée." : action.status === "COMPLETED" ? action.verificationBlockedForCurrentUser ? "Cette réalisation doit être vérifiée par un autre utilisateur autorisé." : "La réalisation a été déclarée et doit être vérifiée par un utilisateur autorisé." : action.status === "VERIFIED" ? "La réalisation a été acceptée. L'action peut maintenant être fermée." : action.status === "CLOSED" ? "Cette action corrective a été réalisée, vérifiée et fermée." : "Cette action est en lecture seule."}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {success && <p className={styles.success} role="status">{success}</p>}
        {available.complete && <label className={styles.commentField}>Commentaire de réalisation
          <textarea maxLength={5000} value={completionComment} onChange={(event) => setCompletionComment(event.target.value)} placeholder={activeEvidence.length ? "Facultatif si une preuve active existe" : "Requis si aucune preuve active n'existe"} />
        </label>}
        {available.verify && <label className={styles.commentField}>Commentaire de vérification
          <textarea maxLength={5000} value={verificationComment} onChange={(event) => setVerificationComment(event.target.value)} placeholder="Obligatoire pour rejeter" />
        </label>}
        <div className={styles.commands}>
          {available.start && <button className={styles.primary} type="button" disabled={busy} onClick={() => void mutate(() => apiPut(`/client-portal/corrective-actions/${actionId}`, { status: "IN_PROGRESS" }), "Action démarrée.")}>DÉMARRER</button>}
          {available.addEvidence && <button className={styles.secondary} type="button" onClick={() => setEvidenceFormOpen((current) => !current)}><Plus size={17} /> AJOUTER UNE PREUVE</button>}
          {available.complete && <button className={styles.primary} type="button" disabled={busy} onClick={() => {
            if (!activeEvidence.length && !completionComment.trim()) { setError("Ajoutez une preuve active ou un commentaire de réalisation."); return; }
            void mutate(() => apiPost(`/client-portal/corrective-actions/${actionId}/complete`, { completionComment: completionComment.trim() || undefined }), "Réalisation déclarée.");
          }}>DÉCLARER RÉALISÉE</button>}
          {available.verify && <>
            <button className={styles.primary} type="button" disabled={busy} onClick={() => verify("ACCEPTED")}>ACCEPTER LA RÉALISATION</button>
            <button className={styles.danger} type="button" disabled={busy} onClick={() => verify("REJECTED")}>REJETER LA RÉALISATION</button>
          </>}
          {available.close && <button className={styles.primary} type="button" disabled={busy} onClick={() => void close()}>FERMER L&apos;ACTION</button>}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="evidence-title">
        <div className={styles.sectionHeading}><h2 id="evidence-title">PREUVES DE RÉALISATION</h2><span>{plural(activeEvidence.length, "preuve", "preuves")}</span></div>
        {evidenceFormOpen && available.addEvidence && <CorrectiveActionEvidenceForm actionId={actionId} onSaved={async () => {
          if (!(await load())) throw new Error("Preuve enregistrée, mais l'actualisation a échoué. Actualisez la page.");
          setEvidenceFormOpen(false);
          setSuccess("Preuve ajoutée.");
        }} />}
        {evidence.length ? <div className={styles.evidenceList}>{evidence.map((item) => <article key={item.id} className={styles.evidenceItem}>
          <span className={styles.type}>{evidenceTypeLabel[item.type] ?? item.type}</span>
          <div className={styles.evidenceMain}><strong>{item.title}</strong><span>Ajoutée le {moment(item.submittedAt)}{item.status === "WITHDRAWN" ? " · Retirée" : item.status === "PENDING" ? " · En attente" : ""}</span>
            {item.status === "WITHDRAWN" && item.withdrawalReason && <p>Motif du retrait : {item.withdrawalReason}</p>}
            {item.type === "NOTE" && item.noteText && <details><summary>Consulter la note</summary><p>{item.noteText}</p></details>}
            {item.type === "SYSTEM_REFERENCE" && <p>{item.systemReferenceType === "POPULATION_EVIDENCE" ? "Dossier de preuve Population" : item.systemReferenceType === "EXERCISE_REPORT" ? "Rapport d'exercice" : "Incident CORO"}</p>}
          </div>
          <div className={styles.evidenceActions}>
            {item.type === "LINK" && item.externalUrl && <a className={styles.secondary} href={item.externalUrl} target="_blank" rel="noopener noreferrer">OUVRIR LE LIEN</a>}
            {(item.type === "DOCUMENT" || item.type === "PHOTO") && <button className={styles.secondary} type="button" onClick={() => void download(item.id)}>TÉLÉCHARGER</button>}
            {available.withdrawEvidence && item.status === "ACTIVE" && <button className={styles.danger} type="button" disabled={busy} onClick={() => void withdraw(item.id)}>RETIRER</button>}
          </div>
        </article>)}</div> : <p className={styles.empty}>Aucune preuve ajoutée.</p>}
      </section>

      <section className={styles.section} aria-labelledby="completion-title"><h2 id="completion-title">RÉALISATION</h2>
        {action.completedAt ? <><p>Déclarée le {moment(action.completedAt)}</p>{action.completionComment && <p><strong>Commentaire :</strong> {action.completionComment}</p>}</> : <p className={styles.empty}>Aucune réalisation n&apos;est actuellement soumise à vérification.</p>}
        {action.closedAt && <p><strong>Fermée le {moment(action.closedAt)}.</strong>{action.closureComment ? ` ${action.closureComment}` : ""}</p>}
      </section>

      <section className={styles.section} aria-labelledby="verification-title"><h2 id="verification-title">HISTORIQUE DES VÉRIFICATIONS</h2>
        {verifications.length ? <ol className={styles.timeline}>{verifications.map((item) => <li key={item.id}>
          <strong>Tentative {item.attemptNumber} · {verdictLabel[item.verdict] ?? item.verdict}</strong><time dateTime={item.verifiedAt}>{moment(item.verifiedAt)}</time>
          {item.comment && <p>« {item.comment} »</p>}
        </li>)}</ol> : <p className={styles.empty}>Aucune tentative de vérification.</p>}
      </section>
    </> : <p className={styles.error} role="alert">{error || "Action introuvable."}</p>}
  </main></PortalLayout>;
}
