"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, LoaderCircle } from "lucide-react";
import { ApiError, apiGet, apiPost, getUser } from "../../../../store/auth";
import type {
  EvidenceVerification,
  PopulationEvidenceRecord,
} from "./evidenceTypes";
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
  const [integrity, setIntegrity] = useState<
    EvidenceVerification["status"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewCreating, setReviewCreating] = useState(false);
  const [reviewConfirming, setReviewConfirming] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const user = getUser();
  const canCreateReview = Boolean(
    user?.operationalReviewPermissions?.includes("REX_CREATE"),
  );

  const load = async () => {
    try {
      const result = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/operational-events/${eventId}/evidence`,
      )) as PopulationEvidenceRecord;
      setRecord(result);
      try {
        const verified = (await apiGet(
          `/client-portal/buildings/${buildingId}/population/evidence/${result.id}/verify`,
        )) as EvidenceVerification;
        setIntegrity(verified.status);
      } catch {
        setIntegrity(null);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) setRecord(null);
      else
        setError(
          caught instanceof Error
            ? caught.message
            : "Le dossier de preuve n'a pas pu etre charge.",
        );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [buildingId, eventId]);

  const loadReview = async () => {
    try {
      const result = (await apiGet(
        `/client-portal/operational-reviews/population-events/${eventId}`,
      )) as any;
      setReview(result);
      if (result) {
        setActionCount(
          (result.findings ?? []).reduce(
            (total: number, finding: any) =>
              total +
              (finding.recommendations ?? []).reduce(
                (count: number, recommendation: any) =>
                  count + (recommendation.correctiveActions?.length ?? 0),
                0,
              ),
            0,
          ),
        );
      }
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.status === 404))
        setError(
          caught instanceof Error
            ? caught.message
            : "Le retour d'experience n'a pas pu etre charge.",
        );
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    void loadReview();
  }, [buildingId, eventId]);

  const createReview = async () => {
    setReviewCreating(true);
    setError(null);
    try {
      const created = (await apiPost("/client-portal/operational-reviews", {
        title: "Retour d'experience Sentinelle Population",
        populationOperationalEventId: eventId,
        confidentiality: "BUILDING_TEAM",
      })) as any;
      router.push(`/sentinelle/${buildingId}/population/reviews/${created.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Le REX n'a pas pu etre cree.",
      );
      setReviewConfirming(false);
    } finally {
      setReviewCreating(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/operational-events/${eventId}/evidence`,
        {},
      )) as PopulationEvidenceRecord;
      setRecord(result);
      setConfirming(false);
    } catch (caught) {
      await load();
      setError(
        caught instanceof Error
          ? caught.message
          : "La generation n'a pas pu etre terminee.",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading)
    return (
      <div className={styles.entryLoading}>
        <LoaderCircle size={16} className={styles.spin} /> Verification du
        dossier...
      </div>
    );

  return (
    <div className={styles.registryEvidence} aria-live="polite">
      <div className={styles.registryEvidenceTitle}>
        <FileCheck2 size={18} />
        <strong>DOSSIER DE PREUVE</strong>
      </div>
      {record ? (
        <>
          <span>
            {record.reference} · VERSION {record.version} ·{" "}
            {integrity === "VERIFIED"
              ? "INTEGRITE VERIFIEE"
              : integrity === "MISMATCH"
                ? "DIVERGENCE"
                : integrity === "UNAVAILABLE"
                  ? "A VERIFIER"
                  : "A VERIFIER"}
          </span>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/sentinelle/${buildingId}/population/evidence/${record.id}`,
              )
            }
          >
            CONSULTER
          </button>
        </>
      ) : confirming ? (
        <div
          className={styles.confirmation}
          role="dialog"
          aria-label="Figer le dossier de preuve"
        >
          <strong>FIGER LE DOSSIER DE PREUVE ?</strong>
          <p>
            Le dossier v1 sera cree a partir des donnees historiques
            enregistrees. Une fois finalise, il ne pourra plus etre modifie.
            Cette action n'envoie aucune communication.
          </p>
          <div>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={generating}
            >
              ANNULER
            </button>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
            >
              {generating ? "GENERATION..." : "GENERER"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <span>AUCUN DOSSIER FIGE</span>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!canGenerate}
            title={
              !canGenerate ? "Permission POPULATION_PREPARE requise" : undefined
            }
          >
            GENERER LE DOSSIER DE PREUVE
          </button>
        </>
      )}
      {error && <p className={styles.inlineError}>{error}</p>}
      <div className={styles.registryEvidenceTitle}>
        <strong>RETOUR D&apos;EXPÉRIENCE</strong>
      </div>
      {reviewLoading ? (
        <span>Vérification...</span>
      ) : review ? (
        <>
          <span>
            {review.reference} ·{" "}
            {review.status === "DRAFT"
              ? "BROUILLON"
              : review.status === "IN_REVIEW"
                ? "EN REVUE"
                : "FINALISÉ"}
          </span>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/sentinelle/${buildingId}/population/reviews/${review.id}`,
              )
            }
          >
            OUVRIR LE REX
          </button>
        </>
      ) : reviewConfirming ? (
        <div
          className={styles.confirmation}
          role="dialog"
          aria-label="Créer le retour d'expérience"
        >
          <strong>CRÉER LE RETOUR D&apos;EXPÉRIENCE ?</strong>
          <p>
            Un brouillon sera créé. Aucune communication ne sera envoyée et le
            dossier de preuve ne sera pas modifié.
          </p>
          <div>
            <button
              type="button"
              onClick={() => setReviewConfirming(false)}
              disabled={reviewCreating}
            >
              ANNULER
            </button>
            <button
              type="button"
              onClick={() => void createReview()}
              disabled={reviewCreating}
            >
              {reviewCreating ? "CRÉATION..." : "CRÉER"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <span>AUCUN REX CRÉÉ</span>
          <button
            type="button"
            disabled={!canCreateReview}
            title={
              !canCreateReview ? "Permission REX_CREATE requise" : undefined
            }
            onClick={() => setReviewConfirming(true)}
          >
            CRÉER LE REX
          </button>
        </>
      )}
      <div className={styles.registryEvidenceTitle}>
        <strong>ACTIONS CORRECTIVES</strong>
      </div>
      <span>{review ? `${actionCount} action(s)` : "AUCUNE"}</span>
    </div>
  );
}
