"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import { apiGet } from "../../../store/auth";
import styles from "../../network.module.css";

type Metric = {
  active?: number;
  resolved?: number;
  present?: number | null;
  required?: number;
  evidence?: number;
  open?: number;
  overdue?: number;
  completed?: number;
  closed?: number;
  freshness: string;
  observedAt?: string | null;
  items?: Array<{
    id: string;
    type: string;
    status: string;
    triggeredAt: string;
    occupancySnapshotCount: number | null;
  }>;
};
type CorrectiveActionItem = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  priority: string;
  responsible?: string | null;
  dueDate?: string | null;
  overdue: boolean;
  evidenceCount: number;
  verificationCount: number;
  source: "INCIDENT" | "EXERCISE" | "AUDIT_REVIEW" | "DIRECT";
};
type BuildingDetail = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  incidentSummary: Metric;
  occupancySummary: Metric;
  documentSummary: Metric;
  actionSummary: Omit<Metric, "items"> & { items?: CorrectiveActionItem[] };
};

export default function NetworkBuildingPage() {
  const { id } = useParams<{ id: string }>();
  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiGet(`/client-portal/network/buildings/${id}`)
      .then((result) => {
        if (active) setBuilding(result);
      })
      .catch(() => {
        if (active)
          setError("Ce bâtiment est introuvable ou hors de votre périmètre.");
      });
    return () => {
      active = false;
    };
  }, [id]);

  const metrics = building
    ? ([
        [
          "Incidents actifs",
          building.incidentSummary.active ?? 0,
          building.incidentSummary,
        ],
        [
          "Occupants présents",
          building.occupancySummary.present ?? "—",
          building.occupancySummary,
        ],
        [
          "Documents conformes",
          `${building.documentSummary.evidence ?? 0}/${building.documentSummary.required ?? 0}`,
          building.documentSummary,
        ],
        [
          "Actions ouvertes",
          building.actionSummary.open ?? 0,
          building.actionSummary,
        ],
      ] as const)
    : [];

  return (
    <PortalLayout>
      <main className={styles.page}>
        <Link href="/network">← Retour à CORO Network</Link>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        {!building && !error ? (
          <p className={styles.state}>Chargement du bâtiment…</p>
        ) : null}
        {building ? (
          <>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Vue locale</p>
                <h1>{building.name}</h1>
                <p>
                  {[building.address, building.city, building.province]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </header>
            <section
              className={styles.stats}
              aria-label="Indicateurs du bâtiment"
            >
              {metrics.map(([label, value, metric]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>Fraîcheur : {metric.freshness}</small>
                </article>
              ))}
            </section>
            {building.incidentSummary.items?.length ? (
              <section aria-labelledby="active-incidents-heading">
                <h2 id="active-incidents-heading">Incidents actifs</h2>
                <div className={styles.grid}>
                  {building.incidentSummary.items.map((incident) => (
                    <Link
                      key={incident.id}
                      className={styles.card}
                      href={`/sentinelle/${building.id}/incidents/${incident.id}`}
                    >
                      <span className={styles.cardTitle}>{incident.type}</span>
                      <span className={styles.address}>
                        {incident.status} · Déclenché le{" "}
                        {new Date(incident.triggeredAt).toLocaleString("fr-CA")}
                      </span>
                      <span>
                        Occupants figés au déclenchement :{" "}
                        {incident.occupancySnapshotCount ?? "inconnu"}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            <section aria-labelledby="corrective-actions-heading">
              <h2 id="corrective-actions-heading">Actions correctives</h2>
              <p>
                {building.actionSummary.open ?? 0} ouverte(s) ·{" "}
                {building.actionSummary.overdue ?? 0} en retard ·{" "}
                {building.actionSummary.completed ?? 0} réalisée(s) ou
                vérifiée(s) · {building.actionSummary.closed ?? 0} fermée(s)
              </p>
              {building.actionSummary.items?.length ? (
                <div className={styles.grid}>
                  {building.actionSummary.items.map((action) => (
                    <Link
                      key={action.id}
                      className={styles.card}
                      href={`/sentinelle/${building.id}/corrective-actions/${action.id}`}
                    >
                      <span className={styles.cardTitle}>{action.title}</span>
                      <span className={styles.address}>
                        {action.reference ?? "Action corrective"} ·{" "}
                        {action.status} · {action.priority}
                      </span>
                      <span>
                        Source : {action.source} · Responsable :{" "}
                        {action.responsible ?? "Non assigné"}
                      </span>
                      <span>
                        Échéance :{" "}
                        {action.dueDate
                          ? new Date(action.dueDate).toLocaleDateString("fr-CA")
                          : "Aucune"}
                        {action.overdue ? " · EN RETARD" : ""}
                      </span>
                      <span>
                        Preuves : {action.evidenceCount} · Vérifications :{" "}
                        {action.verificationCount}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className={styles.state}>
                  Aucune action corrective pour ce bâtiment.
                </p>
              )}
            </section>
          </>
        ) : null}
      </main>
    </PortalLayout>
  );
}
