"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Filter, ShieldAlert } from "lucide-react";
import PortalLayout from "../../components/PortalLayout";
import { apiDownload, apiGet } from "../../store/auth";
import styles from "./portfolio-analytics.module.css";

type NamedScope = { id: string; name: string };
type Trend = {
  period: string;
  incidents: number;
  exercises: number;
  operationalReviews: number;
  correctiveActionsCreated: number;
  correctiveActionsDue: number;
};
type Analytics = {
  generatedAt: string;
  period: { from: string; to: string };
  scope: {
    buildingCount: number;
    buildings: NamedScope[];
    portfolios: NamedScope[];
    regions: NamedScope[];
  };
  summary: {
    incidents: { total: number; active: number; resolved: number };
    exercises: { published: number };
    operationalReviews: { total: number };
    correctiveActions: {
      created: number;
      open: number;
      overdue: number;
      completed: number;
      verified: number;
      closed: number;
    };
  };
  trends: Trend[];
  freshness: Record<
    string,
    {
      state: "CURRENT" | "STALE" | "UNKNOWN" | "NOT_APPLICABLE";
      observedAt: string | null;
    }
  >;
  missingData: string[];
};
type Filters = {
  portfolioId: string;
  regionId: string;
  buildingId: string;
  from: string;
  to: string;
};
const initialFilters: Filters = {
  portfolioId: "",
  regionId: "",
  buildingId: "",
  from: "",
  to: "",
};

function queryString(filters: Filters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(
    ([key, value]) => value && query.set(key, value),
  );
  return query.size ? `?${query}` : "";
}

