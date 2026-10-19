"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Search,
  Users,
} from "lucide-react";
import PortalLayout from "../components/PortalLayout";
import { apiGet } from "../store/auth";
import styles from "./network.module.css";

type Freshness = "CURRENT" | "STALE" | "UNKNOWN" | "NOT_APPLICABLE";
type Summary = {
  active?: number;
  resolved?: number;
  present?: number | null;
  required?: number;
  evidence?: number;
  open?: number;
  freshness: Freshness;
};
type Building = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  incidentSummary: Summary;
  occupancySummary: Summary;
  documentSummary: Summary;
  actionSummary: Summary;
};
type Response = {
  generatedAt: string;
  page: number;
  pageSize: number;
  total: number;
  items: Building[];
};

const freshnessLabel: Record<Freshness, string> = {
  CURRENT: "À jour",
  STALE: "À actualiser",
  UNKNOWN: "Inconnu",
  NOT_APPLICABLE: "Non applicable",
};

export default function NetworkPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    void apiGet(`/client-portal/network/supervision${suffix}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active)
          setError(
            "La supervision Network est indisponible ou hors de votre périmètre.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, requestVersion]);

  return (
    <PortalLayout>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Supervision immobilière</p>
            <h1>CORO Network</h1>
            <p>Vue consolidée de votre périmètre explicitement attribué.</p>
          </div>
          {data && (
            <time dateTime={data.generatedAt}>
              Actualisé {new Date(data.generatedAt).toLocaleString("fr-CA")}
            </time>
          )}
        </header>

        <section className={styles.stats} aria-label="Indicateurs consolidés">
          <article>
            <Building2 aria-hidden="true" />
            <span>Bâtiments</span>
            <strong>{data?.total ?? 0}</strong>
          </article>
          <article>
            <AlertTriangle aria-hidden="true" />
            <span>Incidents</span>
            <strong>
              {data?.items.reduce(
                (sum, item) => sum + (item.incidentSummary.active ?? 0),
                0,
              ) ?? 0}
            </strong>
          </article>
          <article>
            <Users aria-hidden="true" />
            <span>Occupants présents</span>
            <strong>
              {data?.items.some(
                (item) => item.occupancySummary.present !== null,
              )
                ? data.items.reduce(
                    (sum, item) => sum + (item.occupancySummary.present ?? 0),
                    0,
                  )
                : "—"}
            </strong>
          </article>
          <article>
            <ClipboardCheck aria-hidden="true" />
            <span>Actions ouvertes</span>
            <strong>
              {data?.items.reduce(
                (sum, item) => sum + (item.actionSummary.open ?? 0),
                0,
              ) ?? 0}
            </strong>
          </article>
        </section>

        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            setLoading(true);
            setError("");
            setSearch(query.trim());
            setRequestVersion((version) => version + 1);
          }}
        >
          <label htmlFor="network-search">Rechercher un bâtiment</label>
          <div>
            <Search aria-hidden="true" />
            <input
              id="network-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, ville ou adresse"
            />
            <button type="submit">Rechercher</button>
          </div>
        </form>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {loading ? (
          <p className={styles.state}>Chargement de la supervision…</p>
        ) : null}
        {!loading && !error && data?.items.length === 0 ? (
          <p className={styles.state}>Aucun bâtiment dans ce périmètre.</p>
        ) : null}

        {!loading && data?.items.length ? (
          <section className={styles.grid} aria-label="Bâtiments supervisés">
            {data.items.map((building) => (
              <button
                key={building.id}
                type="button"
                className={styles.card}
                onClick={() => router.push(`/network/buildings/${building.id}`)}
              >
                <span className={styles.cardTitle}>{building.name}</span>
                <span className={styles.address}>
                  {[building.address, building.city, building.province]
                    .filter(Boolean)
                    .join(", ")}
                </span>
                <span className={styles.metrics}>
                  <span>
                    Incidents actifs{" "}
                    <b>{building.incidentSummary.active ?? 0}</b>
                  </span>
                  <span>
                    Présents <b>{building.occupancySummary.present ?? "—"}</b>
                  </span>
                  <span>
                    Documents{" "}
                    <b>
                      {building.documentSummary.evidence ?? 0}/
                      {building.documentSummary.required ?? 0}
                    </b>
                  </span>
                  <span>
                    Actions <b>{building.actionSummary.open ?? 0}</b>
                  </span>
                </span>
                <span className={styles.freshness}>
                  {(
                    [
                      "incidentSummary",
                      "occupancySummary",
                      "documentSummary",
                      "actionSummary",
                    ] as const
                  ).map((key) => (
                    <span key={key} data-state={building[key].freshness}>
                      {freshnessLabel[building[key].freshness]}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </section>
        ) : null}
      </main>
    </PortalLayout>
  );
}
