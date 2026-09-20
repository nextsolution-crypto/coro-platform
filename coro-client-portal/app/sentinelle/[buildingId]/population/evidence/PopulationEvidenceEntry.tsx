"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, LoaderCircle } from "lucide-react";
import { ApiError, apiGet, apiPost } from "../../../../store/auth";
import type { EvidenceVerification, PopulationEvidenceRecord } from "./evidenceTypes";
import styles from "./evidence.module.css";

export default function PopulationEvidenceEntry({
  buildingId,
  eventId,
  canGenerate,
}: {
  buildingId: string;
  eventId: string;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<PopulationEvidenceRecord | null>(null);
  const [integrity, setIntegrity] = useState<EvidenceVerification["status"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const result = (await apiGet(`/client-portal/buildings/${buildingId}/population/operational-events/${eventId}/evidence`)) as PopulationEvidenceRecord;
      setRecord(result);
      try {
        const verified = (await apiGet(`/client-portal/buildings/${buildingId}/population/evidence/${result.id}/verify`)) as EvidenceVerification;
        setIntegrity(verified.status);
      } catch {
        setIntegrity(null);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) setRecord(null);
      else setError(caught instanceof Error ? caught.message : "Le dossier de preuve n'a pas pu etre charge.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [buildingId, eventId]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = (await apiPost(`/client-portal/buildings/${buildingId}/population/operational-events/${eventId}/evidence`, {})) as PopulationEvidenceRecord;
      setRecord(result);
      setConfirming(false);
    } catch (caught) {
      await load();
      setError(caught instanceof Error ? caught.message : "La generation n'a pas pu etre terminee.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className={styles.entryLoading}><LoaderCircle size={16} className={styles.spin} /> Verification du dossier...</div>;

  return (
    <div className={styles.registryEvidence} aria-live="polite">
      <div className={styles.registryEvidenceTitle}><FileCheck2 size={18} /><strong>DOSSIER DE PREUVE</strong></div>
      {record ? (
        <>
          <span>{record.reference} · VERSION {record.version} · {integrity === "VERIFIED" ? "INTEGRITE VERIFIEE" : integrity === "MISMATCH" ? "DIVERGENCE" : integrity === "UNAVAILABLE" ? "A VERIFIER" : "A VERIFIER"}</span>
          <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/population/evidence/${record.id}`)}>CONSULTER</button>
        </>
      ) : confirming ? (
        <div className={styles.confirmation} role="dialog" aria-label="Figer le dossier de preuve">
          <strong>FIGER LE DOSSIER DE PREUVE ?</strong>
          <p>Le dossier v1 sera cree a partir des donnees historiques enregistrees. Une fois finalise, il ne pourra plus etre modifie. Cette action n'envoie aucune communication.</p>
          <div><button type="button" onClick={() => setConfirming(false)} disabled={generating}>ANNULER</button><button type="button" onClick={() => void generate()} disabled={generating}>{generating ? "GENERATION..." : "GENERER"}</button></div>
        </div>
      ) : (
        <>
          <span>AUCUN DOSSIER FIGE</span>
          <button type="button" onClick={() => setConfirming(true)} disabled={!canGenerate} title={!canGenerate ? "Permission POPULATION_PREPARE requise" : undefined}>GENERER LE DOSSIER DE PREUVE</button>
        </>
      )}
      {error && <p className={styles.inlineError}>{error}</p>}
    </div>
  );
}
