"use client";
/* eslint-disable @next/next/no-img-element -- authenticated blob previews are not optimizable by next/image */

import { useEffect, useMemo, useRef, useState } from "react";
import { apiDownload, apiGet, apiPost, getUser } from "../store/auth";
import PortalLayout from "../components/PortalLayout";
import styles from "./display.module.css";

type Plan = {
  id: string;
  buildingId: string;
  locationId: string;
  sourceVersion: number;
  versionNumber: number;
  variantVersion: number;
  status: string;
  publishedOnDisplay: boolean;
  building: { name: string };
  floor: { name: string };
  zone: { name: string } | null;
  location: { label: string };
  projectFile: { name: string };
  previewPath: string;
};
type Workspace = {
  buildings: Array<{ id: string; name: string }>;
  plans: Plan[];
  observations: { submitted: number; active: number; closed: number };
};
type Observation = {
  id: string;
  reference: string;
  category: string;
  suggestedPriority: string;
  status: string;
  updatedAt: string;
  building: { name: string };
  publication: { projectFile: { name: string } };
};
type ObservationPage = {
  items: Observation[];
  total: number;
  limit: number;
  offset: number;
};
const categories = [
  "EXTINGUISHER_MOVED",
  "EXIT_CHANGED",
  "DOOR_BLOCKED",
  "NEW_PARTITION",
  "ROOM_NUMBER_CHANGED",
  "ROUTE_CHANGED",
  "SAFETY_EQUIPMENT_MISSING",
  "DOCUMENT_INFORMATION_INCORRECT",
  "OTHER",
];
const categoryLabels: Record<string, string> = {
  EXTINGUISHER_MOVED: "Extincteur déplacé",
  EXIT_CHANGED: "Issue modifiée",
  DOOR_BLOCKED: "Porte condamnée ou bloquée",
  NEW_PARTITION: "Nouvelle cloison",
  ROOM_NUMBER_CHANGED: "Numéro de local modifié",
  ROUTE_CHANGED: "Cheminement modifié",
  SAFETY_EQUIPMENT_MISSING: "Équipement de sécurité manquant",
  DOCUMENT_INFORMATION_INCORRECT: "Information documentaire erronée",
  OTHER: "Autre",
};
const statusLabels: Record<string, string> = {
  SUBMITTED: "Soumise",
  UNDER_REVIEW: "En analyse",
  MORE_INFO_REQUIRED: "Information requise",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  CORRECTION_IN_PROGRESS: "Correction en cours",
  RESOLVED: "Résolue",
  CLOSED: "Fermée",
};

