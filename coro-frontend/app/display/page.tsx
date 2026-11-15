"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/auth.store";
import styles from "./display.module.css";
import ObservationManager from "./ObservationManager";
import DeviceSupervision, { type SupervisedDevice } from "./DeviceSupervision";
import EmergencyOperations from "./EmergencyOperations";

type Location = {
  id: string;
  floorId: string;
  zoneId: string | null;
  code: string;
  label: string;
  status: string;
  lockVersion: number;
  youAreHereX: number | null;
  youAreHereY: number | null;
  orientationDegrees: number | null;
};
type Floor = {
  id: string;
  code?: string;
  name: string;
  zones: { id: string; name: string }[];
  displayLocations: Location[];
};
type Building = {
  id: string;
  name: string;
  city: string;
  spatialFloors: Floor[];
};
type Plan = {
  id: string;
  buildingId: string;
  floorId: string;
  locationId: string;
  sourceVersion: number;
  sourceSha256: string;
  versionNumber: number;
  variantVersion: number;
  variantSha256: string | null;
  widthPixels: number | null;
  heightPixels: number | null;
  orientation: string;
  language: string;
  status: string;
  lockVersion: number;
  location: { label: string };
  building: { name: string };
  floor: { name: string };
  projectFile: { name: string };
};
type Source = {
  id: string;
  projectId: string | null;
  buildingId: string | null;
  name: string;
  version: number;
  sha256: string | null;
};
type Event = {
  id: string;
  action: string;
  toStatus: string;
  createdAt: string;
};
type PdfRenderJob = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  pageNumber: number;
  failureCode: string | null;
  failureDetail: string | null;
};
type Workspace = {
  capabilities: Record<string, boolean>;
  dashboard: {
    buildingCount: number;
    locationCount: number;
    planCount: number;
    anomalyCount: number;
    devices: {
      available: boolean;
      count: number | null;
      active: number;
      revoked: number;
    };
  };
  buildings: Building[];
  plans: Plan[];
  eligiblePdfSources: Source[];
  recentEvents: Event[];
  devices: SupervisedDevice[];
};
const LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  REVIEW: "En revue",
  APPROVED: "Approuvé",
  PUBLISHED: "Publié",
  SUSPENDED: "Suspendu",
  SUPERSEDED: "Remplacé",
  REVOKED: "Révoqué",
};
const errorMessage = (e: unknown, fallback: string) => {
  const candidate = e as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || fallback;
};

