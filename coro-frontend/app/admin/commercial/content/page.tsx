"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type CommercialIntent =
  | "INCLUDED"
  | "OPTIONAL"
  | "AUTONOMOUS"
  | "TECHNICAL_DEPENDENCY"
  | "NOT_INCLUDED"
  | "FUTURE";
type DeliveryMaturity = "AVAILABLE" | "LIMITED" | "UNVERIFIED" | "FUTURE";
type VersionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "ARCHIVED";
type Language = "FR" | "EN";
type Stage = "OFFER" | "AVAILABILITY" | "DESCRIPTIONS" | "REVIEW";
type Binding = {
  id: string;
  targetType: string;
  targetCode: string;
  labelFR: string;
  labelEN: string | null;
  commercialIntent: CommercialIntent;
  deliveryMaturity: DeliveryMaturity;
  evidence: string | null;
  displayOrder: number;
};
type Version = {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  titleFR: string;
  titleEN: string | null;
  descriptionFR: string;
  descriptionEN: string | null;
  provenance: string;
  contentHash: string;
  lockVersion: number;
  bindings: Binding[];
};
type Content = { id: string; code: string; versions: Version[] };

const STAGES: Array<{ code: Stage; label: string }> = [
  { code: "OFFER", label: "1. Définir l’offre" },
  { code: "AVAILABILITY", label: "2. Vérifier la disponibilité" },
  { code: "DESCRIPTIONS", label: "3. Rédiger les descriptions" },
  { code: "REVIEW", label: "4. Réviser et approuver" },
];
const INTENTS: CommercialIntent[] = [
  "INCLUDED",
  "OPTIONAL",
  "AUTONOMOUS",
  "TECHNICAL_DEPENDENCY",
  "NOT_INCLUDED",
  "FUTURE",
];
const MATURITIES: DeliveryMaturity[] = [
  "AVAILABLE",
  "LIMITED",
  "UNVERIFIED",
  "FUTURE",
];
const INTENT_COPY: Record<
  CommercialIntent,
  { label: string; explanation: string }
> = {
  INCLUDED: {
    label: "Inclus dans Professional",
    explanation: "Présenté comme faisant partie de l’offre CORO Professional.",
  },
  OPTIONAL: {
    label: "Options",
    explanation:
      "Disponible séparément lorsque le contexte client le justifie.",
  },
  AUTONOMOUS: {
    label: "Solutions autonomes",
    explanation: "Solution distincte qui n’est pas incluse automatiquement.",
  },
  TECHNICAL_DEPENDENCY: {
    label: "Dépendances techniques",
    explanation:
      "Élément technique nécessaire, sans promesse commerciale autonome.",
  },
  NOT_INCLUDED: {
    label: "Non inclus",
    explanation: "Explicitement exclu de cette offre.",
  },
  FUTURE: {
    label: "Fonctionnalités futures",
    explanation: "Orientation future, non commercialisable actuellement.",
  },
};
const MATURITY_COPY: Record<
  DeliveryMaturity,
  { label: string; explanation: string }
> = {
  AVAILABLE: {
    label: "Disponible",
    explanation: "Validée pour la portée de livraison prévue.",
  },
  LIMITED: {
    label: "Disponibilité limitée",
    explanation: "Disponible avec des limites qui doivent être explicites.",
  },
  UNVERIFIED: {
    label: "À vérifier",
    explanation: "Les preuves sont encore insuffisantes.",
  },
  FUTURE: {
    label: "À venir",
    explanation: "Non livrable commercialement pour le moment.",
  },
};
const STATUS_LABELS: Record<VersionStatus, string> = {
  DRAFT: "Brouillon",
  IN_REVIEW: "En revue",
  APPROVED: "Approuvé",
  ARCHIVED: "Archivé",
};

