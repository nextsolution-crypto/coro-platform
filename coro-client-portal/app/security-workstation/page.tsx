/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ApiError,
  apiDownload,
  apiGet,
  apiPatch,
  apiPost,
  getUser,
} from "../store/auth";
import PortalLayout from "../components/PortalLayout";
import {
  reviewActionPresentation,
  visibleReviewActions,
} from "./reportReviewActions.mjs";
import styles from "./security-workstation.module.css";

type Capability = { feature: string; available: boolean; reason: string };
type ReportFileCapabilities = {
  attachmentUpload: { available: boolean; reason: string };
  historicalImport: { available: boolean; reason: string };
  historicalArchive: { available: boolean; reason: string };
};
type Building = { id: string; name: string };
type Item = Record<string, any>;
type Tab =
  | "overview"
  | "log"
  | "shifts"
  | "directives"
  | "followups"
  | "reports";
type Mutate = (
  action: () => Promise<any>,
  success: string,
  onError?: (reason: unknown) => void,
) => Promise<void>;

const FEATURES: Record<Exclude<Tab, "overview">, string> = {
  log: "OPERATIONAL_LOG",
  shifts: "OPERATIONAL_SHIFTS",
  directives: "OPERATIONAL_DIRECTIVES",
  followups: "OPERATIONAL_FOLLOWUPS",
  reports: "INCIDENT_REPORTS",
};

const labels: Record<Tab, string> = {
  overview: "Vue d’ensemble",
  log: "Main courante",
  shifts: "Quarts et relève",
  directives: "Consignes",
  followups: "Suivis",
  reports: "Rapports",
};

const asItems = (value: any): Item[] =>
  Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
const isCanonicalUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const uuid = () => crypto.randomUUID();
const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("fr-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "Une erreur est survenue.";

function prepareReportContent(schema: Item, content: Item) {
  const normalized = { ...content };
  const errors: Record<string, string> = {};
  for (const section of schema.sections ?? []) {
    for (const field of section.fields ?? []) {
      const value = content[field.key];
      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors[field.key] = `${field.label} est obligatoire.`;
        continue;
      }
      if (field.type === "DATETIME" && value) {
        const instant = new Date(value);
        if (Number.isNaN(instant.getTime()))
          errors[field.key] =
            `${field.label} doit contenir une date et une heure valides.`;
        else normalized[field.key] = instant.toISOString();
      }
    }
  }
  return { normalized, errors };
}

function contentForEditing(schema: Item, content: Item) {
  const editable = { ...content };
  for (const section of schema.sections ?? []) {
    for (const field of section.fields ?? []) {
      if (field.type !== "DATETIME" || !content[field.key]) continue;
      const instant = new Date(content[field.key]);
      if (!Number.isNaN(instant.getTime())) {
        const local = new Date(
          instant.getTime() - instant.getTimezoneOffset() * 60_000,
        );
        editable[field.key] = local.toISOString().slice(0, 16);
      }
    }
  }
  return editable;
}

