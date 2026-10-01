"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import {
  CONFIGURATOR_API_BASE,
  CONFIGURATOR_BOUNDARY_NOTICE,
  LEGACY_SIMULATOR_ROUTE,
} from "./configurator-contract.mjs";
import { GuidedWorkspace } from "./GuidedWorkspace";

type TargetType = "ORGANIZATION" | "PROSPECT";
type Audience = "DIRECT" | "PARTNER";
type Readiness = "READY" | "AVAILABLE" | "NOT_CONFIGURED" | "SETUP_REQUIRED";
type Family = {
  code: string;
  labelFr: string;
  descriptionFr: string;
  displayOrder: number;
  availability: "AVAILABLE" | "LIMITED" | "FUTURE";
  capabilityCodes: string[];
  applicableDriverCodes: string[];
  optionalDriverCodes: string[];
  includedFeatureKeys: string[];
};
type Driver = {
  code: string;
  version: string;
  valueType: "DECIMAL" | "INTEGER" | "MONEY" | "TEXT";
  category: string;
  unit: string | null;
  labelFr: string;
  helpFr: string;
  required: boolean;
  visibility: string;
};
type Bootstrap = {
  families: Family[];
  drivers: Driver[];
  currencies: string[];
  readiness: { catalog: Readiness; cost: Readiness; value: Readiness };
};
type Target = {
  id: string;
  type: TargetType;
  displayName: string;
  secondaryLabel?: string | null;
  status: string;
  selectable: boolean;
  commercialRelationship?: Audience | null;
  convertedOrganizationId?: string | null;
};
type PriceBookOption = {
  priceBookVersionId: string;
  label: string;
  audience: Audience;
  currency: string;
  versionNumber: number;
  status: string;
  effectiveFrom: string | null;
};
type Workspace = {
  id: string;
  title: string;
  reference: string;
  status: string;
  organization?: { name: string };
  prospect?: { displayName: string };
};

const readinessStyle: Record<Readiness, string> = {
  READY: "bg-emerald-50 text-emerald-800",
  AVAILABLE: "bg-emerald-50 text-emerald-800",
  NOT_CONFIGURED: "bg-amber-50 text-amber-800",
  SETUP_REQUIRED: "bg-red-50 text-red-800",
};