function readiness(version: Version) {
  const blockers: Array<{ code: string; label: string; stage: Stage }> = [];
  if (!version.titleFR.trim())
    blockers.push({
      code: "TITLE_FR",
      label: "Titre français manquant",
      stage: "DESCRIPTIONS",
    });
  if (!version.descriptionFR.trim())
    blockers.push({
      code: "DESCRIPTION_FR",
      label: "Description française manquante",
      stage: "DESCRIPTIONS",
    });
  if (!version.titleEN?.trim())
    blockers.push({
      code: "TITLE_EN",
      label: "Titre anglais manquant",
      stage: "DESCRIPTIONS",
    });
  if (!version.descriptionEN?.trim())
    blockers.push({
      code: "DESCRIPTION_EN",
      label: "Description anglaise manquante",
      stage: "DESCRIPTIONS",
    });
  version.bindings.forEach((binding) => {
    if (!binding.labelFR.trim())
      blockers.push({
        code: `LABEL_FR:${binding.targetCode}`,
        label: `Libellé français manquant — ${binding.targetCode}`,
        stage: "DESCRIPTIONS",
      });
    if (!binding.labelEN?.trim())
      blockers.push({
        code: `LABEL_EN:${binding.targetCode}`,
        label: `Libellé anglais manquant — ${binding.labelFR || binding.targetCode}`,
        stage: "DESCRIPTIONS",
      });
    if (
      binding.commercialIntent === "INCLUDED" &&
      binding.deliveryMaturity === "UNVERIFIED"
    )
      blockers.push({
        code: `INCLUDED_UNVERIFIED:${binding.targetCode}`,
        label: `${binding.labelFR} est inclus, mais sa disponibilité reste à vérifier`,
        stage: "AVAILABILITY",
      });
    if (
      binding.commercialIntent === "FUTURE" &&
      binding.deliveryMaturity !== "FUTURE"
    )
      blockers.push({
        code: `FUTURE_INVALID:${binding.targetCode}`,
        label: `${binding.labelFR} est futur, mais sa maturité n’est pas « À venir »`,
        stage: "AVAILABILITY",
      });
  });
  return blockers;
}

function errorMessage(error: unknown) {
  const response = (
    error as { response?: { status?: number; data?: { message?: string } } }
  ).response;
  if (response?.status === 401 || response?.status === 403)
    return "Vous n’êtes pas autorisé à administrer le contenu commercial.";
  if (response?.status === 409)
    return "Ce contenu a changé depuis son ouverture. Rechargez la version avant de recommencer.";
  return (
    response?.data?.message ?? "Le contenu commercial n’a pas pu être chargé."
  );
}

