"use client";

import { FormEvent, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import {
  SIMULATOR_API_BASE,
  FIRST_WAVE_HOURLY_PRICING,
  FIRST_WAVE_SERVICE_ROLES,
  SIMULATOR_OBSERVATION_NOTICE,
  SIMULATOR_TABS,
} from "./simulator-contract.mjs";

type Run = {
  id: string;
  scenarioLockVersion: number;
  priceResult?: { firstYearCommitmentMinor: string };
  costResult?: { firstYearCostMinor: string };
  valueResults?: { capabilityCode: string }[];
};
type Scenario = { id: string; name: string; lockVersion: number; runs: Run[] };
type Workspace = {
  id: string;
  reference: string;
  title: string;
  currency: string;
  lockVersion: number;
  selectedScenarioId?: string;
  organization?: { name: string };
  prospect?: { displayName: string };
  scenarios?: Scenario[];
};
const money = (minor?: string) =>
  minor == null
    ? "Unavailable"
    : new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(minor) / 100);

export default function CommercialSimulatorPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<Workspace | null>(null);
  const [targetType, setTargetType] = useState<"organizationId" | "prospectId">(
    "organizationId",
  );
  const [message, setMessage] = useState("");
  const refreshList = async () =>
    setWorkspaces((await api.get(`${SIMULATOR_API_BASE}/workspaces`)).data);
  const openWorkspace = async (id: string) =>
    setSelected((await api.get(`${SIMULATOR_API_BASE}/workspaces/${id}`)).data);
  useEffect(() => {
    let active = true;
    api
      .get(`${SIMULATOR_API_BASE}/workspaces`)
      .then((response) => {
        if (active) setWorkspaces(response.data);
      })
      .catch(() => {
        if (active) setMessage("Unable to load internal simulations.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const created = await api.post(`${SIMULATOR_API_BASE}/workspaces`, {
        title: data.get("title"),
        priceBookVersionId: data.get("priceBookVersionId"),
        [targetType]: data.get("targetId"),
      });
      await refreshList();
      await openWorkspace(created.data.id);
      form.reset();
    } catch {
      setMessage(
        "Workspace creation failed. Verify target and PriceBookVersion identifiers.",
      );
    }
  }
  async function createScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await api.post(
      `${SIMULATOR_API_BASE}/workspaces/${selected.id}/scenarios`,
      { name: data.get("name") },
    );
    await openWorkspace(selected.id);
    form.reset();
  }
  async function configure(
    event: FormEvent<HTMLFormElement>,
    scenario: Scenario,
  ) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    try {
      await api.put(
        `${SIMULATOR_API_BASE}/workspaces/${selected.id}/scenarios/${scenario.id}`,
        {
          lockVersion: scenario.lockVersion,
          driverValues: JSON.parse(String(data.get("drivers") || "[]")),
        },
      );
      await openWorkspace(selected.id);
      setMessage("Typed inputs saved; any prior run is now stale.");
    } catch {
      setMessage(
        "Configuration failed. Typed inputs must be a valid JSON array.",
      );
    }
  }
  async function calculate(
    event: FormEvent<HTMLFormElement>,
    scenario: Scenario,
  ) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const valuationIds = String(data.get("valuationIds") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    await api.post(
      `${SIMULATOR_API_BASE}/workspaces/${selected.id}/scenarios/${scenario.id}/calculate`,
      {
        costAssumptionVersionId: data.get("costVersionId") || undefined,
        valuationAssumptionVersionIds: valuationIds.length
          ? valuationIds
          : undefined,
      },
    );
    await openWorkspace(selected.id);
  }
  async function choose(scenario: Scenario) {
    if (!selected) return;
    await api.post(`${SIMULATOR_API_BASE}/workspaces/${selected.id}/select`, {
      scenarioId: scenario.id,
      lockVersion: selected.lockVersion,
    });
    await openWorkspace(selected.id);
  }
  async function convert(
    event: FormEvent<HTMLFormElement>,
    scenario: Scenario,
    run: Run,
  ) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    try {
      await api.post(
        `${SIMULATOR_API_BASE}/workspaces/${selected.id}/scenarios/${scenario.id}/runs/${run.id}/convert`,
        {
          title: data.get("title"),
          relationship: data.get("relationship"),
          preferredLanguage: "FR",
          recipientLegalName: data.get("recipientLegalName"),
          recipientDisplayName: data.get("recipientDisplayName"),
          recipientCountry: "CA",
          valueDisclaimerFr: data.get("valueDisclaimerFr") || undefined,
        },
      );
      setMessage(
        "Proposal created explicitly; no contract, entitlement, invoice, usage record, or operational mutation was created.",
      );
    } catch {
      setMessage(
        "Conversion failed. Select this scenario and calculate a current run first.",
      );
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Commercial · Internal
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Commercial Simulator V1
        </h1>
        <p className="mt-2 max-w-4xl text-slate-600">
          {SIMULATOR_OBSERVATION_NOTICE}
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-xl border bg-white">
            <div className="border-b p-4 font-semibold">Workspaces</div>
            <form onSubmit={createWorkspace} className="space-y-2 border-b p-4">
              <input
                name="title"
                required
                placeholder="Workspace title"
                className="w-full rounded border p-2 text-sm"
              />
              <select
                value={targetType}
                onChange={(event) =>
                  setTargetType(event.target.value as typeof targetType)
                }
                className="w-full rounded border p-2 text-sm"
              >
                <option value="organizationId">Organization target</option>
                <option value="prospectId">Prospect target</option>
              </select>
              <input
                name="targetId"
                required
                placeholder="Target UUID"
                className="w-full rounded border p-2 text-sm"
              />
              <input
                name="priceBookVersionId"
                required
                placeholder="PriceBookVersion UUID"
                className="w-full rounded border p-2 text-sm"
              />
              <button className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">
                Create workspace
              </button>
            </form>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => openWorkspace(workspace.id)}
                className="block w-full border-b p-4 text-left hover:bg-slate-50"
              >
                <div className="font-medium">{workspace.title}</div>
                <div className="text-xs text-slate-500">
                  {workspace.reference} ·{" "}
                  {workspace.organization?.name ??
                    workspace.prospect?.displayName}
                </div>
              </button>
            ))}
            {!workspaces.length && (
              <p className="p-6 text-sm text-slate-500">
                No workspace. No financial assumptions are seeded.
              </p>
            )}
          </section>
          <section className="rounded-xl border bg-white p-6">
            {selected ? (
              <>
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selected.title}</h2>
                    <p className="text-sm text-slate-500">
                      Bound PriceBookVersion · {selected.currency}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    INTERNAL ONLY
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {SIMULATOR_TABS.map((tab) => (
                    <span
                      key={tab}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Professional services use {FIRST_WAVE_HOURLY_PRICING.pricingModel}
                  /{FIRST_WAVE_HOURLY_PRICING.metric} pricing. Direct costs remain
                  separate by role: {FIRST_WAVE_SERVICE_ROLES.join(" and ")}.
                </p>
                <form onSubmit={createScenario} className="mt-6 flex gap-2">
                  <input
                    name="name"
                    required
                    placeholder="Scenario name"
                    className="flex-1 rounded border p-2 text-sm"
                  />
                  <button className="rounded border px-3 text-sm font-semibold">
                    Create scenario
                  </button>
                </form>
                <div className="mt-6 space-y-4">
                  {selected.scenarios?.map((scenario) => {
                    const run = scenario.runs[0];
                    const stale = run
                      ? run.scenarioLockVersion !== scenario.lockVersion
                      : false;
                    return (
                      <article
                        key={scenario.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <h3 className="font-medium">{scenario.name}</h3>
                          <button
                            onClick={() => choose(scenario)}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            {selected.selectedScenarioId === scenario.id
                              ? "Selected"
                              : "Select"}
                          </button>
                        </div>
                        <p
                          className={`mt-2 text-sm ${stale ? "text-amber-700" : "text-slate-500"}`}
                        >
                          {stale
                            ? "Stale — configuration changed after this run"
                            : run
                              ? "Immutable current run available"
                              : "Not calculated"}
                        </p>
                        <form
                          onSubmit={(event) => configure(event, scenario)}
                          className="mt-3"
                        >
                          <textarea
                            name="drivers"
                            defaultValue="[]"
                            aria-label="Typed driver values JSON"
                            className="h-20 w-full rounded border p-2 font-mono text-xs"
                          />
                          <button className="mt-2 rounded border px-2 py-1 text-xs">
                            Save typed inputs
                          </button>
                        </form>
                        <form
                          onSubmit={(event) => calculate(event, scenario)}
                          className="mt-3 grid gap-2 sm:grid-cols-2"
                        >
                          <input
                            name="costVersionId"
                            placeholder="Published cost assumption version UUID"
                            className="rounded border p-2 text-xs"
                          />
                          <input
                            name="valuationIds"
                            placeholder="Published valuation version UUIDs, comma-separated"
                            className="rounded border p-2 text-xs"
                          />
                          <button className="rounded bg-slate-900 px-2 py-2 text-xs text-white sm:col-span-2">
                            Calculate / recalculate
                          </button>
                        </form>
                        {run && (
                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                            <div>
                              Price:{" "}
                              {money(run.priceResult?.firstYearCommitmentMinor)}
                            </div>
                            <div>
                              Cost: {money(run.costResult?.firstYearCostMinor)}
                            </div>
                            <div>
                              Margin:{" "}
                              {run.priceResult && run.costResult
                                ? money(
                                    (
                                      BigInt(
                                        run.priceResult
                                          .firstYearCommitmentMinor,
                                      ) -
                                      BigInt(run.costResult.firstYearCostMinor)
                                    ).toString(),
                                  )
                                : "Unavailable"}
                            </div>
                          </div>
                        )}
                        {run?.valueResults?.length ? (
                          <p className="mt-2 text-sm text-emerald-700">
                            Document Compliance customer-safe value evidence
                            available.
                          </p>
                        ) : null}
                        {run &&
                        selected.selectedScenarioId === scenario.id &&
                        !stale ? (
                          <form
                            onSubmit={(event) => convert(event, scenario, run)}
                            className="mt-4 grid gap-2 sm:grid-cols-2"
                          >
                            <input
                              name="title"
                              required
                              placeholder="Proposal title"
                              className="rounded border p-2 text-sm"
                            />
                            <select
                              name="relationship"
                              className="rounded border p-2 text-sm"
                            >
                              <option value="DIRECT">Direct</option>
                              <option value="PARTNER">Partner</option>
                            </select>
                            <input
                              name="recipientLegalName"
                              required
                              placeholder="Recipient legal name"
                              className="rounded border p-2 text-sm"
                            />
                            <input
                              name="recipientDisplayName"
                              required
                              placeholder="Recipient display name"
                              className="rounded border p-2 text-sm"
                            />
                            <input
                              name="valueDisclaimerFr"
                              placeholder="Value disclaimer (when value exists)"
                              className="rounded border p-2 text-sm sm:col-span-2"
                            />
                            <button className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white sm:col-span-2">
                              Convert explicitly to Proposal
                            </button>
                          </form>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  Calculations never create contracts, entitlements, invoices,
                  usage records, or operational changes.
                </p>
              </>
            ) : (
              <p className="text-slate-500">
                Select a workspace to compare its scenarios.
              </p>
            )}
            {message && (
              <p className="mt-4 text-sm text-emerald-700">{message}</p>
            )}
          </section>
        </div>
      </main>
    </AppLayout>
  );
}
