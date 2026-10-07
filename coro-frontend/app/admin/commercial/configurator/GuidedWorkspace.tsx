"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { CONFIGURATOR_API_BASE } from "./configurator-contract.mjs";
import type {
  CatalogComponent,
  CommercialFamily,
  DriverDefinition,
  FamilyReadiness,
  GuidedWorkspace as Workspace,
  CustomerSafeProjection,
  ScenarioComparison as Comparison,
} from "./configurator-types";
import { ScenarioEditor } from "./ScenarioEditor";
import { ScenarioResults } from "./ScenarioResults";
import { ScenarioSidebar } from "./ScenarioSidebar";
import { CustomerSafeReview } from "./CustomerSafeReview";
import { ScenarioComparison } from "./ScenarioComparison";
import { ProfessionalOfferBuilder } from "./ProfessionalOfferBuilder";

export function GuidedWorkspace({
  workspaceId,
  families,
  drivers,
  onClose,
}: {
  workspaceId: string;
  families: CommercialFamily[];
  drivers: DriverDefinition[];
  onClose: () => void;
}) {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [catalog, setCatalog] = useState<CatalogComponent[]>([]);
  const [readiness, setReadiness] = useState<FamilyReadiness[]>([]);
  const [assumptions, setAssumptions] = useState<{
    cost: Array<{ id: string; label: string }>;
    valuation: Array<{ id: string; label: string }>;
  }>({ cost: [], valuation: [] });
  const [costVersionId, setCostVersionId] = useState("");
  const [valuationVersionId, setValuationVersionId] = useState("");
  const [activeId, setActiveId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [comparison, setComparison] = useState<Comparison>();
  const [preview, setPreview] = useState<CustomerSafeProjection>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [valueDisclaimerFr, setValueDisclaimerFr] = useState("");
  const [valueDisclaimerEn, setValueDisclaimerEn] = useState("");
  const [relationship, setRelationship] = useState<"DIRECT" | "PARTNER">(
    "DIRECT",
  );
  const [proposalResult, setProposalResult] = useState<{
    id: string;
    reference: string;
  }>();
  const [draftDirty, setDraftDirty] = useState(false);
  const [technicalMode, setTechnicalMode] = useState(false);
  const handleDirtyChange = useCallback((value: boolean) => {
    setDraftDirty(value);
    if (value) {
      setPreview(undefined);
      setProposalResult(undefined);
    }
  }, []);

  const reload = useCallback(
    async (preferredId?: string) => {
      const [workspaceResponse, catalogResponse] = await Promise.all([
        api.get(`${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}`),
        api.get(`${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/catalog`),
      ]);
      const next = workspaceResponse.data as Workspace;
      const nextAssumptions = catalogResponse.data.assumptions ?? {
        cost: [],
        valuation: [],
      };
      setWorkspace(next);
      setCatalog(catalogResponse.data.components);
      setReadiness(catalogResponse.data.readiness ?? []);
      setAssumptions(nextAssumptions);
      setCostVersionId((current) => {
        const availableIds = new Set(
          nextAssumptions.cost.map((item: { id: string }) => item.id),
        );
        const relevantScenario =
          next.scenarios.find((item) => item.id === preferredId) ??
          next.scenarios.find((item) => item.selected) ??
          next.scenarios.find((item) => item.status === "ACTIVE");
        const persisted =
          relevantScenario?.latestResult?.costAssumptionVersionId;
        if (persisted && availableIds.has(persisted)) return persisted;
        if (current && availableIds.has(current)) return current;
        return nextAssumptions.cost.length === 1
          ? nextAssumptions.cost[0].id
          : "";
      });
      setActiveId(
        (current) =>
          preferredId ??
          current ??
          next.scenarios.find((scenario) => scenario.status === "ACTIVE")?.id,
      );
    },
    [workspaceId],
  );

  useEffect(() => {
    // The API response is the external source that initializes this workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch(() =>
      setMessage("Unable to load this commercial configuration."),
    );
  }, [reload]);

  async function action(
    task: () => Promise<unknown>,
    success: string,
    preferredId?: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await task();
      const createdId = (response as { data?: { id?: string } })?.data?.id;
      await reload(preferredId ?? createdId);
      setMessage(success);
    } catch (error) {
      const apiMessage = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setMessage(
        Array.isArray(apiMessage)
          ? apiMessage.join(" · ")
          : (apiMessage ?? "The operation could not be completed."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!workspace)
    return (
      <p className="mt-6 rounded border bg-white p-4">
        Loading guided workspace…
      </p>
    );
  const scenario = workspace.scenarios.find((item) => item.id === activeId);
  const professionalScenario = scenario?.familyCodes.includes("PROFESSIONAL");

  async function loadComparison() {
    const { data } = await api.get(
      `/admin/v1/commercial/simulator/workspaces/${workspaceId}/compare`,
    );
    setComparison(data);
  }
  async function loadPreview() {
    if (draftDirty) {
      setMessage(
        "Enregistrez les modifications et recalculez l’offre avant l’aperçu client.",
      );
      return;
    }
    if (!scenario?.latestResult || scenario.stale) {
      setMessage("Recalculez ce scénario avant d’ouvrir l’aperçu client.");
      return;
    }
    setPreviewBusy(true);
    setMessage("");
    try {
      const { data } = await api.get(
        `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/customer-preview`,
        { params: { scenarioId: scenario.id } },
      );
      setPreview(data);
    } catch (error) {
      const apiMessage = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setMessage(
        Array.isArray(apiMessage)
          ? apiMessage.join(" · ")
          : (apiMessage ?? "Customer Preview could not be opened."),
      );
    } finally {
      setPreviewBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <header className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600"
            >
              ← Toutes les configurations
            </button>
            <h1 className="mt-2 text-2xl font-semibold">{workspace.title}</h1>
            <p className="text-sm text-slate-500">
              {workspace.target.name} · {workspace.catalog.name} v
              {workspace.catalog.versionNumber} · {workspace.catalog.audience} ·{" "}
              {workspace.currency}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Configuration guidée
          </span>
        </div>
      </header>
      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
        <ScenarioSidebar
          scenarios={workspace.scenarios}
          activeId={activeId}
          onOpen={(id) => {
            setActiveId(id);
            setDraftDirty(false);
            setTechnicalMode(false);
            setPreview(undefined);
            setProposalResult(undefined);
          }}
          onCreate={() => {
            const name = window.prompt("Scenario name", "Standard");
            if (name?.trim())
              void action(
                () =>
                  api.post(
                    `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios`,
                    { name: name.trim() },
                  ),
                "Scenario created.",
              );
          }}
        />
        <main className="space-y-5">
          {(!professionalScenario || technicalMode) && (
            <ReadinessPanel readiness={readiness} families={families} />
          )}
          <div className="flex gap-3">
            <button
              className="rounded border px-4 py-2"
              onClick={() => void loadComparison()}
            >
              Comparer les scénarios
            </button>
            <button
              type="button"
              disabled={
                draftDirty ||
                !scenario?.latestResult ||
                scenario.stale ||
                previewBusy
              }
              className="rounded border px-4 py-2"
              onClick={() => void loadPreview()}
              title={
                draftDirty
                  ? "Enregistrez puis recalculez avant l’aperçu client."
                  : !scenario?.latestResult || scenario.stale
                    ? "Calculez ce scénario avant l’aperçu client."
                    : undefined
              }
            >
              {previewBusy ? "Ouverture…" : "Aperçu client"}
            </button>
          </div>
          {comparison && (
            <ScenarioComparison
              comparison={comparison}
              onSelect={(scenarioId) =>
                void action(
                  () =>
                    api.post(
                      `/admin/v1/commercial/simulator/workspaces/${workspaceId}/select`,
                      { scenarioId, lockVersion: workspace.lockVersion },
                    ),
                  "Scenario selected.",
                  scenarioId,
                ).then(loadComparison)
              }
            />
          )}
          {(!professionalScenario || technicalMode) && (
            <section className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-semibold">Autorités d’hypothèses</h2>
              <p className="text-xs text-slate-500">
                Sélection explicite de versions publiées. Aucun brouillon n’est
                offert.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Coûts internes
                  <select
                    value={costVersionId}
                    onChange={(e) => setCostVersionId(e.target.value)}
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="">
                      {assumptions.cost.length
                        ? "Sélectionner une autorité de coûts"
                        : "Non configuré — coût indisponible"}
                    </option>
                    {assumptions.cost.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Méthodologie de valeur
                  <select
                    value={valuationVersionId}
                    onChange={(e) => setValuationVersionId(e.target.value)}
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="">
                      Non configurée — valeur indisponible
                    </option>
                    {assumptions.valuation.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}
          {scenario ? (
            <>
              {professionalScenario && !technicalMode ? (
                <ProfessionalOfferBuilder
                  key={`${scenario.id}:${scenario.lockVersion}`}
                  workspaceId={workspaceId}
                  scenario={scenario}
                  catalog={catalog}
                  costAssumptionVersionId={costVersionId}
                  valuationAssumptionVersionIds={
                    valuationVersionId ? [valuationVersionId] : []
                  }
                  busy={busy}
                  onDirtyChange={handleDirtyChange}
                  onOpenTechnical={() => setTechnicalMode(true)}
                  onSave={(payload) =>
                    action(
                      () =>
                        api.put(
                          `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}`,
                          payload,
                        ),
                      "Configuration du scénario enregistrée.",
                      scenario.id,
                    )
                  }
                  onCalculate={() =>
                    action(
                      () =>
                        api.post(
                          `/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}/scenarios/${scenario.id}/calculate`,
                          {
                            costAssumptionVersionId: costVersionId || undefined,
                            valuationAssumptionVersionIds: valuationVersionId
                              ? [valuationVersionId]
                              : undefined,
                          },
                        ),
                      "Offre calculée.",
                      scenario.id,
                    )
                  }
                  onDuplicate={() =>
                    action(
                      () =>
                        api.post(
                          `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/duplicate`,
                        ),
                      "Scénario dupliqué.",
                    )
                  }
                  onArchive={() =>
                    action(
                      () =>
                        api.post(
                          `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/archive`,
                          { lockVersion: scenario.lockVersion },
                        ),
                      "Scénario archivé.",
                    )
                  }
                  onSelect={() =>
                    action(
                      () =>
                        api.post(
                          `/admin/v1/commercial/simulator/workspaces/${workspaceId}/select`,
                          {
                            scenarioId: scenario.id,
                            lockVersion: workspace.lockVersion,
                          },
                        ),
                      "Scénario retenu.",
                      scenario.id,
                    )
                  }
                />
              ) : (
                <>
                  {professionalScenario && (
                    <button
                      type="button"
                      onClick={() => setTechnicalMode(false)}
                      className="rounded border px-3 py-2 text-sm"
                    >
                      ← Revenir au configurateur d’offres
                    </button>
                  )}
                  <ScenarioEditor
                    key={`${scenario.id}:${scenario.lockVersion}`}
                    scenario={scenario}
                    families={families}
                    drivers={drivers}
                    catalog={catalog}
                    busy={busy}
                    onSaveMetadata={(name, description) =>
                      action(
                        () =>
                          api.put(
                            `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/metadata`,
                            {
                              name,
                              description: description || undefined,
                              lockVersion: scenario.lockVersion,
                            },
                          ),
                        "Scenario details saved.",
                        scenario.id,
                      )
                    }
                    onSave={(payload) =>
                      action(
                        () =>
                          api.put(
                            `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}`,
                            payload,
                          ),
                        "Scenario configuration saved.",
                        scenario.id,
                      )
                    }
                    onCalculate={() =>
                      action(
                        () =>
                          api.post(
                            `/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}/scenarios/${scenario.id}/calculate`,
                            {
                              costAssumptionVersionId:
                                costVersionId || undefined,
                              valuationAssumptionVersionIds: valuationVersionId
                                ? [valuationVersionId]
                                : undefined,
                            },
                          ),
                        "Scenario calculated.",
                        scenario.id,
                      )
                    }
                    onDuplicate={() =>
                      action(
                        () =>
                          api.post(
                            `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/duplicate`,
                          ),
                        "Scenario duplicated.",
                      )
                    }
                    onArchive={() =>
                      action(
                        () =>
                          api.post(
                            `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/archive`,
                            { lockVersion: scenario.lockVersion },
                          ),
                        "Scenario archived.",
                      )
                    }
                    onSelect={() =>
                      action(
                        () =>
                          api.post(
                            `/admin/v1/commercial/simulator/workspaces/${workspaceId}/select`,
                            {
                              scenarioId: scenario.id,
                              lockVersion: workspace.lockVersion,
                            },
                          ),
                        "Scenario selected.",
                        scenario.id,
                      )
                    }
                  />
                </>
              )}
              {(!professionalScenario || technicalMode) && (
                <ScenarioResults scenario={scenario} />
              )}
              {preview && (
                <>
                  <CustomerSafeReview
                    preview={preview}
                    onClose={() => setPreview(undefined)}
                  />
                  <section className="rounded-xl border bg-white p-5">
                    <h2 className="font-semibold">
                      Créer la proposition gouvernée
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Cette action crée explicitement un brouillon de
                      proposition depuis le scénario retenu et son dernier
                      calcul officiel.
                    </p>
                    {!scenario.selected && (
                      <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">
                        Retenez ce scénario avant de créer la proposition.
                      </p>
                    )}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input
                        className="rounded border p-2"
                        placeholder="Titre de la proposition"
                        value={proposalTitle}
                        onChange={(e) => setProposalTitle(e.target.value)}
                      />
                      <select
                        className="rounded border p-2"
                        value={relationship}
                        onChange={(e) =>
                          setRelationship(
                            e.target.value as "DIRECT" | "PARTNER",
                          )
                        }
                      >
                        <option value="DIRECT">Direct</option>
                        <option value="PARTNER">Partenaire</option>
                      </select>
                      <input
                        className="rounded border p-2"
                        placeholder="Contact"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                      <input
                        className="rounded border p-2"
                        placeholder="Courriel"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                      {scenario.latestResult?.valueStatus === "COMPLETE" && (
                        <>
                          <textarea
                            className="rounded border p-2"
                            placeholder="Avis de non-responsabilité sur la valeur (FR)"
                            value={valueDisclaimerFr}
                            onChange={(e) =>
                              setValueDisclaimerFr(e.target.value)
                            }
                          />
                          <textarea
                            className="rounded border p-2"
                            placeholder="Value disclaimer (EN, optional)"
                            value={valueDisclaimerEn}
                            onChange={(e) =>
                              setValueDisclaimerEn(e.target.value)
                            }
                          />
                        </>
                      )}
                    </div>
                    <button
                      disabled={
                        !proposalTitle ||
                        !scenario.selected ||
                        !scenario.latestResult ||
                        scenario.stale ||
                        scenario.familyAuthoritySource === "REVIEW_REQUIRED" ||
                        scenario.packaging.status !== "READY" ||
                        scenario.latestResult.priceStatus !== "COMPLETE" ||
                        (scenario.latestResult.valueStatus === "COMPLETE" &&
                          !valueDisclaimerFr.trim()) ||
                        busy
                      }
                      className="mt-3 rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-40"
                      onClick={() =>
                        void action(
                          async () => {
                            const response = await api.post(
                              `/admin/v1/commercial/simulator/configurator/workspaces/${workspaceId}/scenarios/${scenario.id}/runs/${scenario.latestResult!.id}/convert`,
                              {
                                title: proposalTitle,
                                relationship,
                                preferredLanguage: "FR",
                                recipientLegalName: preview.customer.legalName,
                                recipientDisplayName:
                                  preview.customer.displayName,
                                recipientCountry: "CA",
                                recipientContactName: contactName || undefined,
                                recipientEmail: contactEmail || undefined,
                                valueDisclaimerFr:
                                  valueDisclaimerFr.trim() || undefined,
                                valueDisclaimerEn:
                                  valueDisclaimerEn.trim() || undefined,
                              },
                            );
                            setProposalResult({
                              id: response.data.proposal.id,
                              reference: response.data.proposal.reference,
                            });
                            return response;
                          },
                          "Proposal created.",
                          scenario.id,
                        )
                      }
                    >
                      Créer la proposition
                    </button>
                    {proposalResult && (
                      <a
                        className="ml-3 underline"
                        href={`/admin/commercial/proposals/${proposalResult.id}`}
                      >
                        Ouvrir {proposalResult.reference}
                      </a>
                    )}
                  </section>
                </>
              )}
            </>
          ) : (
            <section className="rounded-xl border bg-white p-8 text-center">
              <h2 className="text-lg font-semibold">
                Create or open a scenario
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                The guided editor keeps catalog semantics server-controlled and
                calculation evidence in the existing simulator.
              </p>
            </section>
          )}
          {message && (
            <p role="status" className="rounded border bg-white p-3 text-sm">
              {message}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

export function LegacyReadinessPanel({
  readiness,
  families,
}: {
  readiness: FamilyReadiness[];
  families: CommercialFamily[];
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">État de préparation commercial</h2>
      <p className="text-xs text-slate-500">
        Diagnostic serveur uniquement. Un coût ou une valeur manquante ne bloque
        jamais le prix.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {readiness.map((item) => (
          <article key={item.familyCode} className="rounded border p-3">
            <strong>
              {families.find((f) => f.code === item.familyCode)?.labelFr ??
                item.familyCode}
            </strong>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span>Prix</span>
              <b>{item.price.status}</b>
              <span>Quantités</span>
              <b>{item.quantity.status}</b>
              <span>Drivers</span>
              <b>{item.drivers.status}</b>
              <span>Coûts</span>
              <b>{item.cost.status}</b>
              <span>Valeur</span>
              <b>{item.value.status}</b>
            </div>
            {item.blockers.length > 0 && (
              <p className="mt-2 text-xs text-red-700">
                {item.blockers.join(" · ")}
              </p>
            )}
            {item.warnings.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {item.warnings.join(" · ")}
              </p>
            )}
            {item.nextActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.nextActions.includes("CATALOG") && (
                  <a
                    href="/admin/product-catalog/price-books"
                    className="underline"
                  >
                    Configurer le catalogue
                  </a>
                )}
                {item.nextActions.includes("COST_ASSUMPTIONS") && (
                  <a
                    href="/admin/commercial/assumptions/cost"
                    className="underline"
                  >
                    Configurer les coûts
                  </a>
                )}
                {item.nextActions.includes("VALUE_ASSUMPTIONS") && (
                  <a
                    href="/admin/commercial/assumptions/value"
                    className="underline"
                  >
                    Configurer la valeur
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ReadinessPanel({
  readiness,
  families,
}: {
  readiness: FamilyReadiness[];
  families: CommercialFamily[];
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">État de préparation commercial</h2>
      <p className="text-xs text-slate-500">
        Diagnostic serveur uniquement. Un coût ou une valeur manquante ne bloque
        jamais le prix.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {readiness.map((item) => (
          <article key={item.familyCode} className="rounded border p-3">
            <strong>
              {families.find((f) => f.code === item.familyCode)?.labelFr ??
                item.familyCode}
            </strong>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <span>Prix</span>
              <b>{item.price.status}</b>
              <span>Quantités</span>
              <b>{item.quantity.status}</b>
              <span>Drivers</span>
              <b>{item.drivers.status}</b>
              <span>Coûts</span>
              <b>{item.cost.status}</b>
              <span>Valeur</span>
              <b>{item.value.status}</b>
            </div>
            {item.blockers.length > 0 && (
              <p className="mt-2 text-xs text-red-700">
                {item.blockers.join(" · ")}
              </p>
            )}
            {item.warnings.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {item.warnings.join(" · ")}
              </p>
            )}
            {item.nextActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.nextActions.includes("CATALOG") && (
                  <a
                    href="/admin/product-catalog/price-books"
                    className="underline"
                  >
                    Configurer le catalogue
                  </a>
                )}
                {item.nextActions.includes("COST_ASSUMPTIONS") && (
                  <a
                    href="/admin/commercial/assumptions/cost"
                    className="underline"
                  >
                    Configurer les coûts
                  </a>
                )}
                {item.nextActions.includes("VALUE_ASSUMPTIONS") && (
                  <a
                    href="/admin/commercial/assumptions/value"
                    className="underline"
                  >
                    Configurer la valeur
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
