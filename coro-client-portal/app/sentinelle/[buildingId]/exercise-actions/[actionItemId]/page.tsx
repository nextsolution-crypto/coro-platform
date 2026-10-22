"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import PortalLayout from "../../../../components/PortalLayout";
import { apiGet, apiPost } from "../../../../store/auth";
import styles from "./page.module.css";

type Source = {
  id: string; title: string; description: string | null; assignedTo: string | null;
  dueDate: string | null; priority: string | null; findingId: string | null;
  recommendationId: string | null; eligible: boolean; canMaterialize: boolean;
  report: { id: string; buildingId: string; status: string; publishedAt: string | null; versions: Array<{ id: string; versionNumber: number }> };
};
type LinkedAction = { id: string; buildingId: string | null; reference: string | null; status: string; assignedTo: string | null; dueDate: string | null };

export default function ExerciseActionMaterializationPage() {
  const { buildingId, actionItemId } = useParams<{ buildingId: string; actionItemId: string }>();
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [linked, setLinked] = useState<LinkedAction | null>(null);
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const record = await apiGet(`/client-portal/exercise-action-items/${actionItemId}`) as Source;
      if (record.report.buildingId !== buildingId) throw new Error("Action d'exercice introuvable pour ce bâtiment.");
      setSource(record);
      try {
        setLinked(await apiGet(`/client-portal/exercise-action-items/${actionItemId}/corrective-action`) as LinkedAction);
      } catch { setLinked(null); }
      setError(null);
    } catch (caught) {
      setSource(null);
      setLinked(null);
      setError(caught instanceof Error ? caught.message : "Action d'exercice indisponible.");
    } finally { setLoading(false); }
  }, [actionItemId, buildingId]);

  useEffect(() => { void load(); }, [load]);

  const materialize = async () => {
    if (!justification.trim()) { setError("Une justification est requise."); return; }
    setBusy(true);
    setError(null);
    try {
      const action = await apiPost(`/client-portal/exercise-action-items/${actionItemId}/corrective-action`, { justification: justification.trim() }) as LinkedAction;
      setLinked(action);
      setJustification("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Création refusée."); }
    finally { setBusy(false); }
  };

  return <PortalLayout><main className={styles.page}>
    <nav className={styles.navigation} aria-label="Navigation action d'exercice">
      <button type="button" className={styles.linkButton} onClick={() => router.back()}><ArrowLeft size={18} /> Retour</button>
      <button type="button" className={styles.linkButton} onClick={() => void load()}><RefreshCw size={18} /> Actualiser</button>
    </nav>
    {loading ? <p>Chargement...</p> : source ? <>
      <header className={styles.header}>
        <span className={styles.eyebrow}>ACTION ISSUE D'UN EXERCICE</span>
        <h1>{source.title}</h1>
        {source.description && <p>{source.description}</p>}
        <dl className={styles.meta}>
          <div><dt>Rapport</dt><dd>Version publiée {source.report.versions[0]?.versionNumber ?? "—"}</dd></div>
          <div><dt>Priorité</dt><dd>{source.priority ?? "Non définie"}</dd></div>
          <div><dt>Responsable proposé</dt><dd>{source.assignedTo ?? "Non assigné"}</dd></div>
          <div><dt>Échéance</dt><dd>{source.dueDate ? new Date(source.dueDate).toLocaleDateString("fr-CA") : "Aucune"}</dd></div>
        </dl>
      </header>

      <section className={styles.card} aria-labelledby="continuity-title">
        <h2 id="continuity-title">Continuité de l'action corrective</h2>
        {linked ? <div className={styles.linked}>
          <CheckCircle2 aria-hidden="true" />
          <div><strong>Action corrective liée</strong><p>{linked.reference ?? linked.id} · {linked.status}</p></div>
          <Link className={styles.primary} href={`/sentinelle/${buildingId}/corrective-actions/${linked.id}`}>Ouvrir l'action</Link>
        </div> : <>
          <p>Créez explicitement une action corrective canonique. La publication du rapport ne réalise ni ne ferme automatiquement cette action.</p>
          {!source.eligible && <p className={styles.notice}>Le rapport doit être publié avant la matérialisation.</p>}
          {!source.canMaterialize && <p className={styles.notice}>Vous ne disposez pas de la permission explicite de création.</p>}
          <label className={styles.field}>Justification
            <textarea value={justification} maxLength={2000} onChange={(event) => setJustification(event.target.value)} placeholder="Pourquoi cette action doit-elle être suivie dans le registre canonique?" />
          </label>
          <button className={styles.primary} type="button" disabled={busy || !source.eligible || !source.canMaterialize} onClick={() => void materialize()}>
            {busy ? "Création..." : "Créer l'action corrective"}
          </button>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </section>
    </> : <p className={styles.error} role="alert">{error ?? "Action introuvable."}</p>}
  </main></PortalLayout>;
}
