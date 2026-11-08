"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPut } from "../../../store/auth";
import styles from "./scenario-governance.module.css";

type Basis = {
  modelName: string | null;
  modelVersion: string | null;
  studyTitle: string | null;
  studyReference: string | null;
  studyDate: string | null;
  endpointName: string | null;
  endpointConcentrationPpm: number | null;
  endpointAveragingTimeSeconds: number | null;
  windSpeedMetersPerSecond: number | null;
  atmosphericStabilityClass: string | null;
  releaseDurationSeconds: number | null;
  receptorHeightMeters: number | null;
  assumptions: string | null;
  limitations: string | null;
  reviewedAt: string | null;
  complete: boolean;
  sourceDocument: { id: string; name: string; version: number } | null;
};
type Zone = {
  id: string;
  code: string;
  nameFR: string;
  purpose?: string;
  determinationMethod?: string | null;
  sourceReference?: string | null;
  approvedForAlerting?: boolean;
};
type Source = {
  id: string;
  name: string;
  version: number;
  lifecycleState: string;
  visibility: string;
  expiresAt: string | null;
  effectiveAt: string | null;
  supersededEffectiveAt: string | null;
};
const fields = [
  ["modelName", "Modèle ou méthode de référence", "text", 160],
  ["modelVersion", "Version du modèle (facultatif)", "text", 80],
  ["studyTitle", "Titre de l’étude ou du document de référence", "text", 240],
  ["studyReference", "Référence de l’étude", "text", 240],
  ["studyDate", "Date de l’étude", "date", 0],
  ["endpointName", "Nom du seuil de référence", "text", 120],
  [
    "endpointConcentrationPpm",
    "Concentration du seuil (ppm)",
    "number",
    0.000001,
    1000000,
  ],
  [
    "endpointAveragingTimeSeconds",
    "Durée moyenne du seuil (secondes)",
    "number",
    1,
    604800,
  ],
  ["windSpeedMetersPerSecond", "Vitesse du vent (m/s)", "number", 0, 150],
  [
    "atmosphericStabilityClass",
    "Classe de stabilité atmosphérique",
    "text",
    40,
  ],
  ["releaseDurationSeconds", "Durée du rejet (secondes)", "number", 1, 604800],
  ["receptorHeightMeters", "Hauteur du récepteur (m)", "number", 0, 500],
] as const;
const purposes = [
  ["MODELED_IMPACT", "Impact modélisé"],
  ["PUBLIC_NOTIFICATION", "Notification publique"],
  ["SHELTER_IN_PLACE", "Mise à l’abri"],
  ["EVACUATION", "Évacuation"],
  ["EXCLUSION", "Exclusion"],
  ["RESPONDER_STAGING", "Rassemblement des intervenants"],
  ["OTHER", "Autre"],
];