export default function DisplayManagerPage() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [building, setBuilding] = useState("ALL");
  const [requestedBuildingId, setRequestedBuildingId] = useState("");
  const [selected, setSelected] = useState<Plan | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [profile, setProfile] = useState("SCREEN_16X9");
  const [sourceId, setSourceId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [orientation, setOrientation] = useState("LANDSCAPE");
  const [language, setLanguage] = useState("FR");
  const [locationBuildingId, setLocationBuildingId] = useState("");
  const [spatialFloorId, setSpatialFloorId] = useState("__NEW__");
  const [spatialZoneId, setSpatialZoneId] = useState("");
  const [floorCode, setFloorCode] = useState("");
  const [floorName, setFloorName] = useState("");
  const [zoneCode, setZoneCode] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationYouAreHereX, setLocationYouAreHereX] = useState("0.5");
  const [locationYouAreHereY, setLocationYouAreHereY] = useState("0.5");
  const [locationOrientationDegrees, setLocationOrientationDegrees] =
    useState("0");
  const [locationToCompleteId, setLocationToCompleteId] = useState("");
  const [renderPage, setRenderPage] = useState("");
  const [renderStatus, setRenderStatus] = useState("");
  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const workspace = (
        await api.get<Workspace>(`/organizations/${orgId}/display-manager`)
      ).data;
      setData(workspace);
      return workspace;
    } catch (e: unknown) {
      setError(errorMessage(e, "Impossible de charger CORO Display."));
    } finally {
      setLoading(false);
    }
  }, [orgId]);
  useEffect(() => {
    // The callback synchronizes this client route with its authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    const buildingId = new URLSearchParams(window.location.search).get(
      "buildingId",
    );
    if (buildingId) setRequestedBuildingId(buildingId);
  }, []);
  useEffect(() => {
    if (!data || !requestedBuildingId) return;
    if (data.buildings.some((item) => item.id === requestedBuildingId)) {
      setBuilding(requestedBuildingId);
      return;
    }
    setError("Ce bâtiment n’est pas accessible dans CORO Display.");
  }, [data, requestedBuildingId]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const plans = useMemo(
    () =>
      (data?.plans || []).filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          (filter === "ALL" || p.status === filter) &&
          (building === "ALL" || p.buildingId === building) &&
          (!q ||
            `${p.building.name} ${p.floor.name} ${p.location.label} ${p.projectFile.name}`
              .toLowerCase()
              .includes(q))
        );
      }),
    [data, query, filter, building],
  );
  const showPreview = async (p: Plan) => {
    if (!orgId || !p.variantSha256) return;
    setBusy(true);
    try {
      const r = await api.get(
        `/organizations/${orgId}/buildings/${p.buildingId}/display-plan-publications/${p.id}/variant`,
        { responseType: "blob" },
      );
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(r.data));
      setSelected(p);
    } catch (e: unknown) {
      setError(errorMessage(e, "Variante privée indisponible."));
    } finally {
      setBusy(false);
    }
  };

  const createDisplayLocation = async () => {
    if (!orgId || !locationBuildingId) {
      setError("Selectionnez le batiment de l'ecran.");
      return;
    }
    if (!locationCode.trim() || !locationLabel.trim()) {
      setError("Le code et le nom de l'emplacement sont obligatoires.");
      return;
    }
    const youAreHereX = Number(locationYouAreHereX);
    const youAreHereY = Number(locationYouAreHereY);
    const orientationDegrees = Number(locationOrientationDegrees);
    if (
      !Number.isFinite(youAreHereX) ||
      !Number.isFinite(youAreHereY) ||
      youAreHereX < 0 ||
      youAreHereX > 1 ||
      youAreHereY < 0 ||
      youAreHereY > 1 ||
      !Number.isFinite(orientationDegrees) ||
      orientationDegrees < 0 ||
      orientationDegrees > 360
    ) {
      setError(
        "Le repere X/Y doit etre compris entre 0 et 1 et l'orientation entre 0 et 360 degres.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const base = `/organizations/${orgId}/buildings/${locationBuildingId}/spatial`;
      let targetFloorId = spatialFloorId;
      if (targetFloorId === "__NEW__") {
        if (!floorCode.trim() || !floorName.trim()) {
          throw new Error("Renseignez le code et le nom du nouvel etage.");
        }
        const floor = await api.post(`${base}/floors`, {
          code: floorCode.trim().toUpperCase(),
          name: floorName.trim(),
        });
        targetFloorId = floor.data.id;
      }

      let targetZoneId = spatialZoneId;
      if (targetZoneId === "__NEW__") {
        if (!zoneCode.trim() || !zoneName.trim()) {
          throw new Error("Renseignez le code et le nom de la nouvelle zone.");
        }
        const zone = await api.post(`${base}/floors/${targetFloorId}/zones`, {
          code: zoneCode.trim().toUpperCase(),
          name: zoneName.trim(),
        });
        targetZoneId = zone.data.id;
      }

      await api.post(`${base}/display-locations`, {
        floorId: targetFloorId,
        ...(targetZoneId ? { zoneId: targetZoneId } : {}),
        code: locationCode.trim().toUpperCase(),
        label: locationLabel.trim(),
        youAreHereX,
        youAreHereY,
        orientationDegrees,
      });
      setFloorCode("");
      setFloorName("");
      setZoneCode("");
      setZoneName("");
      setLocationCode("");
      setLocationLabel("");
      setLocationYouAreHereX("0.5");
      setLocationYouAreHereY("0.5");
      setLocationOrientationDegrees("0");
      setSpatialFloorId("__NEW__");
      setSpatialZoneId("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, e instanceof Error ? e.message : "Impossible de creer l'emplacement Display."));
    } finally {
      setBusy(false);
    }
  };
  const act = async (action: string) => {
    if (!selected || !orgId) return;
    if (!reason.trim()) {
      setError(
        "Un motif ou une observation est requis pour tracer cette action.",
      );
      return;
    }
    if (
      ["suspend", "resume", "revoke"].includes(action) &&
      !window.confirm(`Confirmer l’action « ${action} » sur cette version?`)
    )
      return;
    setBusy(true);
    try {
      await api.post(
        `/organizations/${orgId}/buildings/${selected.buildingId}/display-plan-publications/${selected.id}/${action}`,
        {
          requestId: crypto.randomUUID(),
          expectedLockVersion: selected.lockVersion,
          reason: reason.trim(),
        },
      );
      setSelected(null);
      setReason("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, "Action refusée; aucune donnée modifiée."));
    } finally {
      setBusy(false);
    }
  };
  const generatePdfPreview = async () => {
    if (!selected || !orgId || busy) return;
    const pageNumber = Number(renderPage);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 100) {
      setError(
        "Choisissez explicitement la page PDF à afficher (entre 1 et 100).",
      );
      return;
    }
    setBusy(true);
    setError("");
    setRenderStatus("Mise en file du rendu PDF sécurisé…");
    try {
      const requestId = crypto.randomUUID();
      const created = (
        await api.post<PdfRenderJob>(
          `/organizations/${orgId}/buildings/${selected.buildingId}/display-plan-publications/${selected.id}/pdf-render-jobs`,
          { requestId, pageNumber, targetDpi: 300 },
        )
      ).data;
      let job = created;
      const deadline = Date.now() + 60_000;
      while (!["SUCCEEDED", "FAILED", "CANCELLED"].includes(job.status)) {
        if (Date.now() >= deadline)
          throw new Error(
            "Le rendu continue en arrière-plan. Actualisez l’état dans quelques instants.",
          );
        setRenderStatus(
          job.status === "PROCESSING"
            ? `Conversion de la page ${pageNumber} en cours…`
            : "Rendu en attente du worker sécurisé…",
        );
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        job = (
          await api.get<PdfRenderJob>(
            `/organizations/${orgId}/buildings/${selected.buildingId}/display-plan-publications/${selected.id}/pdf-render-jobs/${created.id}`,
          )
        ).data;
      }
      if (job.status !== "SUCCEEDED")
        throw new Error(
          job.failureDetail ||
            `Le moteur PDF a refusé le document (${job.failureCode || job.status}).`,
        );
      setRenderStatus(`Aperçu de la page ${pageNumber} généré avec succès.`);
      const workspace = await load();
      const updated = workspace?.plans.find((plan) => plan.id === selected.id);
      if (!updated?.variantSha256)
        throw new Error("Le rendu est terminé, mais la variante demeure introuvable.");
      await showPreview(updated);
    } catch (e: unknown) {
      setError(
        errorMessage(e, e instanceof Error ? e.message : "Échec du rendu PDF."),
      );
      setRenderStatus("");
    } finally {
      setBusy(false);
    }
  };
  const approvePlan = async () => {
    if (!selected || !orgId || !selected.variantSha256 || !reason.trim()) {
      setError(
        "La variante, le profil et une observation sont requis pour approuver.",
      );
      return;
    }
    if (
      !window.confirm(
        "Confirmer l’approbation de cette preuve visuelle exacte?",
      )
    )
      return;
    setBusy(true);
    try {
      await api.post(
        `/organizations/${orgId}/buildings/${selected.buildingId}/display-plan-publications/${selected.id}/approve`,
        {
          requestId: crypto.randomUUID(),
          expectedLockVersion: selected.lockVersion,
          reason: reason.trim(),
          sourceVersion: selected.sourceVersion,
          sourceSha256: selected.sourceSha256,
          variantVersion: selected.variantVersion,
          variantSha256: selected.variantSha256,
          profile,
          locationId: selected.locationId,
          observations: reason.trim(),
        },
      );
      setSelected(null);
      setReason("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, "Approbation refusée; aucune donnée modifiée."));
    } finally {
      setBusy(false);
    }
  };
  const publishPlan = async () => {
    if (!selected || !orgId || !reason.trim()) {
      setError("Un motif est requis pour publier.");
      return;
    }
    if (
      !window.confirm(
        "Confirmer la publication interne de cette version approuvée?",
      )
    )
      return;
    setBusy(true);
    try {
      await api.post(
        `/organizations/${orgId}/buildings/${selected.buildingId}/display-plan-publications/${selected.id}/publish`,
        {
          requestId: crypto.randomUUID(),
          expectedLockVersion: selected.lockVersion,
          reason: reason.trim(),
        },
      );
      setSelected(null);
      setReason("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, "Publication refusée; aucune donnée modifiée."));
    } finally {
      setBusy(false);
    }
  };
  const source = data?.eligiblePdfSources.find((s) => s.id === sourceId);
  const sourceBuilding = data?.buildings.find(
    (b) => b.id === source?.buildingId,
  );
  const allSourceLocations =
    sourceBuilding?.spatialFloors.flatMap((f) =>
      f.displayLocations.map((l) => ({ ...l, floorId: f.id })),
    ) || [];
  const sourceLocations = allSourceLocations.filter(
    (l) =>
      l.status === "ACTIVE" &&
      l.youAreHereX != null &&
      l.youAreHereY != null &&
      l.orientationDegrees != null,
  );
  const incompleteSourceLocations = allSourceLocations.filter(
    (l) => !sourceLocations.some((eligible) => eligible.id === l.id),
  );
  const locationBuilding = data?.buildings.find(
    (item) => item.id === locationBuildingId,
  );
  const locationFloor = locationBuilding?.spatialFloors.find(
    (item) => item.id === spatialFloorId,
  );
  const createPlan = async () => {
    const location = sourceLocations.find((l) => l.id === locationId);
    if (!orgId || !source?.buildingId || !location) {
      setError(
        "Sélectionnez une source approuvée et un emplacement du même bâtiment.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/organizations/${orgId}/buildings/${source.buildingId}/display-plan-publications`,
        {
          floorId: location.floorId,
          zoneId: location.zoneId || undefined,
          locationId: location.id,
          projectFileId: source.id,
          sourceVersion: source.version,
          orientation,
          language,
          requestId: crypto.randomUUID(),
        },
      );
      setSourceId("");
      setLocationId("");
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, "Création refusée; aucune donnée modifiée."));
    } finally {
      setBusy(false);
    }
  };
  const completeDisplayLocation = async (location: Location) => {
    if (!orgId || !source?.buildingId) return;
    const youAreHereX = Number(locationYouAreHereX);
    const youAreHereY = Number(locationYouAreHereY);
    const orientationDegrees = Number(locationOrientationDegrees);
    if (
      !Number.isFinite(youAreHereX) ||
      !Number.isFinite(youAreHereY) ||
      youAreHereX < 0 ||
      youAreHereX > 1 ||
      youAreHereY < 0 ||
      youAreHereY > 1 ||
      !Number.isFinite(orientationDegrees) ||
      orientationDegrees < 0 ||
      orientationDegrees > 360
    ) {
      setError(
        "Le repere X/Y doit etre compris entre 0 et 1 et l'orientation entre 0 et 360 degres.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.patch(
        `/organizations/${orgId}/buildings/${source.buildingId}/spatial/display-locations/${location.id}`,
        {
          expectedLockVersion: location.lockVersion,
          youAreHereX,
          youAreHereY,
          orientationDegrees,
        },
      );
      setLocationToCompleteId("");
      await load();
      setLocationId(location.id);
    } catch (e: unknown) {
      setError(
        errorMessage(e, "Impossible de completer l'emplacement Display."),
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <AppLayout>
        <main className={styles.shell}>
          Chargement du gestionnaire Display…
        </main>
      </AppLayout>
    );
  if (!data)
    return (
      <AppLayout>
        <main className={styles.shell}>
          <h1>CORO Display</h1>
          <div className={styles.error}>{error || "Accès indisponible."}</div>
        </main>
      </AppLayout>
    );
  return (
    <AppLayout>
      <main className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span>Exploitation des plans d’évacuation</span>
            <h1>Display Manager</h1>
            <p>
              Préparer, contrôler et gouverner les affichages depuis les
              autorités existantes.
            </p>
          </div>
          <button onClick={() => void load()}>Actualiser</button>
        </header>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        {requestedBuildingId && building !== "ALL" && (
          <div className={styles.contextBanner} role="status">
            <span>
              Contexte bâtiment : {data.buildings.find((item) => item.id === building)?.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setBuilding("ALL");
                setRequestedBuildingId("");
                window.history.replaceState(null, "", "/display");
              }}
            >
              Voir tous les bâtiments
            </button>
          </div>
        )}
        <section className={styles.metrics}>
          <article>
            <b>{data.dashboard.buildingCount}</b>Bâtiments autorisés
          </article>
          <article>
            <b>{data.dashboard.locationCount}</b>Emplacements
          </article>
          <article>
            <b>{data.dashboard.planCount}</b>Versions
          </article>
          <article>
            <b>{data.dashboard.anomalyCount}</b>Sans plan actif
          </article>
          <article>
            <b>{data.dashboard.devices.count ?? "—"}</b>Appareils supervisés
          </article>
        </section>
        <div className={styles.layout}>
          <aside className={styles.tree}>
            <h2>Implantation</h2>
            {data.buildings.map((b) => (
              <details key={b.id} open>
                <summary>
                  {b.name}
                  <small>{b.city}</small>
                </summary>
                {b.spatialFloors.map((f) => (
                  <div className={styles.floor} key={f.id}>
                    <strong>{f.name}</strong>
                    <span>{f.displayLocations.length} emplacement(s)</span>
                    {f.zones.map((z) => (
                      <small key={z.id}>Zone · {z.name}</small>
                    ))}
                  </div>
                ))}
              </details>
            ))}
          </aside>
          <section className={styles.library}>
            <div className={styles.heading}>
              <div>
                <h2>Bibliothèque des plans</h2>
                <p>{plans.length} résultat(s)</p>
              </div>
              {data.capabilities.DISPLAY_PLAN_CREATE && (
                <Link href="/projects">Importer via CORO Documents</Link>
              )}
            </div>
            <div className={styles.filters}>
              <label>
                Rechercher
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bâtiment, étage, emplacement…"
                />
              </label>
              <label>
                Bâtiment
                <select
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                >
                  <option value="ALL">Tous</option>
                  {data.buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Statut
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="ALL">Tous</option>
                  {Object.entries(LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!plans.length ? (
              <div className={styles.empty}>
                <h3>Aucun plan ne correspond</h3>
                <button
                  onClick={() => {
                    setQuery("");
                    setFilter("ALL");
                    setBuilding("ALL");
                  }}
                >
                  Tout afficher
                </button>
              </div>
            ) : (
              <div className={styles.cards}>
                {plans.map((p) => (
                  <article className={styles.card} key={p.id}>
                    <div className={styles.cardTop}>
                      <span>{LABELS[p.status] || p.status}</span>
                      <small>
                        v{p.versionNumber} · source v{p.sourceVersion}
                      </small>
                    </div>
                    <h3>{p.location.label}</h3>
                    <p>
                      {p.building.name} · {p.floor.name}
                    </p>
                    <dl>
                      <div>
                        <dt>Document</dt>
                        <dd>{p.projectFile.name}</dd>
                      </div>
                      <div>
                        <dt>Profil</dt>
                        <dd>
                          {p.orientation} · {p.language}
                        </dd>
                      </div>
                      <div>
                        <dt>Variante</dt>
                        <dd>
                          {p.variantSha256
                            ? `${p.widthPixels || "?"} × ${p.heightPixels || "?"}`
                            : "À générer"}
                        </dd>
                      </div>
                    </dl>
                    <div className={styles.actions}>
                      <button
                        onClick={() => {
                          setSelected(p);
                          setPreview("");
                        }}
                      >
                        Détails
                      </button>
                      <button
                        disabled={!p.variantSha256 || busy}
                        onClick={() => void showPreview(p)}
                      >
                        Aperçu
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        {data.capabilities.DISPLAY_DEVICE_MANAGE && (
          <section className={styles.bottom} aria-labelledby="display-location-title">
            <article>
              <h2 id="display-location-title">Ajouter un ecran</h2>
              <p>
                {"Definissez son emplacement dans le batiment. Ces donnees seront reutilisees pour les publications et l'activation du Player."}
              </p>
              <div className={styles.createForm}>
                <label>
                  Batiment
                  <select
                    value={locationBuildingId}
                    onChange={(event) => {
                      setLocationBuildingId(event.target.value);
                      setSpatialFloorId("__NEW__");
                      setSpatialZoneId("");
                    }}
                  >
                    <option value="">Choisir...</option>
                    {data.buildings.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Etage
                  <select
                    value={spatialFloorId}
                    disabled={!locationBuildingId}
                    onChange={(event) => {
                      setSpatialFloorId(event.target.value);
                      setSpatialZoneId("");
                    }}
                  >
                    <option value="__NEW__">Creer un nouvel etage</option>
                    {locationBuilding?.spatialFloors.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                {spatialFloorId === "__NEW__" && (
                  <div>
                    <label>
                      Code etage
                      <input value={floorCode} onChange={(event) => setFloorCode(event.target.value)} placeholder="E03" />
                    </label>
                    <label>
                      {"Nom de l'etage"}
                      <input value={floorName} onChange={(event) => setFloorName(event.target.value)} placeholder="Etage 3" />
                    </label>
                  </div>
                )}
                <label>
                  Zone (facultative)
                  <select
                    value={spatialZoneId}
                    disabled={!locationBuildingId}
                    onChange={(event) => setSpatialZoneId(event.target.value)}
                  >
                    <option value="">Aucune zone</option>
                    <option value="__NEW__">Creer une nouvelle zone</option>
                    {locationFloor?.zones.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                {spatialZoneId === "__NEW__" && (
                  <div>
                    <label>
                      Code zone
                      <input value={zoneCode} onChange={(event) => setZoneCode(event.target.value)} placeholder="E03-DEMO" />
                    </label>
                    <label>
                      Nom de la zone
                      <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="Zone pilote" />
                    </label>
                  </div>
                )}
                <div>
                  <label>
                    Code emplacement
                    <input value={locationCode} onChange={(event) => setLocationCode(event.target.value)} placeholder="E03-DISPLAY-PILOT" />
                  </label>
                  <label>
                    Nom visible
                    <input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Ecran pilote Tour Premont" />
                  </label>
                </div>
                <div>
                  <label>
                    Repere horizontal (0 a 1)
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={locationYouAreHereX}
                      onChange={(event) =>
                        setLocationYouAreHereX(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Repere vertical (0 a 1)
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={locationYouAreHereY}
                      onChange={(event) =>
                        setLocationYouAreHereY(event.target.value)
                      }
                    />
                  </label>
                </div>
                <label>
                  Orientation du regard (degres)
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step="1"
                    value={locationOrientationDegrees}
                    onChange={(event) =>
                      setLocationOrientationDegrees(event.target.value)
                    }
                  />
                </label>
                <button disabled={busy || !locationBuildingId} onClick={() => void createDisplayLocation()}>
                  {"Creer l'emplacement"}
                </button>
              </div>
            </article>
            <article>
              <h2>Prochaine etape</h2>
              <p>
                Importez le PDF dans CORO Documents, faites-le approuver, puis
                revenez ici pour creer la publication Display.
              </p>
              <Link href="/projects">Ouvrir CORO Documents</Link>
            </article>
          </section>
        )}
        <DeviceSupervision
          devices={data.devices}
          buildingNames={Object.fromEntries(
            data.buildings.map((item) => [item.id, item.name]),
          )}
        />
        {orgId && data.capabilities.DISPLAY_READ && (
          <EmergencyOperations
            organizationId={orgId}
            buildings={data.buildings.map(({ id, name }) => ({ id, name }))}
            capabilities={data.capabilities}
          />
        )}
        <section className={styles.bottom}>
          <article>
            <h2>Créer depuis un PDF approuvé</h2>
            {data.capabilities.DISPLAY_PLAN_CREATE &&
            data.eligiblePdfSources.length ? (
              <div className={styles.createForm}>
                <label>
                  Source
                  <select
                    value={sourceId}
                    onChange={(e) => {
                      setSourceId(e.target.value);
                      setLocationId("");
                    }}
                  >
                    <option value="">Choisir…</option>
                    {data.eligiblePdfSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · v{s.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Emplacement
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    disabled={!sourceId}
                  >
                    <option value="">Choisir…</option>
                    {sourceLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                {sourceId && !allSourceLocations.length && (
                  <p className={styles.locationGuidance}>
                    {"Aucun emplacement n'existe dans ce batiment. "}
                    <a href="#display-location-title">Ajouter un emplacement</a>.
                  </p>
                )}
                {sourceId && incompleteSourceLocations.length > 0 && (
                  <div className={styles.locationGuidance} role="status">
                    <strong>Emplacement non admissible</strong>
                    <p>
                      {"Completez le repere « Vous etes ici » et l'orientation avant de creer une publication."}
                    </p>
                    {incompleteSourceLocations.map((location) => (
                      <div className={styles.locationIssue} key={location.id}>
                        <span>{location.label}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setLocationToCompleteId(location.id)}
                        >
                          {"Completer l'emplacement"}
                        </button>
                        {locationToCompleteId === location.id && (
                          <div className={styles.locationCompletion}>
                            <label>
                              Repere horizontal (0 a 1)
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={locationYouAreHereX}
                                onChange={(event) =>
                                  setLocationYouAreHereX(event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Repere vertical (0 a 1)
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={locationYouAreHereY}
                                onChange={(event) =>
                                  setLocationYouAreHereY(event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Orientation (degres)
                              <input
                                type="number"
                                min="0"
                                max="360"
                                step="1"
                                value={locationOrientationDegrees}
                                onChange={(event) =>
                                  setLocationOrientationDegrees(
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void completeDisplayLocation(location)
                              }
                            >
                              Enregistrer et rendre admissible
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label>
                    Orientation
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                    >
                      <option value="LANDSCAPE">Paysage</option>
                      <option value="PORTRAIT">Portrait</option>
                    </select>
                  </label>
                  <label>
                    Langue
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="FR">FR</option>
                      <option value="EN">EN</option>
                      <option value="BILINGUAL">Bilingue</option>
                    </select>
                  </label>
                </div>
                <button
                  disabled={busy || !locationId}
                  onClick={() => void createPlan()}
                >
                  Créer le brouillon
                </button>
              </div>
            ) : (
              <p>
                Aucun PDF approuvé admissible, ou permission de création
                absente.
              </p>
            )}
          </article>
          <article>
            <h2>Activité récente</h2>
            {data.recentEvents.length ? (
              <ul>
                {data.recentEvents.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <b>{e.action}</b>
                    <span>{new Date(e.createdAt).toLocaleString("fr-CA")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Historique indisponible avec les permissions actuelles.</p>
            )}
          </article>
        </section>
        {selected && (
          <div
            className={styles.backdrop}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
          >
            <section
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-labelledby="display-plan-title"
            >
              <button
                className={styles.close}
                onClick={() => setSelected(null)}
                aria-label="Fermer"
              >
                ×
              </button>
              <h2 id="display-plan-title">{selected.location.label}</h2>
              <p>
                {selected.building.name} · {selected.floor.name}
              </p>
              {preview ? (
                <div className={styles.preview}>
                  <img
                    src={preview}
                    alt={`Aperçu privé du plan ${selected.location.label}`}
                  />
                  <a href={preview} target="_blank" rel="noreferrer">
                    Plein écran
                  </a>
                </div>
              ) : (
                <div className={styles.placeholder}>
                  Aperçu privé non chargé
                </div>
              )}
              <dl className={styles.detail}>
                <div>
                  <dt>Statut</dt>
                  <dd>{LABELS[selected.status]}</dd>
                </div>
                <div>
                  <dt>Empreinte source</dt>
                  <dd>
                    <code>{selected.sourceSha256}</code>
                  </dd>
                </div>
                <div>
                  <dt>Empreinte variante</dt>
                  <dd>
                    <code>{selected.variantSha256 || "ABSENTE"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Verrou</dt>
                  <dd>{selected.lockVersion}</dd>
                </div>
              </dl>
              {selected.status === "REVIEW" &&
                data.capabilities.DISPLAY_PLAN_APPROVE && (
                  <label className={styles.reason}>
                    Profil visuel
                    <select
                      value={profile}
                      onChange={(e) => setProfile(e.target.value)}
                    >
                      <option value="SOURCE_NATIVE">Source native</option>
                      <option value="ORIGINAL_17X11">Original 17×11</option>
                      <option value="SCREEN_16X9">Écran 16:9</option>
                      <option value="SCREEN_16X10">Écran 16:10</option>
                    </select>
                  </label>
                )}
              <label className={styles.reason}>
                Motif / observation
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className={styles.actionStack}>
                {selected.variantSha256 && (
                  <button
                    onClick={() => void showPreview(selected)}
                    disabled={busy}
                  >
                    Charger l’aperçu
                  </button>
                )}
                {selected.status === "DRAFT" &&
                  data.capabilities.DISPLAY_PLAN_CREATE && (
                    <>
                      <label className={styles.reason}>
                        Page PDF à afficher
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          inputMode="numeric"
                          value={renderPage}
                          onChange={(event) => setRenderPage(event.target.value)}
                          placeholder="Ex. 1"
                          disabled={busy}
                        />
                        <span>
                          La page doit être choisie explicitement, même pour un
                          PDF d’une seule page.
                        </span>
                      </label>
                      <button
                        onClick={() => void generatePdfPreview()}
                        disabled={busy || !renderPage}
                      >
                        {busy ? "Génération en cours…" : "Générer l’aperçu"}
                      </button>
                      {renderStatus && (
                        <p role="status" aria-live="polite">
                          {renderStatus}
                        </p>
                      )}
                      <button
                        onClick={() => void act("submit")}
                        disabled={busy || !selected.variantSha256}
                      >
                        Soumettre
                      </button>
                    </>
                  )}
                {selected.status === "REVIEW" &&
                  data.capabilities.DISPLAY_PLAN_REVIEW && (
                    <>
                      <button onClick={() => void act("review")}>
                        Confirmer la revue
                      </button>
                      <button onClick={() => void act("reject")}>
                        Refuser
                      </button>
                    </>
                  )}
                {selected.status === "REVIEW" &&
                  data.capabilities.DISPLAY_PLAN_APPROVE && (
                    <button onClick={() => void approvePlan()}>
                      Approuver la preuve
                    </button>
                  )}
                {selected.status === "APPROVED" &&
                  data.capabilities.DISPLAY_PLAN_PUBLISH && (
                    <button onClick={() => void publishPlan()}>Publier</button>
                  )}
                {selected.status === "PUBLISHED" &&
                  data.capabilities.DISPLAY_PLAN_REVOKE && (
                    <button onClick={() => void act("suspend")}>
                      Suspendre
                    </button>
                  )}
                {selected.status === "SUSPENDED" &&
                  data.capabilities.DISPLAY_PLAN_PUBLISH && (
                    <button onClick={() => void act("resume")}>
                      Réactiver
                    </button>
                  )}
                {["APPROVED", "PUBLISHED", "SUSPENDED"].includes(
                  selected.status,
                ) &&
                  data.capabilities.DISPLAY_PLAN_REVOKE && (
                    <button onClick={() => void act("revoke")}>Révoquer</button>
                  )}
              </div>
              <p className={styles.note}>
                L’approbation visuelle et la publication demeurent dans le
                circuit gouverné existant.
              </p>
            </section>
          </div>
        )}
        {orgId &&
          user?.displayPermissions?.includes("DISPLAY_OBSERVATION_READ") && (
            <ObservationManager organizationId={orgId} />
          )}
      </main>
    </AppLayout>
  );
}
