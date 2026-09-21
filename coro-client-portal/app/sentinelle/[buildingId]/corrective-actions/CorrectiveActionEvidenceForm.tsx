"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost, apiUpload } from "../../../store/auth";
import styles from "./action.module.css";

type EvidenceKind = "NOTE" | "LINK" | "DOCUMENT" | "PHOTO" | "SYSTEM_REFERENCE";
type EvidenceForm = {
  type: EvidenceKind;
  title: string;
  noteText: string;
  externalUrl: string;
  systemReferenceType: "POPULATION_EVIDENCE" | "EXERCISE_REPORT" | "INCIDENT";
  systemReferenceId: string;
};
const initialForm: EvidenceForm = {
  type: "NOTE", title: "", noteText: "", externalUrl: "",
  systemReferenceType: "POPULATION_EVIDENCE", systemReferenceId: "",
};

export default function CorrectiveActionEvidenceForm({ actionId, onSaved }: { actionId: string; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<EvidenceForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intent = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const update = (patch: Partial<EvidenceForm>) => {
    intent.current = null;
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const clientIntentId = intent.current ?? crypto.randomUUID();
    intent.current = clientIntentId;
    setBusy(true);
    setError(null);
    try {
      const base = `/client-portal/corrective-actions/${actionId}/evidence`;
      const title = form.title.trim();
      if (!title) throw new Error("Le titre de la preuve est requis.");
      if (form.type === "NOTE") {
        if (!form.noteText.trim()) throw new Error("Le texte de la note est requis.");
        await apiPost(`${base}/note`, { clientIntentId, title, noteText: form.noteText.trim() });
      } else if (form.type === "LINK") {
        if (!form.externalUrl.trim()) throw new Error("L'URL HTTPS est requise.");
        await apiPost(`${base}/link`, { clientIntentId, title, externalUrl: form.externalUrl.trim() });
      } else if (form.type === "SYSTEM_REFERENCE") {
        if (!form.systemReferenceId.trim()) throw new Error("L'identifiant de la référence CORO est requis.");
        await apiPost(`${base}/system-reference`, { clientIntentId, title, systemReferenceType: form.systemReferenceType, systemReferenceId: form.systemReferenceId.trim() });
      } else {
        if (!file) throw new Error("Sélectionnez un fichier.");
        const body = new FormData();
        body.append("clientIntentId", clientIntentId);
        body.append("title", title);
        body.append("type", form.type);
        body.append("file", file);
        await apiUpload(`${base}/file`, body);
      }
      await onSaved();
      intent.current = null;
      setForm(initialForm);
      setFile(null);
      titleRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La preuve n'a pas pu être ajoutée.");
    } finally { setBusy(false); }
  };

  return <form className={styles.evidenceForm} onSubmit={(event) => void submit(event)}>
    <div className={styles.formGrid}>
      <label>Type de preuve
        <select value={form.type} onChange={(event) => { update({ type: event.target.value as EvidenceKind }); setFile(null); }}>
          <option value="NOTE">Note</option><option value="DOCUMENT">Document</option><option value="PHOTO">Photo</option>
          <option value="LINK">Lien</option><option value="SYSTEM_REFERENCE">Référence CORO</option>
        </select>
      </label>
      <label>Titre
        <input ref={titleRef} required maxLength={300} value={form.title} onChange={(event) => update({ title: event.target.value })} />
      </label>
      {form.type === "NOTE" && <label className={styles.full}>Texte de la note
        <textarea required maxLength={10000} value={form.noteText} onChange={(event) => update({ noteText: event.target.value })} />
      </label>}
      {form.type === "LINK" && <label className={styles.full}>Lien HTTPS
        <input required type="url" pattern="https://.*" maxLength={2000} value={form.externalUrl} onChange={(event) => update({ externalUrl: event.target.value })} />
      </label>}
      {form.type === "SYSTEM_REFERENCE" && <>
        <label>Source CORO
          <select value={form.systemReferenceType} onChange={(event) => update({ systemReferenceType: event.target.value as EvidenceForm["systemReferenceType"] })}>
            <option value="POPULATION_EVIDENCE">Dossier de preuve Population</option><option value="EXERCISE_REPORT">Rapport d'exercice</option><option value="INCIDENT">Incident</option>
          </select>
        </label>
        <label>Identifiant de la référence
          <input required value={form.systemReferenceId} onChange={(event) => update({ systemReferenceId: event.target.value })} />
        </label>
      </>}
      {(form.type === "DOCUMENT" || form.type === "PHOTO") && <label className={styles.full}>Fichier (10 Mo maximum)
        <input required type="file" accept={form.type === "PHOTO" ? "image/jpeg,image/png,image/webp" : ".pdf,.docx,.xlsx,.txt"} onChange={(event) => { intent.current = null; setFile(event.target.files?.[0] ?? null); }} />
      </label>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button className={styles.primary} type="submit" disabled={busy}>{busy ? "AJOUT EN COURS..." : "ENREGISTRER LA PREUVE"}</button>
  </form>;
}