export default function SecurityWorkstationPage() {
  const user = getUser();
  const organizationId = user?.organizationId ?? "";
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [reportPermissions, setReportPermissions] = useState<string[]>([]);
  const [reportFileCapabilities, setReportFileCapabilities] =
    useState<ReportFileCapabilities | null>(null);
  // Lien direct depuis une urgence : /security-workstation?buildingId=…&tab=reports
  const requested = useMemo(() => {
    if (typeof window === "undefined") return { buildingId: "", tab: null as Tab | null };
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    return {
      buildingId: params.get("buildingId") ?? "",
      tab: tabParam && tabParam in labels ? (tabParam as Tab) : null,
    };
  }, []);
  const [tab, setTab] = useState<Tab>(requested.tab ?? "overview");
  const [items, setItems] = useState<Item[]>([]);
  const [templates, setTemplates] = useState<Item[]>([]);
  const [reviewers, setReviewers] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Exclude<Tab, "overview"> | null>(null);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [openArchiveId, setOpenArchiveId] = useState<string | null>(null);
  const [showHistorical, setShowHistorical] = useState(false);
  const [query, setQuery] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportType, setReportType] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const enabled = useMemo(
    () =>
      new Set(
        capabilities
          .filter((item) => item.available)
          .map((item) => item.feature),
      ),
    [capabilities],
  );
  const selectedBuilding = buildings.find(
    (building) => building.id === buildingId,
  );
  const historicalArchiveAvailable =
    reportFileCapabilities?.historicalArchive.available === true;

  useEffect(() => {
    if (!historicalArchiveAvailable && showHistorical) setShowHistorical(false);
  }, [historicalArchiveAvailable, showHistorical]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void apiGet("/client-portal/buildings")
      .then(async (value) => {
        const next = (
          asItems(value).length ? asItems(value) : value
        ) as Building[];
        const evaluated = await Promise.all(
          next.map(async (building) => {
            try {
              const decision = await apiGet(
                `/client-portal/organizations/${organizationId}/operational-capabilities?buildingId=${building.id}`,
              );
              return {
                building,
                capabilities: (decision.capabilities ?? []) as Capability[],
                reportFileCapabilities:
                  (decision.reportFileCapabilities as ReportFileCapabilities) ??
                  null,
                reportPermissions: (decision.reportPermissions ??
                  []) as string[],
              };
            } catch {
              return {
                building,
                capabilities: [] as Capability[],
                reportFileCapabilities: null,
                reportPermissions: [] as string[],
              };
            }
          }),
        );
        if (!active) return;
        setBuildings(next);
        const usable = ({ capabilities: available }: { capabilities: Capability[] }) =>
          available.some((capability) => capability.available);
        const preferred =
          evaluated.find(
            (entry) => entry.building.id === requested.buildingId && usable(entry),
          ) ?? evaluated.find(usable);
        setCapabilities(preferred?.capabilities ?? []);
        setReportFileCapabilities(preferred?.reportFileCapabilities ?? null);
        setReportPermissions(preferred?.reportPermissions ?? []);
        setBuildingId(preferred?.building.id ?? "");
        if (next.length > 0 && !preferred) {
          setError(
            "Aucun bâtiment accessible ne dispose actuellement d’un module opérationnel autorisé.",
          );
        }
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [organizationId, requested.buildingId]);

  useEffect(() => {
    if (!organizationId || !buildingId) return;
    setLoading(true);
    setError("");
    void apiGet(
      `/client-portal/organizations/${organizationId}/operational-capabilities?buildingId=${buildingId}`,
    )
      .then((value) => {
        setCapabilities(value.capabilities ?? []);
        setReportFileCapabilities(value.reportFileCapabilities ?? null);
        setReportPermissions(value.reportPermissions ?? []);
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, [buildingId, organizationId]);

  const endpoint = useCallback(
    (active: Tab) => {
      const base = `/client-portal/organizations/${organizationId}`;
      const suffix = `buildingId=${buildingId}`;
      if (active === "log")
        return `${base}/operational-log/entries?${suffix}&page=1&pageSize=50${query ? `&q=${encodeURIComponent(query)}` : ""}`;
      if (active === "shifts")
        return `${base}/operational-shifts?${suffix}&limit=50`;
      if (active === "directives")
        return `${base}/operations/directives?${suffix}&limit=50`;
      if (active === "followups")
        return `${base}/operations/follow-ups?${suffix}&limit=50`;
      if (active === "reports") {
        const params = new URLSearchParams({
          buildingId,
          page: "1",
          pageSize: "50",
        });
        if (query) params.set("q", query);
        if (!showHistorical && reportStatus) params.set("status", reportStatus);
        if (!showHistorical && reportType) params.set("reportType", reportType);
        if (createdFrom)
          params.set(
            showHistorical ? "importedFrom" : "createdFrom",
            createdFrom,
          );
        if (createdTo)
          params.set(showHistorical ? "importedTo" : "createdTo", createdTo);
        return `${base}/incident-reports${showHistorical ? "/historical" : ""}?${params.toString()}`;
      }
      return "";
    },
    [
      buildingId,
      createdFrom,
      createdTo,
      organizationId,
      query,
      reportStatus,
      reportType,
      showHistorical,
    ],
  );

  const refresh = useCallback(async () => {
    if (tab === "overview" || !buildingId) return;
    if (tab === "reports" && !isCanonicalUuid(buildingId)) {
      setItems([]);
      setTemplates([]);
      setReviewers([]);
      setError(
        "Les rapports ne sont pas disponibles pour cet ancien identifiant de bâtiment. Sélectionnez un bâtiment CORO compatible.",
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const value = await apiGet(endpoint(tab));
      setItems(asItems(value));
      if (tab === "reports") {
        const [templateResult, reviewerResult] = await Promise.allSettled([
          apiGet(
            `/client-portal/organizations/${organizationId}/incident-reports/forms/templates?buildingId=${buildingId}`,
          ),
          apiGet(
            `/client-portal/organizations/${organizationId}/incident-reports/reviewers/eligible?buildingId=${buildingId}`,
          ),
        ]);
        setTemplates(
          templateResult.status === "fulfilled"
            ? asItems(templateResult.value)
            : [],
        );
        setReviewers(
          reviewerResult.status === "fulfilled"
            ? asItems(reviewerResult.value)
            : [],
        );
        if (templateResult.status === "rejected") {
          setError(
            `Les rapports sont accessibles, mais les formulaires n’ont pas pu être chargés. ${errorMessage(templateResult.reason)}`,
          );
        } else if (reviewerResult.status === "rejected") {
          setError(
            `Les rapports sont accessibles, mais la liste des réviseurs n’a pas pu être chargée. ${errorMessage(reviewerResult.reason)}`,
          );
        }
      }
    } catch (reason) {
      setError(errorMessage(reason));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId, endpoint, organizationId, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function mutate(
    action: () => Promise<any>,
    success: string,
    onError?: (reason: unknown) => void,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setDialog(null);
      await refresh();
    } catch (reason) {
      if (onError) onError(reason);
      else setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setItems([]);
    setError("");
    setNotice("");
  };

  if (loading && buildings.length === 0)
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    );

  return (
    <PortalLayout>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={`${styles.eyebrow} coro-eyebrow`}>CORO REPORT · OPÉRATIONS</p>
            <h1 className="coro-title">Poste de sécurité</h1>
            <p>
              Le registre opérationnel et les rapports gouvernés de votre
              bâtiment.
            </p>
          </div>
          <label className={styles.buildingPicker}>
            <span>Bâtiment actif</span>
            <select
              value={buildingId}
              onChange={(event) => {
                setTab("overview");
                setItems([]);
                setTemplates([]);
                setReviewers([]);
                setBuildingId(event.target.value);
              }}
            >
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        {error && (
          <div className={styles.error} role="alert">
            <AlertTriangle size={18} />
            {error}
            <button onClick={() => void refresh()}>Réessayer</button>
          </div>
        )}
        {notice && (
          <div className={styles.notice} role="status">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        <nav className={styles.tabs} aria-label="Poste de sécurité">
          {(Object.keys(labels) as Tab[]).map((key) => {
            const available = key === "overview" || enabled.has(FEATURES[key]);
            if (!available) return null;
            return (
              <button
                key={key}
                className={tab === key ? styles.activeTab : ""}
                onClick={() => switchTab(key)}
              >
                {labels[key]}
              </button>
            );
          })}
        </nav>

        {tab === "overview" ? (
          <Overview
            capabilities={capabilities}
            onOpen={switchTab}
            buildingName={selectedBuilding?.name}
          />
        ) : (
          <section className={styles.panel}>
            <div className={styles.toolbar}>
              <div>
                <h2>{labels[tab]}</h2>
                <p>
                  {items.length} élément{items.length === 1 ? "" : "s"}
                </p>
                {tab === "reports" && buildingId && (
                  <p className={styles.vocabularyNote}>
                    Un <strong>rapport</strong> documente un événement après
                    coup. Une <strong>urgence</strong> en cours se déclenche et
                    se suit dans CORO Incident :{" "}
                    <a href={`/sentinelle/${encodeURIComponent(buildingId)}/incident`}>
                      ouvrir les urgences du bâtiment →
                    </a>
                  </p>
                )}
              </div>
              <div className={styles.actions}>
                {(tab === "log" || tab === "reports") && (
                  <input
                    aria-label="Rechercher"
                    placeholder="Rechercher…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) =>
                      event.key === "Enter" && void refresh()
                    }
                  />
                )}
                {tab === "reports" && (
                  <>
                    {historicalArchiveAvailable && (
                      <button
                        type="button"
                        className={styles.secondary}
                        aria-pressed={showHistorical}
                        onClick={() => setShowHistorical((current) => !current)}
                      >
                        {showHistorical
                          ? "Afficher les rapports CORO"
                          : "Afficher les archives"}
                      </button>
                    )}
                    <select
                      aria-label="Filtrer les rapports par statut"
                      disabled={showHistorical}
                      value={reportStatus}
                      onChange={(event) => setReportStatus(event.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="DRAFT">Brouillon</option>
                      <option value="SUBMITTED">Soumis</option>
                      <option value="IN_REVIEW">En révision</option>
                      <option value="CORRECTION_REQUESTED">
                        Corrections demandées
                      </option>
                      <option value="APPROVED">Approuvé</option>
                      <option value="PUBLISHED">Publié</option>
                      <option value="REJECTED">Refusé</option>
                    </select>
                    <select
                      aria-label="Filtrer les rapports par formulaire"
                      disabled={showHistorical}
                      value={reportType}
                      onChange={(event) => setReportType(event.target.value)}
                    >
                      <option value="">Tous les formulaires</option>
                      {Array.from(
                        new Map(
                          templates
                            .filter((template) => template.reportType)
                            .map((template) => [
                              String(template.reportType),
                              template,
                            ]),
                        ).values(),
                      ).map((template) => (
                        <option
                          key={String(template.reportType)}
                          value={String(template.reportType)}
                        >
                          {template.name ?? template.reportType}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Rapports créés à partir du"
                      type="date"
                      value={createdFrom}
                      onChange={(event) => setCreatedFrom(event.target.value)}
                    />
                    <input
                      aria-label="Rapports créés jusqu’au"
                      type="date"
                      min={createdFrom || undefined}
                      value={createdTo}
                      onChange={(event) => setCreatedTo(event.target.value)}
                    />
                  </>
                )}
                <button
                  className={styles.secondary}
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  Actualiser
                </button>
                <button
                  className={styles.primary}
                  onClick={() => setDialog(tab)}
                  disabled={
                    tab === "reports" &&
                    !reportPermissions.includes("INCIDENT_REPORT_CREATE")
                  }
                >
                  <Plus size={16} />
                  {tab === "log"
                    ? "Nouvelle entrée"
                    : tab === "reports"
                      ? "Nouveau rapport"
                      : tab === "shifts"
                        ? "Nouveau quart"
                        : tab === "directives"
                          ? "Nouvelle consigne"
                          : "Nouveau suivi"}
                </button>
              </div>
            </div>
            {loading ? (
              <Loading />
            ) : (
              <ItemList
                tab={tab}
                items={items}
                organizationId={organizationId}
                reviewers={reviewers}
                attachmentUploadAvailable={
                  reportFileCapabilities?.attachmentUpload.available === true
                }
                reportPermissions={reportPermissions}
                mutate={mutate}
                onOpenReport={setOpenReportId}
                onOpenArchive={setOpenArchiveId}
              />
            )}
          </section>
        )}

        {dialog && (
          <CreateDialog
            kind={dialog}
            buildingId={buildingId}
            organizationId={organizationId}
            templates={templates}
            busy={busy}
            onClose={() => setDialog(null)}
            mutate={mutate}
          />
        )}
        {openReportId && (
          <ReportDialog
            reportId={openReportId}
            organizationId={organizationId}
            templates={templates}
            busy={busy}
            onClose={() => setOpenReportId(null)}
            mutate={mutate}
          />
        )}
        {openArchiveId && (
          <HistoricalArchiveDialog
            recordId={openArchiveId}
            organizationId={organizationId}
            onClose={() => setOpenArchiveId(null)}
          />
        )}
      </main>
    </PortalLayout>
  );
}

function Overview({
  capabilities,
  onOpen,
  buildingName,
}: {
  capabilities: Capability[];
  onOpen: (tab: Tab) => void;
  buildingName?: string;
}) {
  const cards: Array<[Exclude<Tab, "overview">, typeof ClipboardList, string]> =
    [
      ["log", ClipboardList, "Consigner et retrouver les événements"],
      ["shifts", Users, "Ouvrir un quart et préparer la relève"],
      ["directives", BookOpenCheck, "Consulter et confirmer les consignes"],
      ["followups", CheckCircle2, "Assigner et fermer les suivis"],
      ["reports", FileText, "Créer, approuver et exporter les rapports"],
    ];
  const available = new Set(
    capabilities.filter((item) => item.available).map((item) => item.feature),
  );
  return (
    <section>
      <div className={styles.context}>
        <ShieldCheck size={20} />
        <span>
          Périmètre actif : <strong>{buildingName ?? "Bâtiment"}</strong>.
          Chaque action est revérifiée par le serveur.
        </span>
      </div>
      <div className={styles.grid}>
        {cards.map(([key, Icon, description]) => {
          const allowed = available.has(FEATURES[key]);
          return (
            <button
              key={key}
              className={styles.card}
              disabled={!allowed}
              onClick={() => onOpen(key)}
            >
              <Icon size={24} />
              <span>
                <strong>{labels[key]}</strong>
                <small>
                  {allowed
                    ? description
                    : "Non disponible pour ce profil et ce bâtiment"}
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ItemList({
  tab,
  items,
  organizationId,
  reviewers,
  attachmentUploadAvailable,
  reportPermissions,
  mutate,
  onOpenReport,
  onOpenArchive,
}: {
  tab: Exclude<Tab, "overview">;
  items: Item[];
  organizationId: string;
  reviewers: Item[];
  attachmentUploadAvailable: boolean;
  reportPermissions: string[];
  mutate: Mutate;
  onOpenReport: (id: string) => void;
  onOpenArchive: (id: string) => void;
}) {
  if (!items.length)
    return (
      <div className={styles.empty}>
        <ClipboardList size={30} />
        <h3>Aucun élément</h3>
        <p>
          Utilisez l’action principale pour commencer. Aucun contenu de
          démonstration statique n’est affiché.
        </p>
      </div>
    );
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <article className={styles.row} key={item.id}>
          <div>
            <div className={styles.rowTitle}>
              {item.title ??
                item.description ??
                item.activityType ??
                item.securityPost ??
                item.reportNumber ??
                "Élément opérationnel"}
            </div>
            <div className={styles.meta}>
              <span>{item.status ?? item.priority ?? "ACTIF"}</span>
              <span>
                {formatDate(
                  item.eventAt ??
                    item.updatedAt ??
                    item.createdAt ??
                    item.importedAt ??
                    item.plannedStartAt,
                )}
              </span>
              {lateEntryMinutes(item) !== null && (
                <span className={styles.lateEntry}>
                  Saisi le {formatDate(item.recordedAt)} (+
                  {formatDelay(lateEntryMinutes(item)!)})
                </span>
              )}
              {item.createdByDisplayName && (
                <span>{item.createdByDisplayName}</span>
              )}
            </div>
          </div>
          <RowActions
            tab={tab}
            item={item}
            organizationId={organizationId}
            reviewers={reviewers}
            attachmentUploadAvailable={attachmentUploadAvailable}
            reportPermissions={reportPermissions}
            mutate={mutate}
            onOpenReport={onOpenReport}
            onOpenArchive={onOpenArchive}
          />
        </article>
      ))}
    </div>
  );
}

function RowActions({
  tab,
  item,
  organizationId,
  reviewers,
  attachmentUploadAvailable,
  reportPermissions,
  mutate,
  onOpenReport,
  onOpenArchive,
}: {
  tab: Exclude<Tab, "overview">;
  item: Item;
  organizationId: string;
  reviewers: Item[];
  attachmentUploadAvailable: boolean;
  reportPermissions: string[];
  mutate: Mutate;
  onOpenReport: (id: string) => void;
  onOpenArchive: (id: string) => void;
}) {
  const base = `/client-portal/organizations/${organizationId}`;
  if (tab === "shifts")
    return (
      <div className={styles.rowActions}>
        {item.status === "PLANNED" && (
          <button
            onClick={() =>
              void mutate(
                () =>
                  apiPost(`${base}/operational-shifts/${item.id}/open`, {
                    lockVersion: item.lockVersion,
                    idempotencyKey: uuid(),
                  }),
                "Quart ouvert.",
              )
            }
          >
            Ouvrir
          </button>
        )}
        {item.status === "OPEN" && (
          <button
            onClick={() =>
              void mutate(
                () =>
                  apiPost(`${base}/operational-shifts/${item.id}/handover`, {
                    lockVersion: item.lockVersion,
                    idempotencyKey: uuid(),
                    snapshot: { preparedFromPortal: true },
                  }),
                "Relève préparée.",
              )
            }
          >
            Préparer la relève
          </button>
        )}
      </div>
    );
  if (tab === "directives")
    return (
      <div className={styles.rowActions}>
        {item.status === "PUBLISHED" && item.currentVersionId && (
          <button
            onClick={() =>
              void mutate(
                () =>
                  apiPost(
                    `${base}/operations/directives/${item.id}/acknowledge`,
                    {
                      versionId: item.currentVersionId,
                      idempotencyKey: uuid(),
                    },
                  ),
                "Consigne confirmée.",
              )
            }
          >
            Confirmer
          </button>
        )}
      </div>
    );
  if (tab === "followups")
    return (
      <div className={styles.rowActions}>
        {item.status === "OPEN" && (
          <button
            onClick={() =>
              void mutate(
                () =>
                  apiPost(`${base}/operations/follow-ups/${item.id}/start`, {
                    lockVersion: item.lockVersion,
                    idempotencyKey: uuid(),
                  }),
                "Suivi démarré.",
              )
            }
          >
            Démarrer
          </button>
        )}
        {item.status === "IN_PROGRESS" && (
          <button
            onClick={() =>
              void mutate(
                () =>
                  apiPost(`${base}/operations/follow-ups/${item.id}/complete`, {
                    lockVersion: item.lockVersion,
                    idempotencyKey: uuid(),
                    evidence: { confirmedInPortal: true },
                  }),
                "Suivi complété.",
              )
            }
          >
            Compléter
          </button>
        )}
      </div>
    );
  if (tab === "reports")
    if (item.provenanceKind === "HISTORICAL_IMPORT")
      return (
        <div className={styles.rowActions}>
          <button onClick={() => onOpenArchive(item.id)}>Consulter</button>
        </div>
      );
  if (tab === "reports")
    return (
      <ReportActions
        item={item}
        base={base}
        reviewers={reviewers}
        attachmentUploadAvailable={attachmentUploadAvailable}
        reportPermissions={reportPermissions}
        mutate={mutate}
        onOpen={() => onOpenReport(item.id)}
      />
    );
  return null;
}

function ReportActions({
  item,
  base,
  reviewers,
  attachmentUploadAvailable,
  reportPermissions,
  mutate,
  onOpen,
}: {
  item: Item;
  base: string;
  reviewers: Item[];
  attachmentUploadAvailable: boolean;
  reportPermissions: string[];
  mutate: Mutate;
  onOpen: () => void;
}) {
  const [reviewerId, setReviewerId] = useState(reviewers[0]?.id ?? "");
  const canEdit = reportPermissions.includes("INCIDENT_REPORT_EDIT");
  const canApprove = reportPermissions.includes("INCIDENT_REPORT_APPROVE");
  const canExport = reportPermissions.includes("INCIDENT_REPORT_EXPORT");
  const reviewActions = visibleReviewActions(reportPermissions);
  const versionId = item.versions?.[0]?.id;
  const decide = (decision: string, success: string) =>
    mutate(
      () =>
        apiPost(`${base}/incident-reports/${item.id}/decisions`, {
          decision,
          expectedLockVersion: item.lockVersion,
          idempotencyKey: uuid(),
        }),
      success,
    );
  return (
    <div className={styles.rowActions}>
      <button onClick={onOpen}>Ouvrir</button>
      {item.status === "DRAFT" && canEdit && (
        <>
          <AttachmentButton
            item={item}
            versionId={versionId}
            base={base}
            mutate={mutate}
            available={attachmentUploadAvailable}
          />
          <button
            onClick={() =>
              void mutate(
                () =>
                  apiPost(`${base}/incident-reports/${item.id}/submit`, {
                    expectedLockVersion: item.lockVersion,
                    idempotencyKey: uuid(),
                  }),
                "Rapport soumis.",
              )
            }
          >
            Soumettre
          </button>
        </>
      )}
      {item.status === "SUBMITTED" && canEdit && (
        <>
          <select
            aria-label="Réviseur"
            value={reviewerId}
            onChange={(event) => setReviewerId(event.target.value)}
          >
            <option value="">Choisir le réviseur</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.firstName} {reviewer.lastName}
              </option>
            ))}
          </select>
          <button
            disabled={!reviewerId}
            onClick={() =>
              void mutate(
                () =>
                  apiPost(`${base}/incident-reports/${item.id}/reviewer`, {
                    reviewerClientUserId: reviewerId,
                    expectedLockVersion: item.lockVersion,
                    idempotencyKey: uuid(),
                  }),
                "Réviseur affecté.",
              )
            }
          >
            Affecter
          </button>
        </>
      )}
      {item.status === "IN_REVIEW" &&
        reviewActions.map((action) => {
          const presentation = reviewActionPresentation[action];
          return (
            <button
              key={action}
              onClick={() => void decide(action, presentation.success)}
            >
              {presentation.label}
            </button>
          );
        })}
      {item.status === "APPROVED" && canApprove && (
        <button
          onClick={() =>
            void mutate(
              () =>
                apiPost(`${base}/incident-reports/${item.id}/publish`, {
                  expectedLockVersion: item.lockVersion,
                  idempotencyKey: uuid(),
                }),
              "Rapport publié.",
            )
          }
        >
          Publier
        </button>
      )}
      {(item.status === "APPROVED" || item.status === "PUBLISHED") &&
        versionId &&
        canExport && (
          <button
            onClick={() =>
              void mutate(async () => {
                const created = await apiPost(
                  `${base}/incident-reports/${item.id}/exports`,
                  {
                    reportVersionId: versionId,
                    pageFormat: "LETTER",
                    locale: "fr-CA",
                    idempotencyKey: uuid(),
                  },
                );
                const file = await apiDownload(
                  `${base}/incident-reports/${item.id}/exports/${created.id}/download`,
                );
                const url = URL.createObjectURL(file.blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = file.filename;
                anchor.click();
                URL.revokeObjectURL(url);
              }, "PDF généré et téléchargé.")
            }
          >
            PDF
          </button>
        )}
    </div>
  );
}

function HistoricalArchiveDialog({
  recordId,
  organizationId,
  onClose,
}: {
  recordId: string;
  organizationId: string;
  onClose: () => void;
}) {
  const [record, setRecord] = useState<Item | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    void apiGet(
      `/client-portal/organizations/${organizationId}/incident-reports/historical/${recordId}`,
    )
      .then((value) => active && setRecord(value))
      .catch((reason) => active && setLoadError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, [organizationId, recordId]);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Archive historique"
      >
        <header>
          <div>
            <p className={styles.eyebrow}>Archive historique</p>
            <h2>{record?.sourceObjectId ?? "Chargement…"}</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        {loadError && (
          <p className={styles.formError} role="alert">
            {loadError}
          </p>
        )}
        {record && (
          <div className={styles.form}>
            <p className={styles.notice} role="status">
              {record.warning}
            </p>
            <p>
              Source : <strong>{record.sourceSystem}</strong>
              {record.sourceSchemaVersion
                ? ` — version ${record.sourceSchemaVersion}`
                : ""}
            </p>
            <h3>Données normalisées</h3>
            <pre>{JSON.stringify(record.mappedContent, null, 2)}</pre>
            <h3>Valeurs originales conservées</h3>
            <pre>{JSON.stringify(record.originalContent, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportDialog({
  reportId,
  organizationId,
  templates,
  busy,
  onClose,
  mutate,
}: {
  reportId: string;
  organizationId: string;
  templates: Item[];
  busy: boolean;
  onClose: () => void;
  mutate: Mutate;
}) {
  const [report, setReport] = useState<Item | null>(null);
  const [content, setContent] = useState<Item>({});
  const [title, setTitle] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const base = `/client-portal/organizations/${organizationId}/incident-reports/${reportId}`;
  const template = templates.find(
    (item) => item.id === report?.templateVersionId,
  );
  const editable =
    report?.status === "DRAFT" || report?.status === "CORRECTION_REQUESTED";

  useEffect(() => {
    let active = true;
    void apiGet(base)
      .then((value) => {
        if (!active) return;
        setReport(value);
        setTitle(value.title ?? "");
        const schema = templates.find(
          (item) => item.id === value.templateVersionId,
        )?.formSchema ?? { sections: [] };
        setContent(
          contentForEditing(schema, value.versions?.[0]?.content ?? {}),
        );
        setDirty(false);
      })
      .catch((reason) => active && setLoadError(errorMessage(reason)));
    return () => {
      active = false;
    };
  }, [base, templates]);

  const save = () => {
    if (!report || !template) return;
    const prepared = prepareReportContent(template.formSchema, content);
    setFieldErrors(prepared.errors);
    if (Object.keys(prepared.errors).length) return;
    void mutate(
      () =>
        apiPatch(base, {
          expectedLockVersion: report.lockVersion,
          title,
          content: prepared.normalized,
          idempotencyKey: uuid(),
        }),
      "Brouillon enregistré.",
      (reason) => setLoadError(errorMessage(reason)),
    );
  };

  useEffect(() => {
    if (!dirty || !report || !template || !editable) return;
    const timer = window.setTimeout(() => {
      const prepared = prepareReportContent(template.formSchema, content);
      if (Object.keys(prepared.errors).length) return;
      setAutosaveStatus("saving");
      setDirty(false);
      void apiPatch(base, {
        expectedLockVersion: report.lockVersion,
        title,
        content: prepared.normalized,
        idempotencyKey: uuid(),
      })
        .then((updated) => {
          setReport(updated);
          setAutosaveStatus("saved");
        })
        .catch((reason) => {
          setAutosaveStatus("failed");
          setLoadError(
            `Sauvegarde automatique incertaine; vérifiez le brouillon avant de réessayer. ${errorMessage(reason)}`,
          );
        });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [base, content, dirty, editable, report, template, title]);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Détail du rapport"
      >
        <header>
          <div>
            <p className={styles.eyebrow}>Rapport</p>
            <h2>{report?.reportNumber ?? "Chargement…"}</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        {loadError && (
          <p className={styles.formError} role="alert">
            {loadError}
          </p>
        )}
        {!report ? (
          <Loading />
        ) : (
          <>
            <Field label="Titre">
              <input
                disabled={!editable}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setDirty(true);
                  setAutosaveStatus("idle");
                }}
              />
            </Field>
            {template ? (
              <ReportFields
                disabled={!editable}
                schema={template.formSchema}
                content={content}
                errors={fieldErrors}
                onChange={(key, value) => {
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next[key];
                    return next;
                  });
                  setContent((current) => ({ ...current, [key]: value }));
                  setDirty(true);
                  setAutosaveStatus("idle");
                }}
              />
            ) : (
              <p className={styles.help}>
                Le formulaire historique n’est pas disponible dans cette
                session.
              </p>
            )}
            {editable && (
              <p className={styles.autosave} role="status">
                {autosaveStatus === "saving"
                  ? "Sauvegarde du brouillon…"
                  : autosaveStatus === "saved"
                    ? "Brouillon sauvegardé."
                    : autosaveStatus === "failed"
                      ? "Sauvegarde automatique interrompue; aucune nouvelle tentative automatique."
                      : dirty
                        ? "Modifications en attente…"
                        : "Brouillon à jour."}
              </p>
            )}
            <p className={styles.help}>
              Statut : {report.status}. Version {report.currentVersionNumber}.
            </p>
            <footer>
              <button
                type="button"
                className={styles.secondary}
                onClick={onClose}
              >
                Fermer
              </button>
              {editable && (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={busy || !template}
                  onClick={save}
                >
                  Enregistrer
                </button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function AttachmentButton({
  item,
  versionId,
  base,
  mutate,
  available,
}: {
  item: Item;
  versionId?: string;
  base: string;
  mutate: Mutate;
  available: boolean;
}) {
  const upload = async (file?: File) => {
    if (!file || !versionId) return;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error("Lecture du fichier impossible."));
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(file);
    });
    await mutate(
      () =>
        apiPost(`${base}/incident-reports/${item.id}/attachments`, {
          reportVersionId: versionId,
          originalFileName: file.name,
          mediaType: file.type,
          fileBase64: data,
          idempotencyKey: uuid(),
        }),
      "Pièce jointe reçue : elle sera disponible après l’analyse antivirus (quelques minutes).",
    );
  };
  return (
    <label
      className={styles.fileButton}
      aria-disabled={!versionId || !available}
      title={
        available
          ? undefined
          : "Téléversement indisponible : la protection antivirus n’est pas opérationnelle."
      }
    >
      {available ? "Pièce jointe" : "Pièce jointe indisponible"}
      <input
        disabled={!versionId || !available}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
    </label>
  );
}

function CreateDialog({
  kind,
  buildingId,
  organizationId,
  templates,
  busy,
  onClose,
  mutate,
}: {
  kind: Exclude<Tab, "overview">;
  buildingId: string;
  organizationId: string;
  templates: Item[];
  busy: boolean;
  onClose: () => void;
  mutate: Mutate;
}) {
  const eligibleTemplates = templates.filter(
    (item) => item.retentionPolicyId && item.formSchema?.sections?.length,
  );
  const ineligibleTemplates = templates.filter(
    (item) => !item.retentionPolicyId || !item.formSchema?.sections?.length,
  );
  const firstTemplate = eligibleTemplates[0];
  const [form, setForm] = useState<Record<string, any>>({
    priority: "NORMAL",
    templateVersionId: firstTemplate?.id ?? "",
    content: {},
  });
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const update = (key: string, value: any) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updateContent = (key: string, value: any) =>
    setForm((current) => ({
      ...current,
      content: { ...current.content, [key]: value },
    }));
  const selectedTemplate = templates.find(
    (item) => item.id === form.templateVersionId,
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    const base = `/client-portal/organizations/${organizationId}`;
    if (kind === "log")
      return mutate(
        () =>
          apiPost(`${base}/operational-log/entries`, {
            buildingId,
            eventAt: new Date().toISOString(),
            activityType: form.activityType,
            category: form.category,
            priority: form.priority,
            description: form.description,
            followUpRequired: false,
            idempotencyKey: uuid(),
          }),
        "Entrée ajoutée à la main courante.",
      );
    if (kind === "shifts") {
      const now = Date.now();
      return mutate(
        () =>
          apiPost(`${base}/operational-shifts`, {
            buildingId,
            securityPost: form.securityPost,
            teamName: form.teamName || undefined,
            responsibleUserId: form.responsibleUserId,
            plannedStartAt: new Date(now).toISOString(),
            plannedEndAt: new Date(now + 8 * 3600000).toISOString(),
            participants: [],
            idempotencyKey: uuid(),
          }),
        "Quart créé.",
      );
    }
    if (kind === "directives")
      return mutate(
        () =>
          apiPost(`${base}/operations/directives`, {
            buildingId,
            title: form.title,
            description: form.description,
            type: "OPERATIONAL_NOTICE",
            priority: form.priority,
            targetCriteria: { buildingId },
            acknowledgementRequired: true,
            idempotencyKey: uuid(),
          }),
        "Consigne créée.",
      );
    if (kind === "followups")
      return mutate(
        () =>
          apiPost(`${base}/operations/follow-ups`, {
            buildingId,
            sourceType: "OBSERVATION",
            sourceId: form.sourceId || uuid(),
            description: form.description,
            priority: form.priority,
            dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
            idempotencyKey: uuid(),
          }),
        "Suivi créé.",
      );
    const template = selectedTemplate;
    if (!template) {
      setFormError(
        "Sélectionnez un formulaire publié avec une politique de conservation active.",
      );
      return;
    }
    const prepared = prepareReportContent(template.formSchema, form.content);
    setFieldErrors(prepared.errors);
    if (Object.keys(prepared.errors).length) {
      setFormError("Vérifiez les champs indiqués avant de créer le brouillon.");
      return;
    }
    setFormError("");
    return mutate(
      () =>
        apiPost(`${base}/incident-reports`, {
          buildingId,
          templateVersionId: template.id,
          retentionPolicyId: template.retentionPolicyId,
          reportType: template.reportType,
          title: form.title,
          content: prepared.normalized,
          idempotencyKey: uuid(),
        }),
      "Brouillon de rapport créé.",
      (reason) => {
        const details =
          reason instanceof ApiError && Array.isArray(reason.details)
            ? reason.details.filter(
                (value): value is string => typeof value === "string",
              )
            : [];
        setFormError(
          details.length
            ? `${errorMessage(reason)} ${details.join(" ")}`
            : errorMessage(reason),
        );
      },
    );
  }
  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form className={styles.dialog} onSubmit={(event) => void submit(event)}>
        <header>
          <div>
            <p className={styles.eyebrow}>Nouvel élément</p>
            <h2>{labels[kind]}</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>
        {kind === "reports" && (
          <>
            {eligibleTemplates.length === 0 ? (
              <div className={styles.emptyForm} role="status">
                <FileText size={24} />
                <strong>Aucun formulaire de rapport disponible</strong>
                <p>
                  Aucun formulaire publié ne possède une politique de
                  conservation active.
                </p>
              </div>
            ) : (
              <>
                <Field label="Formulaire">
                  <select
                    required
                    value={form.templateVersionId}
                    onChange={(event) => {
                      setFormError("");
                      update("templateVersionId", event.target.value);
                    }}
                  >
                    <option value="">Sélectionner</option>
                    {eligibleTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {ineligibleTemplates.length > 0 && (
                  <div className={styles.templateWarning} role="status">
                    <strong>
                      {ineligibleTemplates.length} formulaire
                      {ineligibleTemplates.length === 1 ? "" : "s"} non
                      disponible{ineligibleTemplates.length === 1 ? "" : "s"}
                    </strong>
                    <ul>
                      {ineligibleTemplates.map((template) => (
                        <li key={template.id}>
                          {template.name}:{" "}
                          {!template.retentionPolicyId
                            ? "politique de conservation active requise"
                            : "schéma de formulaire utilisable requis"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Field label="Titre du rapport">
                  <input
                    required
                    maxLength={240}
                    onChange={(event) => update("title", event.target.value)}
                  />
                </Field>
                {selectedTemplate && (
                  <ReportFields
                    schema={selectedTemplate.formSchema}
                    content={form.content}
                    errors={fieldErrors}
                    onChange={(key, value) => {
                      setFormError("");
                      setFieldErrors((current) => {
                        const next = { ...current };
                        delete next[key];
                        return next;
                      });
                      updateContent(key, value);
                    }}
                  />
                )}
              </>
            )}
            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}
          </>
        )}
        {kind === "shifts" ? (
          <>
            <Field label="Poste">
              <input
                required
                maxLength={120}
                onChange={(event) => update("securityPost", event.target.value)}
              />
            </Field>
            <Field label="Identifiant du responsable">
              <input
                required
                type="text"
                onChange={(event) =>
                  update("responsibleUserId", event.target.value)
                }
              />
            </Field>
            <Field label="Équipe">
              <input
                maxLength={120}
                onChange={(event) => update("teamName", event.target.value)}
              />
            </Field>
          </>
        ) : (
          kind !== "reports" && (
            <>
              <Field
                label={
                  kind === "log"
                    ? "Type d’activité"
                    : kind === "followups"
                      ? "Description"
                      : "Titre"
                }
              >
                <input
                  required
                  maxLength={kind === "log" ? 80 : 200}
                  onChange={(event) =>
                    update(
                      kind === "log"
                        ? "activityType"
                        : kind === "followups"
                          ? "description"
                          : "title",
                      event.target.value,
                    )
                  }
                />
              </Field>
              {kind === "log" && (
                <Field label="Catégorie">
                  <input
                    required
                    maxLength={80}
                    onChange={(event) => update("category", event.target.value)}
                  />
                </Field>
              )}
              {kind !== "followups" && (
                <Field label="Description">
                  <textarea
                    required
                    rows={5}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                </Field>
              )}
            </>
          )
        )}
        {kind !== "reports" && kind !== "shifts" && (
          <Field label="Priorité">
            <select
              value={form.priority}
              onChange={(event) => update("priority", event.target.value)}
            >
              <option>NORMAL</option>
              <option>IMPORTANT</option>
              <option>CRITICAL</option>
              {kind === "log" && (
                <>
                  <option>LOW</option>
                  <option>HIGH</option>
                </>
              )}
            </select>
          </Field>
        )}
        <footer>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Annuler
          </button>
          <button
            className={styles.primary}
            disabled={
              busy || (kind === "reports" && eligibleTemplates.length === 0)
            }
          >
            {busy && <Loader2 className={styles.spin} size={16} />}Créer
          </button>
        </footer>
      </form>
    </div>
  );
}

function conditionVisible(condition: Item | undefined, content: Item): boolean {
  if (!condition) return true;
  if (Array.isArray(condition.all))
    return condition.all.every((item: Item) => conditionVisible(item, content));
  if (Array.isArray(condition.any))
    return condition.any.some((item: Item) => conditionVisible(item, content));
  if (condition.not) return !conditionVisible(condition.not, content);
  const actual = content[condition.fieldKey];
  if (condition.operator === "PRESENT")
    return actual !== undefined && actual !== null && actual !== "";
  if (condition.operator === "EQ") return actual === condition.value;
  if (condition.operator === "NEQ") return actual !== condition.value;
  return Array.isArray(condition.value) && condition.value.includes(actual);
}

function ReportFields({
  schema,
  content,
  errors,
  onChange,
  disabled = false,
}: {
  schema?: Item;
  content: Item;
  errors: Record<string, string>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [preview, setPreview] = useState(false);
  const sections = (schema?.sections ?? []) as Item[];
  if (!sections.length)
    return (
      <p className={styles.help}>
        Le formulaire sélectionné ne contient aucun champ utilisable.
      </p>
    );
  const safeIndex = Math.min(sectionIndex, Math.max(0, sections.length - 1));
  const section = sections[safeIndex];
  if (preview)
    return (
      <div className={styles.reportForm}>
        <div className={styles.formProgress}>
          <strong>Aperçu</strong>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setPreview(false)}
          >
            Modifier
          </button>
        </div>
        {sections.map((item: Item) => (
          <section className={styles.previewSection} key={item.key}>
            <h3>{item.title}</h3>
            {(item.fields ?? [])
              .filter((field: Item) =>
                conditionVisible(field.visibleWhen, content),
              )
              .map((field: Item) => (
                <div key={field.key}>
                  <strong>{field.label}</strong>
                  <span>
                    {Array.isArray(content[field.key])
                      ? `${content[field.key].length} élément(s)`
                      : content[field.key] === true
                        ? "Oui"
                        : content[field.key] === false
                          ? "Non"
                          : String(content[field.key] ?? "Non renseigné")}
                  </span>
                </div>
              ))}
          </section>
        ))}
      </div>
    );
  return (
    <div className={styles.reportForm}>
      <div className={styles.formProgress}>
        <span>
          Section {safeIndex + 1} sur {sections.length}
        </span>
        <strong>{section?.title}</strong>
      </div>
      {section && (
        <fieldset key={section.key} disabled={disabled}>
          <legend>{section.title}</legend>
          {(section.fields ?? [])
            .filter((field: Item) =>
              conditionVisible(field.visibleWhen, content),
            )
            .map((field: Item) =>
              field.type === "REPEATABLE_SECTION" ? (
                <RepeatableField
                  key={field.key}
                  field={field}
                  value={content[field.key] ?? []}
                  onChange={(value) => onChange(field.key, value)}
                  disabled={disabled}
                />
              ) : (
                <ReportInput
                  key={field.key}
                  field={field}
                  value={content[field.key]}
                  error={errors[field.key]}
                  onChange={(value) => onChange(field.key, value)}
                />
              ),
            )}
        </fieldset>
      )}
      <div className={styles.sectionNavigation}>
        <button
          type="button"
          className={styles.secondary}
          disabled={safeIndex === 0}
          onClick={() => setSectionIndex((value) => Math.max(0, value - 1))}
        >
          Précédent
        </button>
        {safeIndex < sections.length - 1 ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() =>
              setSectionIndex((value) =>
                Math.min(sections.length - 1, value + 1),
              )
            }
          >
            Suivant
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            onClick={() => setPreview(true)}
          >
            Vérifier l’aperçu
          </button>
        )}
      </div>
    </div>
  );
}

function ReportInput({
  field,
  value,
  error,
  onChange,
}: {
  field: Item;
  value: any;
  error?: string;
  onChange: (value: any) => void;
}) {
  const constraints = field.constraints ?? {};
  return (
    <Field label={`${field.label}${field.required ? " *" : ""}`} error={error}>
      {field.type === "LONG_TEXT" ? (
        <textarea
          aria-invalid={Boolean(error)}
          required={field.required}
          minLength={constraints.minLength}
          maxLength={constraints.maxLength}
          rows={4}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === "SELECT" || field.type === "RADIO" ? (
        <select
          aria-invalid={Boolean(error)}
          required={field.required}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Sélectionner</option>
          {(field.options ?? []).map((option: Item) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "MULTI_SELECT" ? (
        <select
          multiple
          aria-invalid={Boolean(error)}
          value={Array.isArray(value) ? value : []}
          onChange={(event) =>
            onChange(
              Array.from(
                event.target.selectedOptions,
                (option) => option.value,
              ),
            )
          }
        >
          {(field.options ?? []).map((option: Item) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "CHECKBOX" ? (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      ) : (
        <>
          <input
            aria-invalid={Boolean(error)}
            required={field.required}
            minLength={constraints.minLength}
            maxLength={constraints.maxLength}
            min={constraints.min}
            max={constraints.max}
            type={
              field.type === "NUMBER"
                ? "number"
                : field.type === "DATE"
                  ? "date"
                  : field.type === "TIME"
                    ? "time"
                    : field.type === "DATETIME"
                      ? "datetime-local"
                      : "text"
            }
            value={value ?? ""}
            onChange={(event) =>
              onChange(
                field.type === "NUMBER" && event.target.value !== ""
                  ? Number(event.target.value)
                  : event.target.value,
              )
            }
          />
          {field.type === "DATETIME" && (
            <small className={styles.help}>
              Heure locale de cet appareil; elle sera enregistrée avec son
              fuseau.
            </small>
          )}
        </>
      )}
    </Field>
  );
}

function RepeatableField({
  field,
  value,
  onChange,
  disabled = false,
}: {
  field: Item;
  value: Item[];
  onChange: (value: Item[]) => void;
  disabled?: boolean;
}) {
  const maxItems = field.constraints?.maxItems ?? field.maxItems ?? 100;
  return (
    <div className={styles.repeatable}>
      <div className={styles.repeatableTitle}>
        <strong>{field.label}</strong>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onChange([...value, {}])}
          disabled={disabled || value.length >= maxItems}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
      {value.map((item, index) => (
        <div className={styles.repeatableRow} key={index}>
          {(field.children ?? []).map((child: Item) => (
            <ReportInput
              key={child.key}
              field={child}
              value={item[child.key]}
              onChange={(childValue) =>
                onChange(
                  value.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, [child.key]: childValue }
                      : row,
                  ),
                )
              }
            />
          ))}
          <button
            type="button"
            className={styles.remove}
            disabled={disabled}
            onClick={() =>
              onChange(value.filter((_, rowIndex) => rowIndex !== index))
            }
          >
            Retirer
          </button>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error && (
        <small className={styles.fieldError} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
function Loading() {
  return (
    <div className={styles.loading}>
      <Loader2 className={styles.spin} size={24} />
      Chargement sécurisé…
    </div>
  );
}

/** M8-02 : une saisie faite plus d'une heure après l'événement est signalée. */
const LATE_ENTRY_THRESHOLD_MINUTES = 60;
function lateEntryMinutes(item: { eventAt?: string; recordedAt?: string }): number | null {
  if (!item.eventAt || !item.recordedAt) return null;
  const minutes = Math.round((Date.parse(item.recordedAt) - Date.parse(item.eventAt)) / 60000);
  return Number.isFinite(minutes) && minutes > LATE_ENTRY_THRESHOLD_MINUTES ? minutes : null;
}
function formatDelay(minutes: number): string {
  if (minutes < 120) return `${minutes} min`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} j`;
}