export default function CommercialConfiguratorPage() {
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<Bootstrap>();
  const [targetType, setTargetType] = useState<TargetType>("ORGANIZATION");
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target>();
  const [audience, setAudience] = useState<Audience>("DIRECT");
  const [books, setBooks] = useState<PriceBookOption[]>([]);
  const [bookId, setBookId] = useState("");
  const [familyCode, setFamilyCode] = useState("COMPLIANCE");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");

  useEffect(() => {
    // The browser URL is the external source for the selected workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspaceId(
      new URLSearchParams(window.location.search).get("workspace") ?? "",
    );
  }, []);

  useEffect(() => {
    Promise.all([
      api.get(`${CONFIGURATOR_API_BASE}/bootstrap`),
      api.get("/admin/v1/commercial/simulator/workspaces"),
    ])
      .then(([boot, existing]) => {
        setBootstrap(boot.data);
        setWorkspaces(existing.data);
      })
      .catch(() =>
        setMessage("Impossible de charger le configurateur commercial."),
      );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const resource =
          targetType === "ORGANIZATION" ? "organizations" : "prospects";
        const response = await api.get(
          `${CONFIGURATOR_API_BASE}/targets/${resource}`,
          {
            params: { search: query || undefined, pageSize: 10 },
          },
        );
        setTargets(response.data.items);
      } catch {
        setTargets([]);
        setMessage("Recherche indisponible.");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, targetType]);

  useEffect(() => {
    if (!target) return;
    const authoritativeAudience = target.commercialRelationship ?? audience;
    api
      .get(`${CONFIGURATOR_API_BASE}/price-books`, {
        params: {
          targetType,
          targetId: target.id,
          audience: authoritativeAudience,
          currency: "CAD",
        },
      })
      .then((response) => {
        setBooks(response.data.candidates);
        if (response.data.candidates.length === 1)
          setBookId(response.data.candidates[0].priceBookVersionId);
        if (!response.data.candidates.length)
          setMessage(
            "Aucun catalogue actif admissible. Configuration du catalogue requise.",
          );
      })
      .catch(() =>
        setMessage("Impossible de résoudre un catalogue admissible."),
      );
  }, [target, audience, targetType]);

  const selectedFamily = bootstrap?.families.find(
    (item) => item.code === familyCode,
  );
  const familyDrivers = useMemo(() => {
    if (!selectedFamily || !bootstrap) return [];
    const codes = new Set([
      ...selectedFamily.applicableDriverCodes,
      ...selectedFamily.optionalDriverCodes,
    ]);
    return bootstrap.drivers.filter((driver) => codes.has(driver.code));
  }, [bootstrap, selectedFamily]);

  function chooseTarget(item: Target) {
    if (!item.selectable) return;
    setTarget(item);
    if (item.commercialRelationship) setAudience(item.commercialRelationship);
    setBooks([]);
    setBookId("");
    setQuery(item.displayName);
    setMessage("");
    setTitle(`${item.displayName} — Nouvelle configuration`);
  }

  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!target || !bookId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await api.post(`${CONFIGURATOR_API_BASE}/workspaces`, {
        title,
        description: description || undefined,
        [targetType === "ORGANIZATION" ? "organizationId" : "prospectId"]:
          target.id,
        priceBookVersionId: bookId,
        audience,
      });
      const nextId = response.data.id as string;
      setWorkspaceId(nextId);
      router.replace(`?workspace=${encodeURIComponent(nextId)}`, {
        scroll: false,
      });
    } catch {
      setMessage(
        "La configuration n’a pas pu être créée. Vérifiez la cible et le catalogue actif.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Commercial
            </p>
            <h1 className="text-3xl font-semibold">Commercial Configurator</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {CONFIGURATOR_BOUNDARY_NOTICE}
            </p>
          </div>
          <Link
            href={LEGACY_SIMULATOR_ROUTE}
            className="rounded border px-3 py-2 text-sm"
          >
            Advanced / Legacy Simulator
          </Link>
        </div>

        {workspaceId && bootstrap ? (
          <GuidedWorkspace
            workspaceId={workspaceId}
            families={bootstrap.families}
            drivers={bootstrap.drivers}
            onClose={() => {
              setWorkspaceId("");
              router.replace("/admin/commercial/configurator", {
                scroll: false,
              });
            }}
          />
        ) : (
          <>
            {bootstrap && (
              <section
                className="mt-6 grid gap-3 sm:grid-cols-3"
                aria-label="Commercial readiness"
              >
                {(["catalog", "cost", "value"] as const).map((key) => (
                  <div key={key} className="rounded-xl border bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {key === "catalog"
                        ? "Commercial catalog"
                        : `${key} assumptions`}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${readinessStyle[bootstrap.readiness[key]]}`}
                    >
                      {bootstrap.readiness[key].replaceAll("_", " ")}
                    </span>
                  </div>
                ))}
              </section>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
              <section className="space-y-6">
                <div className="rounded-xl border bg-white p-5">
                  <h2 className="text-lg font-semibold">1. Customer</h2>
                  <div className="mt-4 flex gap-2">
                    {(["ORGANIZATION", "PROSPECT"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setTargetType(type);
                          setQuery("");
                          setTarget(undefined);
                          setBooks([]);
                          setBookId("");
                        }}
                        className={`rounded-lg border px-3 py-2 text-sm ${targetType === type ? "bg-slate-900 text-white" : "bg-white"}`}
                      >
                        {type === "ORGANIZATION" ? "Organization" : "Prospect"}
                      </button>
                    ))}
                  </div>
                  <label className="mt-4 block text-sm font-medium">
                    Search by name
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setTarget(undefined);
                        setBooks([]);
                        setBookId("");
                      }}
                      className="mt-1 w-full rounded-lg border p-3"
                      placeholder={
                        targetType === "ORGANIZATION"
                          ? "Organization name"
                          : "Prospect name or reference"
                      }
                    />
                  </label>
                  <div
                    className="mt-2 max-h-60 overflow-y-auto rounded-lg border"
                    role="listbox"
                  >
                    {searching ? (
                      <p className="p-3 text-sm text-slate-500">Searching…</p>
                    ) : targets.length ? (
                      targets.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!item.selectable}
                          onClick={() => chooseTarget(item)}
                          className="block w-full border-b p-3 text-left last:border-b-0 disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <span className="font-medium">
                            {item.displayName}
                          </span>
                          <span className="ml-2 text-xs">{item.status}</span>
                          {item.secondaryLabel && (
                            <p className="text-xs text-slate-500">
                              {item.secondaryLabel}
                            </p>
                          )}
                          {item.convertedOrganizationId && (
                            <p className="text-xs text-amber-700">
                              Converted — use the Organization for new work.
                            </p>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-sm text-slate-500">
                        No matching target.
                      </p>
                    )}
                  </div>
                  {target && (
                    <p className="mt-3 rounded bg-emerald-50 p-3 text-sm">
                      <strong>Selected:</strong> {target.displayName} ·{" "}
                      {target.status}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border bg-white p-5">
                  <h2 className="text-lg font-semibold">
                    2. Commercial family
                  </h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {bootstrap?.families.map((family) => (
                      <button
                        key={family.code}
                        type="button"
                        disabled={family.availability === "FUTURE"}
                        onClick={() => setFamilyCode(family.code)}
                        className={`rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-55 ${familyCode === family.code ? "border-emerald-600 bg-emerald-50" : "bg-white"}`}
                      >
                        <div className="flex justify-between gap-2">
                          <strong>{family.labelFr}</strong>
                          <span className="text-xs">{family.availability}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {family.descriptionFr}
                        </p>
                        {!!family.includedFeatureKeys.length && (
                          <p className="mt-2 text-xs text-slate-500">
                            Included/dependencies:{" "}
                            {family.includedFeatureKeys.join(" · ")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-5">
                  <h2 className="text-lg font-semibold">
                    Typed business inputs
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Presentation only in C1. Values are configured in a later
                    guided phase.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {familyDrivers.map((driver) => (
                      <div key={driver.code} className="rounded-lg border p-3">
                        <div className="flex justify-between gap-2">
                          <strong>{driver.labelFr}</strong>
                          <span className="text-xs text-slate-500">
                            {driver.valueType}
                            {driver.unit ? ` · ${driver.unit}` : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {driver.helpFr}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {driver.visibility.replaceAll("_", " ")} ·{" "}
                          {driver.required ? "Required" : "Optional"}
                        </p>
                      </div>
                    ))}
                    {!familyDrivers.length && (
                      <p className="text-sm text-slate-500">
                        No guided input is required for this presentation family
                        in C1.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <form
                  onSubmit={createWorkspace}
                  className="rounded-xl border bg-white p-5"
                >
                  <h2 className="text-lg font-semibold">
                    3. Start configuration
                  </h2>
                  {!target?.commercialRelationship && target && (
                    <label className="mt-4 block text-sm font-medium">
                      Commercial audience
                      <select
                        value={audience}
                        onChange={(event) => {
                          setAudience(event.target.value as Audience);
                          setBooks([]);
                          setBookId("");
                        }}
                        className="mt-1 w-full rounded-lg border p-3"
                      >
                        <option value="DIRECT">Direct</option>
                        <option value="PARTNER">Partner</option>
                      </select>
                    </label>
                  )}
                  <label className="mt-4 block text-sm font-medium">
                    Active price book
                    <select
                      required
                      disabled={!target || !books.length}
                      value={bookId}
                      onChange={(event) => setBookId(event.target.value)}
                      className="mt-1 w-full rounded-lg border p-3"
                    >
                      <option value="">Select an active catalogue</option>
                      {books.map((book) => (
                        <option
                          key={book.priceBookVersionId}
                          value={book.priceBookVersionId}
                        >
                          {book.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {target && !books.length && (
                    <p className="mt-2 text-sm text-red-700">
                      Catalog setup required.{" "}
                      <Link
                        className="underline"
                        href="/admin/product-catalog/price-books"
                      >
                        Open catalog administration
                      </Link>
                      .
                    </p>
                  )}
                  <label className="mt-4 block text-sm font-medium">
                    Workspace title
                    <input
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="mt-1 w-full rounded-lg border p-3"
                    />
                  </label>
                  <label className="mt-4 block text-sm font-medium">
                    Description (optional)
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="mt-1 w-full rounded-lg border p-3"
                    />
                  </label>
                  <button
                    disabled={busy || !target || !bookId || !title.trim()}
                    className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-40"
                  >
                    {busy ? "Creating…" : "Create commercial configuration"}
                  </button>
                  <p className="mt-3 text-xs text-slate-500">
                    Currency is inherited from the selected PriceBookVersion. No
                    price, cost or value is created here.
                  </p>
                </form>
                <section className="rounded-xl border bg-white p-5">
                  <h2 className="font-semibold">Recent configurations</h2>
                  <div className="mt-3 space-y-2">
                    {workspaces.slice(0, 6).map((workspace) => (
                      <Link
                        key={workspace.id}
                        href={`?workspace=${encodeURIComponent(workspace.id)}`}
                        onClick={() => setWorkspaceId(workspace.id)}
                        className="block rounded border p-3 text-sm"
                      >
                        <strong>{workspace.title}</strong>
                        <p className="text-xs text-slate-500">
                          {workspace.organization?.name ??
                            workspace.prospect?.displayName}{" "}
                          · {workspace.status}
                        </p>
                      </Link>
                    ))}
                    {!workspaces.length && (
                      <p className="text-sm text-slate-500">
                        No existing configuration.
                      </p>
                    )}
                  </div>
                </section>
              </aside>
            </div>
            {message && (
              <p
                role="status"
                className="mt-5 rounded border bg-white p-3 text-sm"
              >
                {message}
              </p>
            )}
          </>
        )}
      </main>
    </AppLayout>
  );
}
