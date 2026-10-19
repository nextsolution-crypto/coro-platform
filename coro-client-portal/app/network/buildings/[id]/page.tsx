"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PortalLayout from "../../../components/PortalLayout";
import { apiGet } from "../../../store/auth";
import styles from "../../network.module.css";

type Metric = {
  count?: number;
  present?: number;
  required?: number;
  evidence?: number;
  open?: number;
  freshness: string;
  observedAt?: string | null;
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
  actionSummary: Metric;
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
          "Incidents",
          building.incidentSummary.count ?? 0,
          building.incidentSummary,
        ],
        [
          "Occupants présents",
          building.occupancySummary.present ?? 0,
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
          </>
        ) : null}
      </main>
    </PortalLayout>
  );
}