export default function CommercialContentPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [selected, setSelected] = useState<Version>();
  const [stage, setStage] = useState<Stage>("OFFER");
  const [language, setLanguage] = useState<Language>("FR");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (selectId?: string) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/v1/commercial/content");
      const nextContents = data as Content[];
      setContents(nextContents);
      const versions = nextContents.flatMap((item) => item.versions);
      setSelected(versions.find((item) => item.id === selectId) ?? versions[0]);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const blockers = useMemo(
    () => (selected ? readiness(selected) : []),
    [selected],
  );
  const editable = selected?.status === "DRAFT";
  const groups = useMemo(
    () =>
      INTENTS.map((intent) => ({
        intent,
        bindings:
          selected?.bindings.filter(
            (binding) => binding.commercialIntent === intent,
          ) ?? [],
      })).filter((group) => group.bindings.length > 0),
    [selected],
  );

  async function action(
    run: () => Promise<{ data: Version }>,
    success: string,
  ) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { data } = await run();
      await load(data.id);
      setMessage(success);
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }
  const updateBinding = (id: string, patch: Partial<Binding>) =>
    setSelected((current) =>
      current
        ? {
            ...current,
            bindings: current.bindings.map((binding) =>
              binding.id === id ? { ...binding, ...patch } : binding,
            ),
          }
        : current,
    );
  const saveDraft = () => {
    if (!selected) return;
    void action(
      () =>
        api.patch(`/admin/v1/commercial/content/versions/${selected.id}`, {
          lockVersion: selected.lockVersion,
          titleFR: selected.titleFR,
          titleEN: selected.titleEN || undefined,
          descriptionFR: selected.descriptionFR,
          descriptionEN: selected.descriptionEN || undefined,
          provenance: selected.provenance,
          bindings: selected.bindings.map((binding) => ({
            targetType: binding.targetType,
            targetCode: binding.targetCode,
            labelFR: binding.labelFR,
            labelEN: binding.labelEN || undefined,
            commercialIntent: binding.commercialIntent,
            deliveryMaturity: binding.deliveryMaturity,
            evidence: binding.evidence || undefined,
            displayOrder: binding.displayOrder,
          })),
        }),
      "Brouillon enregistré.",
    );
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-emerald-700">
            Administration commerciale
          </p>
          <h1 className="text-3xl font-semibold text-slate-950">
            Contenu commercial gouverné
          </h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Définissez ce que CORO Professional présente au client, vérifiez sa
            disponibilité et faites approuver explicitement le contenu. Les
            brouillons et contenus non vérifiés ne sont jamais des promesses
            client.
          </p>
        </header>
        <div aria-live="polite" aria-atomic="true">
          {message && (
            <p
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              {message}
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load(selected?.id)}
                className="rounded border border-red-300 bg-white px-3 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <p
            role="status"
            className="rounded-lg border bg-white p-5 text-sm text-slate-600"
          >
            Chargement du contenu commercial…
          </p>
        ) : contents.length === 0 && !error ? (
          <section className="rounded-lg border bg-white p-6">
            <h2 className="text-xl font-semibold">
              Aucun contenu Professional
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Aucun brouillon ne sera créé automatiquement. Lancez cette action
              seulement lorsque vous souhaitez commencer la gouvernance du
              contenu.
            </p>
            <button
              type="button"
              disabled={busy}
              className="mt-4 rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() =>
                void action(
                  () =>
                    api.post("/admin/v1/commercial/content/professional-draft"),
                  "Brouillon CORO Professional créé.",
                )
              }
            >
              Créer le brouillon Professional
            </button>
          </section>
        ) : (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside
              aria-label="Historique des versions"
              className="h-fit rounded-lg border bg-white p-4"
            >
              <h2 className="font-semibold">Versions existantes</h2>
              <p className="mt-1 text-xs text-slate-500">
                L’ouverture de cette page ne crée et ne modifie aucune version.
              </p>
              <div className="mt-4 space-y-4">
                {contents.map((content) => (
                  <section key={content.id}>
                    <h3 className="text-sm font-semibold text-slate-700">
                      {content.code}
                    </h3>
                    <div className="mt-2 space-y-2">
                      {content.versions.map((version) => (
                        <button
                          type="button"
                          key={version.id}
                          aria-current={
                            selected?.id === version.id ? "true" : undefined
                          }
                          onClick={() => {
                            setSelected(version);
                            setStage("OFFER");
                          }}
                          className={`block w-full rounded border p-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected?.id === version.id ? "border-emerald-600 bg-emerald-50" : "hover:bg-slate-50"}`}
                        >
                          <span className="font-medium">
                            Version {version.versionNumber}
                          </span>
                          <span className="block text-xs text-slate-600">
                            {STATUS_LABELS[version.status]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </aside>
            {selected && (
              <section className="min-w-0 space-y-5">
                <div className="rounded-lg border bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        CORO Professional · version {selected.versionNumber}
                      </p>
                      <h2 className="text-xl font-semibold">
                        {STATUS_LABELS[selected.status]}
                      </h2>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${blockers.length ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}
                    >
                      {blockers.length
                        ? `${blockers.length} point${blockers.length > 1 ? "s" : ""} à traiter`
                        : "Prêt pour approbation"}
                    </span>
                  </div>
                  <nav
                    aria-label="Étapes de gouvernance du contenu"
                    className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    {STAGES.map((item) => {
                      const count =
                        item.code === "REVIEW"
                          ? blockers.length
                          : blockers.filter(
                              (blocker) => blocker.stage === item.code,
                            ).length;
                      return (
                        <button
                          type="button"
                          key={item.code}
                          aria-current={
                            stage === item.code ? "step" : undefined
                          }
                          onClick={() => setStage(item.code)}
                          className={`rounded-lg border p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${stage === item.code ? "border-emerald-600 bg-emerald-50 font-semibold" : "bg-white hover:bg-slate-50"}`}
                        >
                          {item.label}
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            {count
                              ? `${count} élément${count > 1 ? "s" : ""} à traiter`
                              : "Étape complète"}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {stage === "OFFER" && (
                  <section
                    aria-labelledby="offer-heading"
                    className="space-y-4"
                  >
                    <div className="rounded-lg border bg-white p-5">
                      <h2 id="offer-heading" className="text-xl font-semibold">
                        Définir l’offre
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Classez chaque élément selon son rôle commercial. Cela
                        ne modifie ni Packaging, ni Pricing, ni les droits
                        opérationnels.
                      </p>
                    </div>
                    {groups.map(({ intent, bindings }) => (
                      <section
                        key={intent}
                        className="rounded-lg border bg-white p-5"
                      >
                        <h3 className="font-semibold">
                          {INTENT_COPY[intent].label}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {INTENT_COPY[intent].explanation}
                        </p>
                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          {bindings.map((binding) => (
                            <article
                              key={binding.id}
                              className="rounded-lg border p-4"
                            >
                              <p className="font-medium">{binding.labelFR}</p>
                              {editable ? (
                                <label className="mt-3 block text-sm">
                                  Intention commerciale
                                  <select
                                    value={binding.commercialIntent}
                                    onChange={(event) =>
                                      updateBinding(binding.id, {
                                        commercialIntent: event.target
                                          .value as CommercialIntent,
                                      })
                                    }
                                    className="mt-1 block w-full rounded border p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                  >
                                    {INTENTS.map((value) => (
                                      <option key={value} value={value}>
                                        {INTENT_COPY[value].label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <p className="mt-2 text-sm text-slate-600">
                                  {INTENT_COPY[binding.commercialIntent].label}
                                </p>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </section>
                )}

                {stage === "AVAILABILITY" && (
                  <section
                    aria-labelledby="availability-heading"
                    className="space-y-4 rounded-lg border bg-white p-5"
                  >
                    <div>
                      <h2
                        id="availability-heading"
                        className="text-xl font-semibold"
                      >
                        Vérifier la disponibilité
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        La maturité de livraison est distincte de l’intention
                        commerciale. Aucun niveau n’est promu automatiquement.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {MATURITIES.map((maturity) => (
                        <div
                          key={maturity}
                          className="rounded-lg bg-slate-50 p-3"
                        >
                          <b className="text-sm">
                            {MATURITY_COPY[maturity].label}
                          </b>
                          <p className="mt-1 text-xs text-slate-600">
                            {MATURITY_COPY[maturity].explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {selected.bindings.map((binding) => {
                        const issues = blockers.filter((item) =>
                          item.code.endsWith(`:${binding.targetCode}`),
                        );
                        return (
                          <article
                            key={binding.id}
                            className={`rounded-lg border p-4 ${issues.length ? "border-amber-300 bg-amber-50" : ""}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-medium">
                                  {binding.labelFR}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  {INTENT_COPY[binding.commercialIntent].label}
                                </p>
                              </div>
                              {editable ? (
                                <label className="text-sm">
                                  Maturité de livraison
                                  <select
                                    value={binding.deliveryMaturity}
                                    onChange={(event) =>
                                      updateBinding(binding.id, {
                                        deliveryMaturity: event.target
                                          .value as DeliveryMaturity,
                                      })
                                    }
                                    className="mt-1 block rounded border bg-white p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                  >
                                    {MATURITIES.map((value) => (
                                      <option key={value} value={value}>
                                        {MATURITY_COPY[value].label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <span className="rounded bg-slate-100 px-2 py-1 text-sm">
                                  {
                                    MATURITY_COPY[binding.deliveryMaturity]
                                      .label
                                  }
                                </span>
                              )}
                            </div>
                            {issues.map((item) => (
                              <p
                                key={item.code}
                                role="status"
                                className="mt-2 text-sm font-medium text-amber-900"
                              >
                                À traiter : {item.label}
                              </p>
                            ))}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {stage === "DESCRIPTIONS" && (
                  <section
                    aria-labelledby="descriptions-heading"
                    className="space-y-4 rounded-lg border bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2
                          id="descriptions-heading"
                          className="text-xl font-semibold"
                        >
                          Rédiger les descriptions
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                          Rédigez chaque langue explicitement. CORO ne génère
                          aucune traduction ni allégation.
                        </p>
                      </div>
                      <div
                        role="group"
                        aria-label="Langue d’édition"
                        className="inline-flex rounded-lg border p-1"
                      >
                        {(["FR", "EN"] as const).map((value) => (
                          <button
                            type="button"
                            key={value}
                            aria-pressed={language === value}
                            onClick={() => setLanguage(value)}
                            className={`rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${language === value ? "bg-emerald-700 text-white" : ""}`}
                          >
                            {value === "FR" ? "Français" : "English"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block text-sm font-medium">
                      {language === "FR" ? "Titre français" : "English title"}
                      <input
                        disabled={!editable}
                        value={
                          language === "FR"
                            ? selected.titleFR
                            : (selected.titleEN ?? "")
                        }
                        onChange={(event) =>
                          setSelected({
                            ...selected,
                            ...(language === "FR"
                              ? { titleFR: event.target.value }
                              : { titleEN: event.target.value }),
                          })
                        }
                        className="mt-1 w-full rounded border p-2 disabled:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      {language === "FR"
                        ? "Description française"
                        : "English description"}
                      <textarea
                        disabled={!editable}
                        rows={5}
                        value={
                          language === "FR"
                            ? selected.descriptionFR
                            : (selected.descriptionEN ?? "")
                        }
                        onChange={(event) =>
                          setSelected({
                            ...selected,
                            ...(language === "FR"
                              ? { descriptionFR: event.target.value }
                              : { descriptionEN: event.target.value }),
                          })
                        }
                        className="mt-1 w-full rounded border p-2 disabled:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      />
                    </label>
                    <div className="space-y-3">
                      <h3 className="font-semibold">Libellés des éléments</h3>
                      {selected.bindings.map((binding) => {
                        const value =
                          language === "FR"
                            ? binding.labelFR
                            : (binding.labelEN ?? "");
                        return (
                          <label
                            key={binding.id}
                            className="block rounded-lg border p-3 text-sm font-medium"
                          >
                            {binding.targetCode}
                            <input
                              disabled={!editable}
                              value={value}
                              onChange={(event) =>
                                updateBinding(
                                  binding.id,
                                  language === "FR"
                                    ? { labelFR: event.target.value }
                                    : { labelEN: event.target.value },
                                )
                              }
                              aria-invalid={!value.trim()}
                              className="mt-1 w-full rounded border p-2 disabled:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                            />
                            {!value.trim() && (
                              <span className="mt-1 block text-xs text-amber-800">
                                Traduction manquante.
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </section>
                )}

                {stage === "REVIEW" && (
                  <section
                    aria-labelledby="review-heading"
                    className="space-y-4 rounded-lg border bg-white p-5"
                  >
                    <div>
                      <h2 id="review-heading" className="text-xl font-semibold">
                        Réviser et approuver
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        L’approbation demeure explicite et utilise le validateur
                        A1A existant.
                      </p>
                    </div>
                    {blockers.length ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                        <h3 className="font-semibold text-amber-950">
                          Le contenu n’est pas prêt pour approbation
                        </h3>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                          {blockers.map((item) => (
                            <li key={item.code}>
                              <button
                                type="button"
                                className="text-left underline focus-visible:outline focus-visible:outline-2"
                                onClick={() => setStage(item.stage)}
                              >
                                {item.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p
                        role="status"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                      >
                        Les règles de préparation connues sont satisfaites.
                        L’approbation finale reste une décision explicite du
                        SUPER_ADMIN.
                      </p>
                    )}
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded bg-slate-50 p-3">
                        <dt className="text-xs text-slate-500">Éléments</dt>
                        <dd className="font-semibold">
                          {selected.bindings.length}
                        </dd>
                      </div>
                      <div className="rounded bg-slate-50 p-3">
                        <dt className="text-xs text-slate-500">Statut</dt>
                        <dd className="font-semibold">
                          {STATUS_LABELS[selected.status]}
                        </dd>
                      </div>
                      <div className="rounded bg-slate-50 p-3">
                        <dt className="text-xs text-slate-500">
                          Points à traiter
                        </dt>
                        <dd className="font-semibold">{blockers.length}</dd>
                      </div>
                    </dl>
                  </section>
                )}

                <section
                  aria-label="Actions du cycle de vie"
                  className="rounded-lg border bg-white p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "DRAFT" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={saveDraft}
                          className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Enregistrer le brouillon
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void action(
                              () =>
                                api.post(
                                  `/admin/v1/commercial/content/versions/${selected.id}/submit-review`,
                                  {
                                    lockVersion: selected.lockVersion,
                                    reason: "Soumis à la revue commerciale",
                                  },
                                ),
                              "Contenu soumis en revue.",
                            )
                          }
                          className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Soumettre en revue
                        </button>
                      </>
                    )}
                    {selected.status === "IN_REVIEW" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void action(
                              () =>
                                api.post(
                                  `/admin/v1/commercial/content/versions/${selected.id}/return-to-draft`,
                                  {
                                    lockVersion: selected.lockVersion,
                                    reason: "Corrections requises",
                                  },
                                ),
                              "Contenu retourné au brouillon.",
                            )
                          }
                          className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Retourner au brouillon
                        </button>
                        <button
                          type="button"
                          disabled={busy || blockers.length > 0}
                          title={
                            blockers.length
                              ? "Corrigez les points de préparation avant approbation."
                              : undefined
                          }
                          onClick={() =>
                            void action(
                              () =>
                                api.post(
                                  `/admin/v1/commercial/content/versions/${selected.id}/approve`,
                                  {
                                    lockVersion: selected.lockVersion,
                                    reason: "Approbation commerciale explicite",
                                  },
                                ),
                              "Contenu approuvé.",
                            )
                          }
                          className="rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Approuver explicitement
                        </button>
                      </>
                    )}
                    {selected.status === "APPROVED" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void action(
                              () =>
                                api.post(
                                  "/admin/v1/commercial/content/CORO_PROFESSIONAL/revisions",
                                ),
                              "Nouvelle révision brouillon créée.",
                            )
                          }
                          className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Créer une révision
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void action(
                              () =>
                                api.post(
                                  `/admin/v1/commercial/content/versions/${selected.id}/archive`,
                                  {
                                    lockVersion: selected.lockVersion,
                                    reason: "Archivé par le Super Admin",
                                  },
                                ),
                              "Contenu archivé.",
                            )
                          }
                          className="rounded border px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          Archiver
                        </button>
                      </>
                    )}
                    {selected.status === "ARCHIVED" && (
                      <p className="text-sm text-slate-600">
                        Cette version historique est en lecture seule.
                      </p>
                    )}
                  </div>
                </section>
                <details className="rounded-lg border bg-white p-4 text-sm">
                  <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2">
                    Informations avancées
                  </summary>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Identifiant de version</dt>
                      <dd className="break-all font-mono text-xs">
                        {selected.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">
                        Version de verrouillage
                      </dt>
                      <dd>{selected.lockVersion}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Provenance</dt>
                      <dd>{selected.provenance}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Empreinte SHA-256</dt>
                      <dd className="break-all font-mono text-xs">
                        {selected.contentHash}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 space-y-1">
                    <h3 className="font-medium">Cibles techniques</h3>
                    {selected.bindings.map((binding) => (
                      <p
                        key={binding.id}
                        className="break-all font-mono text-xs"
                      >
                        {binding.targetType}:{binding.targetCode} ·{" "}
                        {binding.evidence ?? "Aucune preuve déclarée"}
                      </p>
                    ))}
                  </div>
                </details>
              </section>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