export default function PopulationScenarioGovernance({
  buildingId,
  scenario,
  canPrepare,
  canApprove,
  onChanged,
}: {
  buildingId: string;
  scenario: {
    id: string;
    type: string;
    nameFR: string;
    dispersionBasis?: Basis | null;
    impactZones: Zone[];
  };
  canPrepare: boolean;
  canApprove: boolean;
  onChanged: () => Promise<void>;
}) {
  const basis = scenario.dispersionBasis;
  const initial = Object.fromEntries(
    fields.map(([key]) => [key, String(basis?.[key] ?? "")]),
  );
  initial.studyDate = initial.studyDate.slice(0, 10);
  const [values, setValues] = useState(initial);
  const [sourceId, setSourceId] = useState(basis?.sourceDocument?.id ?? "");
  const [assumptions, setAssumptions] = useState(basis?.assumptions ?? "");
  const [limitations, setLimitations] = useState(basis?.limitations ?? "");
  const [zones, setZones] = useState(
    Object.fromEntries(
      scenario.impactZones.map((z) => [
        z.id,
        {
          purpose: z.purpose ?? "OTHER",
          determinationMethod: z.determinationMethod ?? "",
          sourceReference: z.sourceReference ?? "",
        },
      ]),
    ),
  );
  const [open, setOpen] = useState(false);
  const [referenceTime, setReferenceTime] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [loadingSources, setLoadingSources] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [zoneConfirmed, setZoneConfirmed] = useState<Record<string, boolean>>(
    {},
  );
  const inFlight = useRef(false);
  const base = `/client-portal/buildings/${encodeURIComponent(buildingId)}/population/scenarios/${encodeURIComponent(scenario.id)}`;
  const available = sources.filter(
    (file) =>
      file.lifecycleState === "APPROVED" &&
      file.visibility === "shared" &&
      (!file.expiresAt || Date.parse(file.expiresAt) > referenceTime) &&
      (!file.effectiveAt || Date.parse(file.effectiveAt) <= referenceTime) &&
      (!file.supersededEffectiveAt ||
        Date.parse(file.supersededEffectiveAt) > referenceTime),
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiGet(
      `/client-portal/buildings/${encodeURIComponent(buildingId)}/documents?history=false`,
    )
      .then((raw) => {
        if (cancelled) return;
        const listing = raw as { files: Source[]; nextCursor: string | null };
        setSources(listing.files);
        setCursor(listing.nextCursor);
        setSourceError("");
      })
      .catch(() => {
        if (!cancelled)
          setSourceError(
            "Impossible de charger les documents sources. Actualisez avant de choisir une source.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingSources(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId, open]);

  const mutate = async (
    path: string,
    method: "PUT" | "POST",
    data: unknown,
  ) => {
    if (inFlight.current || uncertain) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await (method === "PUT" ? apiPut : apiPost)(base + path, data);
      await onChanged();
    } catch {
      setUncertain(true);
      setError(
        "L’opération n’a pas pu être confirmée. Actualisez l’état du scénario avant une nouvelle tentative.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (!canPrepare && !canApprove) return null;
  return (
    <section
      className={styles.panel}
      aria-label="Préparation et révision du scénario"
    >
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => {
          setReferenceTime(Date.now());
          setLoadingSources(!open);
          setOpen(!open);
        }}
      >
        Paramétrer et réviser le scénario
      </button>
      {open && (
        <>
          <h3>{scenario.nameFR}</h3>
          {scenario.type === "TEST" && (
            <p className={styles.notice}>
              SCÉNARIO D’EXERCICE — Les données fictives et leurs limites
              doivent être identifiées dans le document source, les hypothèses
              et les messages. Une révision reste nécessaire avant toute
              diffusion réelle.
            </p>
          )}
          <p>
            La modification de la base de référence retire sa révision et les
            approbations de zones. Les brouillons devront être recalculés puis
            approuvés sur les données courantes.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!canPrepare) return;
              if (
                !available.some((file) => file.id === sourceId) ||
                fields.some(
                  ([key, , kind]) =>
                    kind !== "number" &&
                    key !== "modelVersion" &&
                    !values[key].trim(),
                ) ||
                !assumptions.trim() ||
                !limitations.trim()
              ) {
                setError(
                  "Choisissez une source admissible et renseignez les champs obligatoires.",
                );
                return;
              }
              const data: Record<string, unknown> = {
                sourceProjectFileId: sourceId,
                assumptions: assumptions.trim(),
                limitations: limitations.trim(),
              };
              for (const [key, , kind] of fields) {
                if (key === "modelVersion" && !values[key].trim()) continue;
                data[key] =
                  kind === "number"
                    ? Number(values[key])
                    : kind === "date"
                      ? new Date(values[key] + "T00:00:00Z").toISOString()
                      : values[key].trim();
              }
              void mutate("/dispersion-basis", "PUT", data);
            }}
          >
            <fieldset disabled={!canPrepare || busy || uncertain}>
              <legend>Base de référence et source canonique</legend>
              <label>
                Document source partagé et approuvé
                <select
                  required
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  disabled={loadingSources || !!sourceError}
                >
                  <option value="">Sélectionner un document source</option>
                  {basis?.sourceDocument &&
                    !available.some(
                      (f) => f.id === basis.sourceDocument!.id,
                    ) && (
                      <option value={basis.sourceDocument.id} disabled>
                        {basis.sourceDocument.name} · version{" "}
                        {basis.sourceDocument.version} — admissibilité à
                        revérifier
                      </option>
                    )}
                  {available.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name} · version {file.version}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Le serveur recontrôle la source, sa version et sa validité lors
                de l’enregistrement et de la révision.
              </p>
              <a
                href={`/buildings/${encodeURIComponent(buildingId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir la documentation du bâtiment
              </a>
              <p role="alert">{sourceError}</p>
              {cursor && (
                <button
                  type="button"
                  disabled={loadingSources}
                  onClick={async () => {
                    setLoadingSources(true);
                    try {
                      const result = (await apiGet(
                        `/client-portal/buildings/${encodeURIComponent(buildingId)}/documents?history=false&cursor=${encodeURIComponent(cursor)}`,
                      )) as { files: Source[]; nextCursor: string | null };
                      setSources((previous) => [...previous, ...result.files]);
                      setCursor(result.nextCursor);
                      setSourceError("");
                    } catch {
                      setSourceError(
                        "Chargement des documents interrompu. Actualisez la liste.",
                      );
                    } finally {
                      setLoadingSources(false);
                    }
                  }}
                >
                  Charger les autres documents
                </button>
              )}
              <div className={styles.grid}>
                {fields.map(([key, label, kind, min, max]) => (
                  <label key={key}>
                    {label}
                    <input
                      type={kind}
                      value={values[key]}
                      required={key !== "modelVersion"}
                      maxLength={kind === "text" ? min : undefined}
                      min={kind === "number" ? min : undefined}
                      max={kind === "number" ? max : undefined}
                      step={
                        kind === "number"
                          ? key === "endpointAveragingTimeSeconds" ||
                            key === "releaseDurationSeconds"
                            ? 1
                            : "any"
                          : undefined
                      }
                      onChange={(event) =>
                        setValues({ ...values, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Hypothèses
                <textarea
                  required
                  maxLength={10000}
                  value={assumptions}
                  onChange={(event) => setAssumptions(event.target.value)}
                />
              </label>
              <label>
                Limites et conditions d’utilisation
                <textarea
                  required
                  maxLength={10000}
                  value={limitations}
                  onChange={(event) => setLimitations(event.target.value)}
                />
              </label>
              <button type="submit">Enregistrer la base de référence</button>
            </fieldset>
          </form>
          {canApprove && (
            <div className={styles.review}>
              <label>
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  disabled={busy || uncertain || !basis?.complete}
                  onChange={(event) => setReviewConfirmed(event.target.checked)}
                />{" "}
                J’ai vérifié la source canonique courante, les données et les
                limites du scénario.
              </label>
              <button
                type="button"
                disabled={
                  busy || uncertain || !basis?.complete || !reviewConfirmed
                }
                onClick={() =>
                  void mutate("/dispersion-review", "POST", { confirmed: true })
                }
              >
                Confirmer la révision de la base
              </button>
            </div>
          )}
          <h3>Qualification des zones</h3>
          {scenario.impactZones.map((zone) => (
            <section
              key={zone.id}
              className={styles.zone}
              aria-label={`Qualification de ${zone.code}`}
            >
              <h4>
                {zone.code} — {zone.nameFR}
              </h4>
              <p>
                {zone.approvedForAlerting
                  ? "Périmètre approuvé pour l’alerte"
                  : "Périmètre non approuvé pour l’alerte"}
              </p>
              {canPrepare && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void mutate(
                      `/zones/${encodeURIComponent(zone.id)}/governance`,
                      "PUT",
                      zones[zone.id],
                    );
                  }}
                >
                  <fieldset disabled={busy || uncertain}>
                    <label>
                      Usage de la zone
                      <select
                        value={zones[zone.id].purpose}
                        onChange={(event) =>
                          setZones({
                            ...zones,
                            [zone.id]: {
                              ...zones[zone.id],
                              purpose: event.target.value,
                            },
                          })
                        }
                      >
                        {purposes.map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Méthode de détermination
                      <input
                        maxLength={240}
                        value={zones[zone.id].determinationMethod}
                        onChange={(event) =>
                          setZones({
                            ...zones,
                            [zone.id]: {
                              ...zones[zone.id],
                              determinationMethod: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Référence du périmètre
                      <input
                        maxLength={500}
                        value={zones[zone.id].sourceReference}
                        onChange={(event) =>
                          setZones({
                            ...zones,
                            [zone.id]: {
                              ...zones[zone.id],
                              sourceReference: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <button type="submit">
                      Enregistrer la qualification de {zone.code}
                    </button>
                  </fieldset>
                </form>
              )}
              {canApprove && (
                <div className={styles.review}>
                  {!zone.approvedForAlerting && (
                    <label>
                      <input
                        type="checkbox"
                        disabled={
                          busy ||
                          uncertain ||
                          !basis?.reviewedAt ||
                          !basis.complete ||
                          zones[zone.id].purpose === "MODELED_IMPACT"
                        }
                        checked={zoneConfirmed[zone.id] ?? false}
                        onChange={(event) =>
                          setZoneConfirmed({
                            ...zoneConfirmed,
                            [zone.id]: event.target.checked,
                          })
                        }
                      />{" "}
                      J’ai révisé ce périmètre et son usage pour les
                      communications.
                    </label>
                  )}
                  <button
                    type="button"
                    disabled={
                      busy ||
                      uncertain ||
                      (!zone.approvedForAlerting &&
                        (!basis?.reviewedAt ||
                          !basis.complete ||
                          !zoneConfirmed[zone.id]))
                    }
                    onClick={() =>
                      void mutate(
                        `/zones/${encodeURIComponent(zone.id)}/alerting-approval`,
                        "PUT",
                        { approved: !zone.approvedForAlerting },
                      )
                    }
                  >
                    {zone.approvedForAlerting
                      ? `Retirer l’approbation de ${zone.code}`
                      : `Approuver le périmètre ${zone.code}`}
                  </button>
                </div>
              )}
            </section>
          ))}
          <p role="alert">{error}</p>
          {uncertain && (
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  await onChanged();
                  setUncertain(false);
                  setError("");
                } catch {
                  setError(
                    "L’état courant reste indisponible. Aucune nouvelle opération ne sera lancée.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Actualiser l’état du scénario
            </button>
          )}
        </>
      )}
    </section>
  );
}