export default function DisplayPage() {
  const previewFrame = useRef<HTMLDivElement>(null);
  const permissions = new Set(getUser()?.displayPermissions ?? []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [building, setBuilding] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Plan | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState("INFORMATION");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (building) q.set("buildingId", building);
      if (search.trim()) q.set("search", search.trim());
      setWorkspace(await apiGet(`/client-portal/display?${q}`));
      if (permissions.has("DISPLAY_CLIENT_OBSERVATION_READ")) {
        const page: ObservationPage = await apiGet(
          "/client-portal/display/observations?limit=25&offset=0",
        );
        setObservations(page.items);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  };
  // The timer keeps the data synchronization asynchronous under React 19.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // The filter change is the deliberate synchronization boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const plans = useMemo(() => workspace?.plans ?? [], [workspace]);
  const openPreview = async (plan: Plan) => {
    if (!permissions.has("DISPLAY_CLIENT_PREVIEW")) return;
    if (preview) URL.revokeObjectURL(preview);
    const file = await apiDownload(plan.previewPath);
    setPreview(URL.createObjectURL(file.blob));
    setSelected(plan);
    setPoint(null);
    setZoom(1);
  };
  const submit = async () => {
    if (!selected) return;
    setMessage("");
    setError("");
    try {
      const result = await apiPost("/client-portal/display/observations", {
        requestId: crypto.randomUUID(),
        buildingId: selected.buildingId,
        publicationId: selected.id,
        locationId: selected.locationId,
        category,
        suggestedPriority: priority,
        description,
        ...(point ? { normalizedX: point.x, normalizedY: point.y } : {}),
      });
      setMessage(`Observation ${result.reference} enregistrée.`);
      setDescription("");
      setPoint(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Soumission impossible.",
      );
    }
  };
  return (
    <PortalLayout>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CORO Display</p>
            <h1>Plans et affichages de sécurité</h1>
            <p>
              Consultez les versions autorisées et signalez une correction sans
              modifier le document approuvé.
            </p>
          </div>
        </header>
        <section className={styles.stats} aria-label="Résumé">
          <article>
            <strong>{workspace?.buildings.length ?? 0}</strong>
            <span>Bâtiments</span>
          </article>
          <article>
            <strong>{plans.length}</strong>
            <span>Plans consultables</span>
          </article>
          <article>
            <strong>{workspace?.observations.active ?? 0}</strong>
            <span>En traitement</span>
          </article>
          <article>
            <strong>{workspace?.observations.closed ?? 0}</strong>
            <span>Clôturées</span>
          </article>
        </section>
        <section className={styles.filters}>
          <label>
            Bâtiment
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            >
              <option value="">Tous les bâtiments autorisés</option>
              {workspace?.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rechercher
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
              placeholder="Nom du plan"
            />
          </label>
          <button onClick={() => void load()}>Rechercher</button>
        </section>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {loading ? (
          <p className={styles.state}>Chargement…</p>
        ) : plans.length === 0 ? (
          <p className={styles.state}>
            Aucun plan autorisé dans votre périmètre.
          </p>
        ) : (
          <section className={styles.grid}>
            {plans.map((plan) => (
              <article className={styles.card} key={plan.id}>
                <div>
                  <span className={styles.badge}>
                    {plan.publishedOnDisplay
                      ? "Diffusé sur écran"
                      : "Consultable"}
                  </span>
                  <h2>{plan.projectFile.name}</h2>
                  <p>
                    {plan.building.name} · {plan.floor.name}
                    {plan.zone ? ` · ${plan.zone.name}` : ""}
                  </p>
                  <p>Emplacement : {plan.location.label}</p>
                  <p>
                    Version documentaire {plan.sourceVersion} · variante{" "}
                    {plan.variantVersion}
                  </p>
                </div>
                <button
                  disabled={!permissions.has("DISPLAY_CLIENT_PREVIEW")}
                  onClick={() => void openPreview(plan)}
                >
                  Prévisualiser
                </button>
              </article>
            ))}
          </section>
        )}
        {selected && preview && (
          <section className={styles.previewSection} ref={previewFrame}>
            <div className={styles.previewHead}>
              <div>
                <h2>{selected.projectFile.name}</h2>
                <p>
                  {selected.location.label} · version {selected.versionNumber}
                </p>
              </div>
              <div className={styles.zoom}>
                <button
                  type="button"
                  aria-label="Réduire le plan"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                >
                  −
                </button>
                <button type="button" onClick={() => setZoom(1)}>
                  Ajuster
                </button>
                <button
                  type="button"
                  aria-label="Agrandir le plan"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => void previewFrame.current?.requestFullscreen()}
                >
                  Plein écran
                </button>
              </div>
            </div>
            <div className={styles.preview}>
              <div
                className={styles.canvas}
                style={{ transform: `scale(${zoom})` }}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setPoint({
                    x: Number(
                      Math.min(
                        1,
                        Math.max(0, (e.clientX - r.left) / r.width),
                      ).toFixed(4),
                    ),
                    y: Number(
                      Math.min(
                        1,
                        Math.max(0, (e.clientY - r.top) / r.height),
                      ).toFixed(4),
                    ),
                  });
                }}
              >
                {/* Blob URLs are authenticated, short-lived previews and cannot use next/image. */}
                <img
                  src={preview}
                  alt={`Aperçu privé de ${selected.projectFile.name}`}
                />
                {point && (
                  <span
                    aria-hidden="true"
                    className={styles.pin}
                    style={{
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
            {permissions.has("DISPLAY_CLIENT_OBSERVATION_SUBMIT") && (
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <h2>Proposer une correction</h2>
                <p className={styles.notice}>
                  Votre priorité est une suggestion, pas une évaluation de
                  risque validée. Aucun changement n’est appliqué
                  automatiquement au plan.
                </p>
                <div className={styles.formGrid}>
                  <label>
                    Catégorie
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option value={c} key={c}>
                          {categoryLabels[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priorité suggérée
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="INFORMATION">Information</option>
                      <option value="MINOR">Mineure</option>
                      <option value="MAJOR">Majeure</option>
                      <option value="CRITICAL">Critique</option>
                    </select>
                  </label>
                </div>
                {priority === "CRITICAL" && (
                  <p className={styles.critical}>
                    Si un danger est immédiat, communiquez sans délai avec le
                    responsable du bâtiment ou les services d’urgence. Aucun
                    canal d’alerte immédiate n’est configuré dans ce formulaire;
                    il ne déclenche ni incident, ni alarme, ni évacuation.
                  </p>
                )}
                <label>
                  Description
                  <textarea
                    required
                    minLength={10}
                    maxLength={4000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
                <p className={styles.help}>
                  {point
                    ? `Position enregistrée : ${point.x}, ${point.y}`
                    : "Cliquez sur le plan pour localiser l’observation (facultatif)."}{" "}
                  Les pièces jointes sont désactivées dans cette version
                  sécurisée.
                </p>
                <button type="submit">Soumettre l’observation</button>
                {message && (
                  <p role="status" className={styles.success}>
                    {message}
                  </p>
                )}
              </form>
            )}
          </section>
        )}
        {permissions.has("DISPLAY_CLIENT_OBSERVATION_READ") && (
          <section className={styles.history}>
            <h2>Mes propositions</h2>
            {observations.length === 0 ? (
              <p>Aucune proposition soumise.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Plan</th>
                      <th>Catégorie</th>
                      <th>Priorité</th>
                      <th>Statut</th>
                      <th>Mise à jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((o) => (
                      <tr key={o.id}>
                        <td>{o.reference}</td>
                        <td>
                          {o.publication.projectFile.name}
                          <small>{o.building.name}</small>
                        </td>
                        <td>{categoryLabels[o.category] ?? o.category}</td>
                        <td>{o.suggestedPriority}</td>
                        <td>{statusLabels[o.status] ?? o.status}</td>
                        <td>
                          {new Date(o.updatedAt).toLocaleDateString("fr-CA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </PortalLayout>
  );
}
