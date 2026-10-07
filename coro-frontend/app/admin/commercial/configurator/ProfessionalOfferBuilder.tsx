"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import { CONFIGURATOR_API_BASE } from "./configurator-contract.mjs";
import {
  buildProfessionalDraftRequest,
  capacityBusinessBounds,
  PROFESSIONAL_COMPONENTS,
  professionalDraftFromScenario,
} from "./professional-offer-builder.mjs";
import type {
  CatalogComponent,
  GuidedScenario,
  TransientEvaluation,
} from "./configurator-types";

type DraftState = {
  capacity: string;
  implementation: "STANDARD" | "ADVANCED";
  deliveryHours: string;
  seniorHours: string;
};

const moneyMinor = (value?: string | null) =>
  value == null
    ? "Non disponible"
    : new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(value) / 100);
const moneyCad = (value?: string | null) =>
  value == null
    ? "Non disponible"
    : new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(value));

const validPositiveInteger = (value: string) =>
  /^\d+$/.test(value) && Number(value) > 0;
const validHours = (value: string) =>
  /^\d+(?:\.\d{1,6})?$/.test(value) && Number(value) >= 0;

export function ProfessionalOfferBuilder({
  workspaceId,
  scenario,
  catalog,
  costAssumptionVersionId,
  valuationAssumptionVersionIds,
  busy,
  onSave,
  onCalculate,
  onDuplicate,
  onArchive,
  onSelect,
  onDirtyChange,
  onOpenTechnical,
}: {
  workspaceId: string;
  scenario: GuidedScenario;
  catalog: CatalogComponent[];
  costAssumptionVersionId: string;
  valuationAssumptionVersionIds: string[];
  busy: boolean;
  onSave: (payload: object) => Promise<void>;
  onCalculate: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onArchive: () => Promise<void>;
  onSelect: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  onOpenTechnical: () => void;
}) {
  const initial = useMemo(
    () => professionalDraftFromScenario(scenario, catalog) as DraftState,
    [catalog, scenario],
  );
  const [draft, setDraft] = useState<DraftState>(initial);
  const [result, setResult] = useState<TransientEvaluation>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const savedKey = JSON.stringify(initial);
  const dirty = JSON.stringify(draft) !== savedKey;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const request = useMemo(() => {
    try {
      return buildProfessionalDraftRequest({
        scenario,
        catalog,
        state: draft,
        costAssumptionVersionId,
        valuationAssumptionVersionIds,
      });
    } catch {
      return null;
    }
  }, [
    catalog,
    costAssumptionVersionId,
    draft,
    scenario,
    valuationAssumptionVersionIds,
  ]);
  const valid =
    request &&
    validPositiveInteger(draft.capacity) &&
    validHours(draft.deliveryHours) &&
    validHours(draft.seniorHours);

  useEffect(() => {
    if (!valid || !request) {
      return;
    }
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.post(
          `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/evaluate`,
          request,
          { signal: controller.signal },
        );
        if (sequence === requestSequence.current)
          setResult(response.data as TransientEvaluation);
      } catch (caught) {
        if (controller.signal.aborted || sequence !== requestSequence.current)
          return;
        const message = (
          caught as { response?: { data?: { message?: string | string[] } } }
        ).response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join(" · ")
            : (message ?? "L’aperçu en direct n’a pas pu être actualisé."),
        );
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [request, valid, workspaceId]);

  const evaluation = valid ? result : undefined;
  const displayedError = !valid
    ? request
      ? "Saisissez une capacité entière positive et des heures valides."
      : "Le catalogue Professional requis est incomplet."
    : error;

  const line = (code: string) =>
    evaluation?.lines?.find((item) => item.componentCode === code);
  const annual = line(PROFESSIONAL_COMPONENTS.annual);
  const implementation = line(
    draft.implementation === "STANDARD"
      ? PROFESSIONAL_COMPONENTS.standard
      : PROFESSIONAL_COMPONENTS.advanced,
  );
  const delivery = line(PROFESSIONAL_COMPONENTS.delivery);
  const senior = line(PROFESSIONAL_COMPONENTS.senior);
  const catalogComponent = (code: string) =>
    catalog.find((item) => item.code === code);

  async function save() {
    if (!request) return;
    await onSave({
      lockVersion: scenario.lockVersion,
      familyCodes: request.familyCodes,
      catalogLines: request.catalogLines,
      customLines: request.customLines,
      driverValues: request.driverValues,
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Solution
            </p>
            <h2 className="text-xl font-semibold">CORO Professional</h2>
            <p className="text-sm text-slate-500">
              Configurez l’offre avec les concepts commerciaux usuels.
            </p>
          </div>
          {scenario.selected && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
              Scénario retenu
            </span>
          )}
        </div>
        {scenario.familyAuthoritySource === "LEGACY_INFERRED" && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Solution reconnue depuis la composition existante. Enregistrer
            confirmera explicitement l’intention CORO Professional.
          </p>
        )}
        {scenario.familyAuthoritySource === "REVIEW_REQUIRED" && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            La solution commerciale est ambiguë. Confirmez-la avant toute
            évaluation.
          </p>
        )}
      </section>

      <section className="grid gap-4 rounded-xl border bg-white p-5 lg:grid-cols-3">
        <label className="text-sm font-medium">
          Capacité contractuelle
          <span className="mt-2 flex items-center gap-2">
            <input
              aria-label="Capacité contractuelle"
              inputMode="numeric"
              value={draft.capacity}
              onChange={(event) =>
                setDraft({ ...draft, capacity: event.target.value })
              }
              className="w-32 rounded-lg border p-3 text-lg font-semibold"
            />
            sites actifs
          </span>
          {annual?.capacityBand && (
            <span className="mt-2 block text-xs text-slate-500">
              Tranche actuelle : {capacityBusinessBounds(annual.capacityBand)}{" "}
              sites
            </span>
          )}
        </label>

        <fieldset className="lg:col-span-2">
          <legend className="text-sm font-medium">Implantation</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {(["STANDARD", "ADVANCED"] as const).map((option) => {
              const code =
                option === "STANDARD"
                  ? PROFESSIONAL_COMPONENTS.standard
                  : PROFESSIONAL_COMPONENTS.advanced;
              const component = catalogComponent(code);
              return (
                <label
                  key={option}
                  className={`cursor-pointer rounded-lg border p-4 ${draft.implementation === option ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : ""}`}
                >
                  <input
                    type="radio"
                    name="implementation"
                    checked={draft.implementation === option}
                    onChange={() =>
                      setDraft({ ...draft, implementation: option })
                    }
                  />
                  <strong className="ml-2">
                    {option === "STANDARD" ? "Standard" : "Avancée"}
                  </strong>
                  <span className="mt-2 block text-sm">
                    {component?.catalogAmountCad
                      ? `${moneyCad(component.catalogAmountCad)} · Ponctuel`
                      : "Prix résolu par le catalogue"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold">Services professionnels</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ServiceInput
            label="Delivery"
            value={draft.deliveryHours}
            onChange={(value) => setDraft({ ...draft, deliveryHours: value })}
            evaluated={delivery}
          />
          <ServiceInput
            label="Senior / technique"
            value={draft.seniorHours}
            onChange={(value) => setDraft({ ...draft, seniorHours: value })}
            evaluated={senior}
          />
        </div>
      </section>

      <section className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Résumé de l’offre</h2>
            <p className="text-sm text-slate-600">
              Aperçu en direct · Non enregistré
            </p>
          </div>
          {loading && (
            <span className="text-sm text-slate-600">Actualisation…</span>
          )}
        </div>
        {displayedError && (
          <p
            role="alert"
            className="mt-3 rounded bg-red-50 p-3 text-sm text-red-800"
          >
            {displayedError}
          </p>
        )}
        {evaluation?.status === "CUSTOM_PRICING_REQUIRED" ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <strong>Enterprise / sur devis</strong>
            <p className="text-sm">
              Aucun prix standard n’est disponible pour cette capacité.
            </p>
          </div>
        ) : evaluation?.totals ? (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Summary
                label="CORO Professional · annuel"
                value={moneyMinor(annual?.offeredExtendedAmountMinor)}
              />
              <Summary
                label={`Implantation ${draft.implementation === "STANDARD" ? "standard" : "avancée"}`}
                value={moneyMinor(implementation?.offeredExtendedAmountMinor)}
              />
              <Summary
                label="Frais ponctuels"
                value={moneyMinor(evaluation.totals.oneTimeTotalMinor)}
              />
              <Summary
                label="Première année"
                value={moneyMinor(evaluation.totals.firstYearCommitmentMinor)}
                prominent
              />
            </div>
            <p className="mt-3 text-sm">
              Récurrent annuel :{" "}
              <strong>
                {moneyMinor(evaluation.totals.annualRecurringEquivalentMinor)}
              </strong>
            </p>
          </>
        ) : null}
      </section>

      <section className="rounded-xl border bg-slate-950 p-5 text-white">
        <h2 className="text-lg font-semibold">Analyse interne</h2>
        <p className="text-xs text-slate-300">
          Réservée au Founder · jamais projetée dans l’aperçu client
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary
            label="Coûts directs connus"
            value={moneyMinor(evaluation?.cost?.knownDirectCostMinor)}
            dark
          />
          <Summary label="Coût SaaS récurrent" value="Non configuré" dark />
          <Summary
            label="Contribution complète"
            value={
              evaluation?.contribution
                ? moneyMinor(evaluation.contribution.contributionMinor)
                : "Non disponible"
            }
            dark
          />
          <Summary
            label="Complétude des coûts"
            value={
              evaluation?.cost?.completeness === "PARTIAL"
                ? "Disponible — partielle"
                : (evaluation?.cost?.completeness ?? "Non disponible")
            }
            dark
          />
        </div>
        <div className="mt-3 text-xs text-slate-300">
          {evaluation?.lines
            ?.filter((item) => item.knownDirectCostMinor)
            .map((item) => (
              <span key={item.componentCode} className="mr-4 inline-block">
                {item.label}: {moneyMinor(item.knownDirectCostMinor)}
              </span>
            ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Dernier calcul officiel</h2>
            <p className="text-sm text-slate-500">
              Valeurs enregistrées issues du dernier Run officiel.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${scenario.stale ? "bg-amber-50 text-amber-800" : scenario.latestResult ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}
          >
            {scenario.stale
              ? "À recalculer"
              : scenario.latestResult
                ? "À jour"
                : "Non calculé"}
          </span>
        </div>
        {dirty && scenario.latestResult && (
          <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">
            Le brouillon actuel contient des modifications non enregistrées. Les
            valeurs ci-dessous demeurent celles du dernier calcul officiel.
          </p>
        )}
        {scenario.latestResult && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Summary
                label="Première année"
                value={moneyCad(scenario.latestResult.firstYearCommitmentCad)}
              />
              <Summary
                label="Coûts directs connus · interne"
                value={moneyCad(
                  scenario.latestResult.firstYearCostCad ??
                    scenario.latestResult.knownModeledDirectCostCad,
                )}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Calculé le{" "}
              {new Date(scenario.latestResult.calculatedAt).toLocaleString(
                "fr-CA",
              )}
            </p>
            {!!scenario.latestResult.warningCodes.length && (
              <details className="mt-4 rounded border p-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  Diagnostics techniques
                </summary>
                <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium">État des coûts</dt>
                    <dd>{scenario.latestResult.costStatus}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">État de la valeur</dt>
                    <dd>{scenario.latestResult.valueStatus}</dd>
                  </div>
                </dl>
                <p className="mt-3 break-words text-xs text-slate-500">
                  {scenario.latestResult.warningCodes.join(" · ")}
                </p>
              </details>
            )}
          </>
        )}
      </section>

      <details className="rounded-xl border bg-white p-5">
        <summary className="cursor-pointer font-semibold">
          Options avancées
        </summary>
        <p className="mt-2 text-sm text-slate-600">
          Les dérogations de prix, justifications, efforts internes et lignes
          personnalisées existantes restent conservées dans le scénario. Leur
          édition détaillée demeure disponible dans l’éditeur technique pour les
          cas exceptionnels.
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <span>Prix catalogue / prix offert / justification</span>
          <span>Remplacer exceptionnellement l’effort interne modélisé</span>
          <span>Ligne personnalisée contrôlée</span>
          <span>Diagnostics de provenance et packaging</span>
        </div>
        <button
          type="button"
          disabled={dirty}
          onClick={onOpenTechnical}
          className="mt-4 rounded border px-3 py-2 text-sm disabled:opacity-40"
        >
          Ouvrir l’éditeur technique
        </button>
        {dirty && (
          <p className="mt-2 text-xs text-amber-800">
            Annulez ou enregistrez les modifications avant de changer de mode.
          </p>
        )}
      </details>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy || !dirty || !valid}
          onClick={() => void save()}
          className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Enregistrer
        </button>
        <button
          disabled={busy || dirty || scenario.packaging.status !== "READY"}
          onClick={() => void onCalculate()}
          className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          {scenario.latestResult ? "Recalculer l’offre" : "Calculer l’offre"}
        </button>
        <button
          disabled={!dirty}
          onClick={() => setDraft(initial)}
          className="rounded border px-4 py-2 disabled:opacity-40"
        >
          Annuler les modifications
        </button>
        <button
          disabled={busy}
          onClick={() => void onDuplicate()}
          className="rounded border px-4 py-2"
        >
          Dupliquer
        </button>
        <button
          disabled={busy || scenario.selected}
          onClick={() => void onArchive()}
          className="rounded border px-4 py-2 text-red-700 disabled:opacity-40"
        >
          Archiver
        </button>
        <button
          disabled={
            busy ||
            dirty ||
            scenario.selected ||
            !scenario.latestResult ||
            scenario.stale === true
          }
          onClick={() => void onSelect()}
          className="rounded border px-4 py-2 disabled:opacity-40"
        >
          {scenario.selected ? "Scénario retenu" : "Retenir ce scénario"}
        </button>
      </div>
      {dirty && (
        <p className="text-sm font-medium text-amber-800">
          Modifications non enregistrées — enregistrez puis recalculez l’offre
          avant l’aperçu client.
        </p>
      )}
    </div>
  );
}

function ServiceInput({
  label,
  value,
  onChange,
  evaluated,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  evaluated?: NonNullable<TransientEvaluation["lines"]>[number];
}) {
  return (
    <label className="rounded-lg border p-4 text-sm font-medium">
      {label}
      <span className="mt-2 flex items-center gap-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-28 rounded border p-2 text-lg font-semibold"
        />{" "}
        heures
      </span>
      {evaluated && (
        <span className="mt-2 block text-xs text-slate-500">
          Taux catalogue : {moneyMinor(evaluated.offeredUnitAmountMinor)} / h ·
          Total : {moneyMinor(evaluated.offeredExtendedAmountMinor)}
        </span>
      )}
    </label>
  );
}

function Summary({
  label,
  value,
  prominent = false,
  dark = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${dark ? "border-slate-700 bg-slate-900" : "bg-white"}`}
    >
      <p className={`text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>
        {label}
      </p>
      <strong className={prominent ? "text-xl text-emerald-800" : ""}>
        {value}
      </strong>
    </div>
  );
}