export default function PortfolioAnalyticsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        (await apiGet(
          `/client-portal/network/analytics${queryString(applied)}`,
        )) as Analytics,
      );
    } catch {
      setError(
        "Les analyses sont indisponibles ou hors de votre périmètre autorisé.",
      );
    } finally {
      setLoading(false);
    }
  }, [applied]);
  useEffect(() => {
    void load();
  }, [load]);
  const maximum = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.trends.flatMap((row) => [
          row.incidents,
          row.exercises,
          row.correctiveActionsCreated,
        ]) ?? [1]),
      ),
    [data],
  );

  async function download() {
    setExporting(true);
    setError("");
    try {
      const result = await apiDownload(
        `/client-portal/network/analytics/export${queryString(applied)}`,
      );
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("L’export gouverné n’a pas pu être produit.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PortalLayout>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CORO Network</p>
            <h1>Risques systémiques du portefeuille</h1>
            <p>
              Indicateurs longitudinaux dérivés des sources opérationnelles
              autorisées.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/network">Retour à la supervision</Link>
            <button
              type="button"
              onClick={() => void download()}
              disabled={!data || exporting}
            >
              <Download aria-hidden="true" />
              {exporting ? "Préparation…" : "Exporter CSV"}
            </button>
          </div>
        </header>
        <form
          className={styles.filters}
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(filters);
          }}
        >
          <h2>
            <Filter aria-hidden="true" />
            Filtres
          </h2>
          <label>
            Portefeuille
            <select
              value={filters.portfolioId}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  portfolioId: event.target.value,
                  regionId: "",
                  buildingId: "",
                })
              }
            >
              <option value="">Tous les portefeuilles autorisés</option>
              {data?.scope.portfolios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Région
            <select
              value={filters.regionId}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  regionId: event.target.value,
                  buildingId: "",
                })
              }
            >
              <option value="">Toutes les régions autorisées</option>
              {data?.scope.regions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bâtiment
            <select
              value={filters.buildingId}
              onChange={(event) =>
                setFilters({ ...filters, buildingId: event.target.value })
              }
            >
              <option value="">Tous les bâtiments autorisés</option>
              {data?.scope.buildings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Du
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters({ ...filters, from: event.target.value })
              }
            />
          </label>
          <label>
            Au
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters({ ...filters, to: event.target.value })
              }
            />
          </label>
          <button type="submit">Appliquer</button>
        </form>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {loading && <p className={styles.state}>Calcul des indicateurs…</p>}
        {!loading && data && (
          <>
            <section
              className={styles.summary}
              aria-label="Synthèse analytique"
            >
              <article>
                <span>Bâtiments</span>
                <strong>{data.scope.buildingCount}</strong>
              </article>
              <article>
                <span>Incidents</span>
                <strong>{data.summary.incidents.total}</strong>
                <small>{data.summary.incidents.active} actifs</small>
              </article>
              <article>
                <span>Exercices publiés</span>
                <strong>{data.summary.exercises.published}</strong>
              </article>
              <article>
                <span>Actions ouvertes</span>
                <strong>{data.summary.correctiveActions.open}</strong>
                <small>
                  {data.summary.correctiveActions.overdue} en retard
                </small>
              </article>
            </section>
            {data.missingData.length > 0 && (
              <section className={styles.missing}>
                <ShieldAlert aria-hidden="true" />
                <div>
                  <h2>Données partielles</h2>
                  <p>
                    Aucune observation disponible pour :{" "}
                    {data.missingData.join(", ")}.
                  </p>
                </div>
              </section>
            )}
            <section className={styles.trends}>
              <div className={styles.sectionTitle}>
                <div>
                  <p className={styles.eyebrow}>Période</p>
                  <h2>Tendances longitudinales</h2>
                </div>
                <time>
                  {new Date(data.period.from).toLocaleDateString("fr-CA")} –{" "}
                  {new Date(data.period.to).toLocaleDateString("fr-CA")}
                </time>
              </div>
              <div
                className={styles.chart}
                role="img"
                aria-label="Incidents, exercices et actions par mois"
              >
                {data.trends.map((row) => (
                  <div className={styles.chartRow} key={row.period}>
                    <span>{row.period}</span>
                    <div>
                      <i
                        data-series="incidents"
                        style={{ width: `${(row.incidents / maximum) * 100}%` }}
                        title={`${row.incidents} incidents`}
                      />
                      <i
                        data-series="exercises"
                        style={{ width: `${(row.exercises / maximum) * 100}%` }}
                        title={`${row.exercises} exercices`}
                      />
                      <i
                        data-series="actions"
                        style={{
                          width: `${(row.correctiveActionsCreated / maximum) * 100}%`,
                        }}
                        title={`${row.correctiveActionsCreated} actions`}
                      />
                    </div>
                    <b>
                      {row.incidents +
                        row.exercises +
                        row.correctiveActionsCreated}
                    </b>
                  </div>
                ))}
              </div>
              <div className={styles.legend}>
                <span data-series="incidents">Incidents</span>
                <span data-series="exercises">Exercices</span>
                <span data-series="actions">Actions créées</span>
              </div>
            </section>
            <section className={styles.details}>
              <article>
                <h2>Actions correctives</h2>
                <dl>
                  <div>
                    <dt>Créées</dt>
                    <dd>{data.summary.correctiveActions.created}</dd>
                  </div>
                  <div>
                    <dt>Terminées</dt>
                    <dd>{data.summary.correctiveActions.completed}</dd>
                  </div>
                  <div>
                    <dt>Vérifiées</dt>
                    <dd>{data.summary.correctiveActions.verified}</dd>
                  </div>
                  <div>
                    <dt>Closes</dt>
                    <dd>{data.summary.correctiveActions.closed}</dd>
                  </div>
                </dl>
              </article>
              <article>
                <h2>Fraîcheur et provenance</h2>
                {Object.entries(data.freshness).map(([source, value]) => (
                  <p key={source}>
                    <b>{source}</b>
                    <span data-state={value.state}>{value.state}</span>
                    <small>
                      {value.observedAt
                        ? new Date(value.observedAt).toLocaleString("fr-CA")
                        : "Aucune observation"}
                    </small>
                  </p>
                ))}
              </article>
            </section>
          </>
        )}
      </main>
    </PortalLayout>
  );
}
