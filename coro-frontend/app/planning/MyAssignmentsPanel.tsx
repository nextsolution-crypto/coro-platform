"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import api from "@/lib/api";
import type { MyAssignment, MyAssignmentsResponse } from "./types";
import { dateKey, formatClock, formatDay } from "./time";
import styles from "./planning.module.css";
import {
  MISSING_COMMITMENT_MESSAGE,
  STALE_COMMITMENT_MESSAGE,
  buildAdvisorResponsePayload,
  getCommitmentEvidence,
  isStaleCommitmentError,
} from "../bookings/booking-commitment-contract.mjs";

export default function MyAssignmentsPanel({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged: () => void;
}) {
  const [data, setData] = useState<MyAssignmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [refusing, setRefusing] = useState<MyAssignment | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage("");
    setError("");
    api
      .get<MyAssignmentsResponse>("/planning/my-assignments")
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger vos affectations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const respond = async (
    item: MyAssignment,
    status: "ACCEPTED" | "DECLINED",
  ) => {
    const evidence = getCommitmentEvidence(item, {
      projectId: item.projectId,
      activityId: item.activityId,
      siteId: item.siteId,
    });
    if (evidence.kind === "missing") {
      setError(MISSING_COMMITMENT_MESSAGE);
      return;
    }
    setBusyId(item.assignmentId);
    setError("");
    setMessage("");
    try {
      const payload = buildAdvisorResponsePayload(item, status, {
        projectId: item.projectId,
        activityId: item.activityId,
        siteId: item.siteId,
      });
      await api.post(
        `/bookings/${item.bookingId}/assignments/${item.assignmentId}/respond`,
        {
          ...payload,
          ...(status === "DECLINED" && reason.trim()
            ? { declineReason: reason.trim() }
            : {}),
        },
      );
      setData((current) =>
        current
          ? {
              ...current,
              pendingCount: current.pendingCount - 1,
              items: current.items.filter(
                (row) => row.assignmentId !== item.assignmentId,
              ),
            }
          : current,
      );
      setMessage(
        status === "ACCEPTED"
          ? "Vous avez accepté cette affectation."
          : "Vous avez refusé cette affectation.",
      );
      setRefusing(null);
      setReason("");
      onChanged();
    } catch (cause) {
      const value = axios.isAxiosError(cause)
        ? cause.response?.data?.message
        : null;
      const detail = Array.isArray(value) ? value.join(" ") : value || "";
      setError(
        isStaleCommitmentError(detail)
          ? STALE_COMMITMENT_MESSAGE
          : detail || "Cette affectation ne peut plus être traitée.",
      );
    } finally {
      setBusyId("");
    }
  };

  const count = data?.pendingCount ?? 0;
  if (!loading && data && count === 0 && !message && !error) return null;
  return (
    <section className={styles.myAssignments} aria-label="Mes affectations">
      <button
        type="button"
        className={`${styles.summaryCard} ${count ? styles.summaryCardActive : ""}`}
        onClick={() => {
          setOpen((value) => !value);
          setMessage("");
          setError("");
        }}
        aria-expanded={open}
        aria-controls="my-assignments-panel"
      >
        <strong>{loading ? "…" : count}</strong>
        <span>
          Mes affectations à confirmer{count > 0 && <em>À traiter</em>}
        </span>
      </button>
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      {error && (
        <>
          <p className={styles.error} role="alert">
            {error}
          </p>
          {(error === MISSING_COMMITMENT_MESSAGE ||
            error === STALE_COMMITMENT_MESSAGE) && (
            <button
              type="button"
              className={styles.inlineButton}
              onClick={onChanged}
            >
              Actualiser les affectations
            </button>
          )}
        </>
      )}
      {open && (
        <div id="my-assignments-panel" className={styles.actionList}>
          <div className={styles.actionListHeader}>
            <h2>Mes affectations à confirmer</h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMessage("");
                setError("");
              }}
              aria-label="Fermer mes affectations"
            >
              ×
            </button>
          </div>
          {!loading && !data?.items.length && (
            <p className={styles.compactEmpty}>
              ✓ Aucune affectation en attente.
            </p>
          )}
          <ul>
            {data?.items.map((item) => {
              const evidence = getCommitmentEvidence(item, {
                projectId: item.projectId,
                activityId: item.activityId,
                siteId: item.siteId,
              });
              return (
                <li key={item.assignmentId} className={styles.assignmentCard}>
                  <div className={styles.actionContent}>
                    <div className={styles.actionTitle}>
                      <strong>{item.title}</strong>
                      <em>{item.role}</em>
                    </div>
                    {item.activityType !== item.title && (
                      <span>{item.activityType}</span>
                    )}
                    <span>
                      {item.client}
                      {item.building ? ` · ${item.building}` : ""}
                    </span>
                    <span>{item.project}</span>
                    {evidence.kind === "governed" ? (
                      <>
                        <span>
                          Version d’engagement{" "}
                          {evidence.commitment.versionNumber} ·{" "}
                          {evidence.commitment.status}
                        </span>
                        <span>
                          {formatDay(
                            dateKey(
                              new Date(evidence.commitment.startAt),
                              item.timeZone,
                            ),
                          )}{" "}
                          ·{" "}
                          {formatClock(
                            evidence.commitment.startAt,
                            item.timeZone,
                          )}{" "}
                          · {evidence.commitment.durationMinutes} minutes
                        </span>
                      </>
                    ) : (
                      <span>
                        {formatDay(
                          dateKey(
                            new Date(item.effectiveStartUtc),
                            item.timeZone,
                          ),
                        )}{" "}
                        · {formatClock(item.effectiveStartUtc, item.timeZone)} ·{" "}
                        {item.durationMinutes} minutes
                      </span>
                    )}
                    <span>En attente de votre confirmation</span>
                    {evidence.kind === "missing" && (
                      <>
                        <span className={styles.error}>
                          {MISSING_COMMITMENT_MESSAGE}
                        </span>
                        <button
                          type="button"
                          className={styles.inlineButton}
                          onClick={onChanged}
                        >
                          Actualiser
                        </button>
                      </>
                    )}
                  </div>
                  <div className={styles.actionButtons}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={Boolean(busyId) || evidence.kind === "missing"}
                      onClick={() => respond(item, "ACCEPTED")}
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      className={styles.inlineButton}
                      disabled={Boolean(busyId) || evidence.kind === "missing"}
                      onClick={() => {
                        setRefusing(item);
                        setReason("");
                      }}
                    >
                      Refuser
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {refusing && (
        <section
          className={styles.confirmPanel}
          role="alertdialog"
          aria-label="Confirmer le refus"
        >
          <h3>Refuser cette affectation ?</h3>
          <p>
            L’affectation restera dans l’historique et le planificateur devra la
            remplacer si nécessaire.
          </p>
          <label>
            Motif facultatif
            <textarea
              rows={3}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className={styles.formActions}>
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => setRefusing(null)}
            >
              Retour
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              disabled={Boolean(busyId)}
              onClick={() => respond(refusing, "DECLINED")}
            >
              {busyId ? "Refus…" : "Refuser"}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
