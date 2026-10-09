"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { ORGANIZATION_360_TABS } from "./organization360-contract.mjs";
import {
  CapabilityMatrix,
  CapabilityScopeTree,
  LegacyLicensePanel,
} from "@/components/admin/control-center/ControlCenterComponents";

type JsonRecord = Record<string, unknown>;
type TabCode = (typeof ORGANIZATION_360_TABS)[number][0];
type Overview = {
  organization: { name: string; isActive: boolean; licenseType: string };
  counts: Record<string, number>;
};
const palette = {
  ink: "#243447",
  muted: "#667085",
  red: "#C0392B",
  line: "#E5E7EB",
  panel: "#FFFFFF",
  soft: "#F8FAFC",
};

export default function Organization360Page() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabCode>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchTab = async () => {
      try {
        const base = `/admin/v1/organizations/${organizationId}`;
        const overviewResponse = await api.get(`${base}/overview`);
        const selectedResponse =
          tab === "overview"
            ? overviewResponse
            : tab === "capabilities"
              ? {
                  data: {
                    matrix: (await api.get(`${base}/capability-matrix`)).data,
                    tree: (await api.get(`${base}/scope-tree`)).data,
                    reconciliation: (
                      await api.get(`${base}/commercial-reconciliation`)
                    ).data,
                  },
                }
              : tab === "measurement"
                ? await api.get(`${base}/metering?page=1&pageSize=10`)
                : await api.get(`${base}/${tab}`);
        if (!cancelled) {
          setOverview(overviewResponse.data);
          setPayload(selectedResponse.data);
          setError("");
        }
      } catch {
        if (!cancelled)
          setError("Impossible de charger cette vue Organization 360.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchTab();
    return () => {
      cancelled = true;
    };
  }, [organizationId, tab]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <button
          type="button"
          onClick={() => router.push("/admin/organizations")}
          className="mb-4 text-sm font-medium"
          style={{ color: palette.red }}
        >
          ← Organisations
        </button>
        <header
          className="rounded-xl p-6 shadow-sm"
          style={{
            background: palette.panel,
            border: `1px solid ${palette.line}`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: palette.red }}
              >
                Organization 360 · Observation mode
              </p>
              <h1
                className="mt-2 text-3xl font-semibold"
                style={{ color: palette.ink }}
              >
                {overview?.organization.name ?? "Organisation"}
              </h1>
              <p className="mt-1 text-sm" style={{ color: palette.muted }}>
                {overview?.organization.licenseType ?? "—"} ·{" "}
                {overview?.organization.isActive ? "Active" : "Suspendue"}
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "#FFF4E5", color: "#9A6700" }}
            >
              NO ENFORCEMENT
            </span>
          </div>
          <Link
            className="mt-4 inline-block text-sm font-medium underline"
            href={`/admin/commercial/dossier/ORGANIZATION/${organizationId}`}
          >
            Ouvrir le dossier commercial
          </Link>
        </header>
        <nav
          className="mt-5 flex gap-2 overflow-x-auto pb-2"
          aria-label="Organization 360"
        >
          {ORGANIZATION_360_TABS.map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLoading(true);
                setTab(code);
              }}
              className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                background: tab === code ? palette.ink : palette.panel,
                color: tab === code ? "#FFF" : palette.ink,
                border: `1px solid ${tab === code ? palette.ink : palette.line}`,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <main
          className="mt-4 min-h-80 rounded-xl p-5 shadow-sm"
          style={{
            background: palette.panel,
            border: `1px solid ${palette.line}`,
          }}
        >
          {loading ? (
            <State text="Chargement…" />
          ) : error ? (
            <State text={error} error />
          ) : (
            <TabContent
              tab={tab}
              payload={payload}
              organizationId={organizationId}
            />
          )}
        </main>
      </div>
    </AppLayout>
  );
}

function TabContent({
  tab,
  payload,
  organizationId,
}: {
  tab: TabCode;
  payload: unknown;
  organizationId: string;
}) {
  const data = (payload ?? {}) as JsonRecord;
  if (tab === "overview")
    return <OverviewPanel data={data as unknown as Overview} />;
  if (tab === "users")
    return (
      <ListPanel
        title="Users"
        items={(data.items as JsonRecord[]) ?? []}
        fields={["firstName", "lastName", "email", "role", "isActive"]}
      />
    );
  if (tab === "clients")
    return (
      <ListPanel
        title="Clients"
        items={(data.items as JsonRecord[]) ?? []}
        fields={["name", "city", "province", "isActive"]}
      />
    );
  if (tab === "sites")
    return (
      <ListPanel
        title="Sites"
        items={(data.items as JsonRecord[]) ?? []}
        fields={["name", "city", "province", "buildingType", "isActive"]}
      />
    );
  if (tab === "capabilities")
    return <CapabilitiesPanel data={data} organizationId={organizationId} />;
  if (tab === "commercial") return <CommercialPanel data={data} />;
  if (tab === "usage")
    return <UsagePanel metrics={(data.metrics as JsonRecord[]) ?? []} />;
  if (tab === "measurement")
    return <MeasurementPanel data={data} organizationId={organizationId} />;
  if (tab === "security") return <SecurityPanel data={data} />;
  return <AuditPanel data={data} />;
}

function MeasurementPanel({
  data,
  organizationId,
}: {
  data: JsonRecord;
  organizationId: string;
}) {
  const items = (data.items as JsonRecord[]) ?? [];
  return (
    <section>
      <Title
        title="Measurement"
        subtitle="Résultats opérationnels immuables · Évaluation commerciale non effectuée."
      />
      <Link
        className="mb-4 inline-block font-medium text-red-700"
        href={`/admin/metering?organizationId=${organizationId}`}
      >
        Open Metering →
      </Link>
      {items.length === 0 ? (
        <State text="NOT_AVAILABLE — aucun résultat de mesure enregistré." />
      ) : (
        <ListPanel
          title="Measurement results"
          items={items}
          fields={[
            "metricCode",
            "quantity",
            "unit",
            "sourceQuality",
            "periodStart",
            "periodEnd",
            "status",
          ]}
        />
      )}
    </section>
  );
}

function OverviewPanel({ data }: { data: Overview }) {
  const counts = data?.counts ?? {};
  return (
    <section>
      <Title
        title="Overview"
        subtitle="Résumé administratif cross-tenant en lecture seule."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Utilisateurs actifs", counts.activeUsers],
          ["Clients actifs", counts.activeClients],
          ["Sites actifs", counts.activeSites],
          ["Projets actifs", counts.activeProjects],
        ].map(([label, value]) => (
          <MetricCard
            key={String(label)}
            label={String(label)}
            value={Number(value ?? 0)}
          />
        ))}
      </div>
    </section>
  );
}

function ListPanel({
  title,
  items,
  fields,
}: {
  title: string;
  items: JsonRecord[];
  fields: string[];
}) {
  return (
    <section>
      <Title
        title={title}
        subtitle={`${items.length} élément(s) affiché(s).`}
      />
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field} className="border-b px-3 py-2 capitalize">
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={String(item.id ?? index)}>
                  {fields.map((field) => (
                    <td key={field} className="border-b px-3 py-3">
                      {formatValue(item[field])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <State text="Aucune donnée." />
      )}
    </section>
  );
}

function CapabilitiesPanel({
  data,
  organizationId,
}: {
  data: JsonRecord;
  organizationId: string;
}) {
  const matrix = (data.matrix ?? {}) as JsonRecord;
  const tree = (data.tree ?? {}) as JsonRecord;
  const reconciliation = (data.reconciliation ?? {}) as JsonRecord;
  const items: JsonRecord[] = [];
  return (
    <section>
      <Title
        title="Capabilities"
        subtitle="Proposed, contracted, entitled, configured and observed remain distinct."
      />
      <Link
        href={`/admin/commercial/entitlements/${organizationId}`}
        className="mb-5 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white"
      >
        Open Capability Operations
      </Link>
      <CapabilityMatrix
        rows={
          (matrix.rows as ComponentProps<typeof CapabilityMatrix>["rows"]) ?? []
        }
      />
      <h3 className="mt-8 font-semibold">Organization / Client / Site</h3>
      <p className="mb-3 text-xs text-slate-500">
        Explicit entitlements only · no implicit inheritance.
      </p>
      <CapabilityScopeTree
        root={tree.root as ComponentProps<typeof CapabilityScopeTree>["root"]}
      />
      <h3 className="mt-8 font-semibold">Reconciliation</h3>
      <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
        {JSON.stringify(reconciliation.organizationMismatches ?? [], null, 2)}
      </pre>
    </section>
  );
  return (
    <section>
      <Title
        title="Capabilities"
        subtitle="Signaux opérationnels observés, distincts de tout entitlement commercial."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => {
          const entitlement = (item.entitlement ?? {}) as JsonRecord;
          const grants = (entitlement.grants as JsonRecord[]) ?? [];
          return (
            <article
              key={String(item.code)}
              className="rounded-lg p-4"
              style={{ border: `1px solid ${palette.line}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <strong>{String(item.label)}</strong>
                <Badge>{String(item.lifecycle)}</Badge>
              </div>
              <p className="mt-2 text-xs" style={{ color: palette.muted }}>
                Platform: {String(item.platformAvailability)} · Entitlement:{" "}
                {String(item.commercialEntitlement)}
              </p>
              <p className="mt-2 text-sm">
                Licensed:{" "}
                <strong>{String(entitlement.licensed ?? false)}</strong>
                {" · "}
                Enabled: <strong>{String(entitlement.enabled ?? false)}</strong>
                {" · "}
                Distributable:{" "}
                <strong>{String(entitlement.distributable ?? false)}</strong>
              </p>
              <p className="text-xs" style={{ color: palette.muted }}>
                Mismatch: {String(item.mismatch ?? "UNKNOWN")} · Enforcement:
                NONE
              </p>
              {grants.map((grant) => {
                const revision = (grant.revision ?? {}) as JsonRecord;
                const limits = (grant.limits as JsonRecord[]) ?? [];
                return (
                  <div
                    key={String(grant.id)}
                    className="mt-2 rounded p-2 text-xs"
                    style={{ background: palette.soft }}
                  >
                    {String(grant.source)} · {String(grant.scope)} ·{" "}
                    {String(grant.effectiveState)} · from{" "}
                    {formatValue(revision.effectiveFrom)}
                    {grant.parentEntitlementId
                      ? ` · parent ${String(grant.parentEntitlementId)}`
                      : ""}
                    {limits.map((limit) => (
                      <span key={String(limit.id)}>
                        {" "}
                        · {String(limit.type)}:{" "}
                        {limit.unlimited
                          ? "UNLIMITED"
                          : formatValue(limit.quantity)}
                      </span>
                    ))}
                  </div>
                );
              })}
              <div className="mt-3 space-y-1">
                {((item.observedSignals as JsonRecord[]) ?? []).map(
                  (signal) => (
                    <p key={String(signal.code)} className="text-sm">
                      {String(signal.code)}:{" "}
                      <strong>{formatValue(signal.value)}</strong>{" "}
                      <small>({String(signal.classification)})</small>
                    </p>
                  ),
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CommercialPanel({ data }: { data: JsonRecord }) {
  const { organizationId } = useParams<{ organizationId: string }>();
  const legacy = (data.legacy ?? {}) as JsonRecord;
  const contracts = (data.contracts as JsonRecord[]) ?? [];
  const proposals = (data.proposals as JsonRecord[]) ?? [];
  const entitlementSummary = (data.entitlementSummary as JsonRecord[]) ?? [];
  const current =
    data.contract && typeof data.contract === "object"
      ? (data.contract as JsonRecord)
      : null;
  const [relationship, setRelationship] = useState(
    String(data.relationship ?? "NOT_CONFIGURED"),
  );
  const [message, setMessage] = useState("");
  const save = async () => {
    const reason = window.prompt("Raison obligatoire du changement");
    if (!reason) return;
    await api.patch(
      `/admin/v1/organizations/${organizationId}/commercial-identity`,
      {
        commercialRelationship:
          relationship === "NOT_CONFIGURED" ? null : relationship,
        reason,
      },
    );
    setMessage(
      "Commercial Relationship enregistrée. Aucun entitlement n’a été créé.",
    );
  };
  return (
    <section>
      <Title
        title="Commercial"
        subtitle="Identité commerciale uniquement; aucun catalogue, contrat ou entitlement n’est assigné."
      />
      <div className="mb-5 rounded-lg border p-4">
        <label className="text-sm font-semibold">Commercial Relationship</label>
        <div className="mt-2 flex gap-2">
          <select
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="NOT_CONFIGURED">NOT_CONFIGURED</option>
            <option value="DIRECT">DIRECT</option>
            <option value="PARTNER">PARTNER</option>
            <option value="INTERNAL">INTERNAL</option>
          </select>
          <button
            type="button"
            onClick={save}
            className="rounded bg-slate-800 px-4 py-2 text-white"
          >
            Save
          </button>
        </div>
        {message ? (
          <p className="mt-2 text-xs text-emerald-700">{message}</p>
        ) : null}
      </div>
      <KeyValues
        rows={[
          ["License type legacy", legacy.licenseType],
          ["Organization status", legacy.organizationStatus],
          ["Current Contract", current?.reference ?? "NOT_CONFIGURED"],
          ["Contract status", current?.status ?? "NOT_CONFIGURED"],
          ["Price Book legacy assignment", "NOT_ASSIGNED"],
          ["Pricing", data.pricing],
          ["Entitlements", data.entitlements ?? "OBSERVATION_ONLY"],
          ["Enforcement", data.enforcement ?? "NONE"],
          ["Billing", data.billing ?? "NOT_CONFIGURED"],
        ]}
      />
      <div className="mt-5">
        <LegacyLicensePanel
          licenseType={String(legacy.licenseType ?? "NOT_CONFIGURED")}
        />
      </div>
      <h3 className="mt-6 font-semibold">Commercial chain</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <strong>Proposals</strong>
          <p className="mt-1 text-sm text-slate-600">
            {proposals.length} proposal(s) ·{" "}
            {proposals.filter((proposal) => proposal.acceptedRevisionId).length}{" "}
            accepted
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <strong>Entitlements</strong>
          <p className="mt-1 text-sm text-slate-600">
            {entitlementSummary
              .map(
                (entry) =>
                  `${String(entry.source)}: ${formatValue((entry._count as JsonRecord)?.id)}`,
              )
              .join(" · ") || "None"}
          </p>
        </div>
      </div>
      <h3 className="mt-6 font-semibold">Contracts and history</h3>
      <div className="mt-3 space-y-3">
        {contracts.length ? (
          contracts.map((contract) => {
            const revisions = (contract.revisions as JsonRecord[]) ?? [];
            const revision = revisions[0];
            const book = (revision?.priceBookVersion as JsonRecord) ?? {};
            const priceBook = (book.priceBook as JsonRecord) ?? {};
            return (
              <article
                key={String(contract.id)}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>
                    {String(contract.reference)} · {String(contract.title)}
                  </strong>
                  <Badge>{String(contract.status)}</Badge>
                </div>
                <p className="mt-2 text-sm" style={{ color: palette.muted }}>
                  {String(revision?.termStartAt ?? "—")} →{" "}
                  {String(revision?.termEndAt ?? "open")} ·{" "}
                  {String(revision?.currency ?? "—")} ·{" "}
                  {String(revision?.billingCadence ?? "one-time")}
                </p>
                <p className="mt-1 text-xs" style={{ color: palette.muted }}>
                  PriceBook {String(priceBook.code ?? "—")} / version{" "}
                  {String(book.versionNumber ?? "—")} · renewal{" "}
                  {String(revision?.renewalMode ?? "—")}
                </p>
                <p className="mt-2 text-xs">
                  {revisions.length} revision(s) ·{" "}
                  {((contract.documents as JsonRecord[]) ?? []).length}{" "}
                  document(s)
                </p>
                {revision ? (
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <span>
                      Adjustments:{" "}
                      {((revision.adjustments as JsonRecord[]) ?? []).length}
                    </span>
                    <span>
                      Exclusivities:{" "}
                      {((revision.exclusivities as JsonRecord[]) ?? []).length}
                    </span>
                    <span>
                      Commitments:{" "}
                      {((revision.commitments as JsonRecord[]) ?? []).length}
                    </span>
                    <span>
                      Revision documents:{" "}
                      {((revision.documents as JsonRecord[]) ?? []).length}
                    </span>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <State text="Aucun contrat configuré." />
        )}
      </div>
    </section>
  );
}

function UsagePanel({ metrics }: { metrics: JsonRecord[] }) {
  return (
    <section>
      <Title
        title="Usage"
        subtitle="Toutes les métriques sont observationnelles et non facturables dans cette phase."
      />
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div
            key={String(metric.code)}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-3"
            style={{ background: palette.soft }}
          >
            <div>
              <strong className="text-sm">{String(metric.label)}</strong>
              <p className="text-xs" style={{ color: palette.muted }}>
                {String(metric.source)}
              </p>
            </div>
            <div className="text-right">
              <strong>{formatValue(metric.value)}</strong>
              <p className="text-xs">
                {String(metric.classification)} · NON BILLABLE
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SecurityPanel({ data }: { data: JsonRecord }) {
  return (
    <section>
      <Title
        title="Security"
        subtitle="Métadonnées agrégées; aucun secret ni credential exposé."
      />
      <KeyValues
        rows={Object.entries(data).filter(([key]) => key !== "usersByRole")}
      />
      <h3 className="mt-5 font-semibold">Users by role</h3>
      <pre
        className="mt-2 overflow-auto rounded-lg p-3 text-xs"
        style={{ background: palette.soft }}
      >
        {JSON.stringify(data.usersByRole ?? [], null, 2)}
      </pre>
    </section>
  );
}

function AuditPanel({ data }: { data: JsonRecord }) {
  const items = (data.items as JsonRecord[]) ?? [];
  return (
    <section>
      <Title
        title="Audit"
        subtitle="AdminAuditEvent append-only, paginé et redacted par le backend."
      />
      <div className="space-y-3">
        {items.map((event) => (
          <article
            key={String(event.id)}
            className="rounded-lg p-4"
            style={{ border: `1px solid ${palette.line}` }}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{String(event.action)}</strong>
              <time className="text-xs" style={{ color: palette.muted }}>
                {formatValue(event.createdAt)}
              </time>
            </div>
            <p className="mt-1 text-sm">
              {String(event.targetType)} ·{" "}
              {String(event.targetLabel ?? event.targetId)}
            </p>
            <p className="mt-1 text-xs" style={{ color: palette.muted }}>
              Par {String(event.actorDisplayName)} ({String(event.actorRole)})
            </p>
            {event.reason ? (
              <p className="mt-2 text-sm">Raison : {String(event.reason)}</p>
            ) : null}
          </article>
        ))}
        {!items.length && <State text="Aucun événement administratif." />}
      </div>
    </section>
  );
}

function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold" style={{ color: palette.ink }}>
        {title}
      </h2>
      <p className="mt-1 text-sm" style={{ color: palette.muted }}>
        {subtitle}
      </p>
    </div>
  );
}
function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-4" style={{ background: palette.soft }}>
      <strong className="text-2xl">{value}</strong>
      <span className="mt-1 block text-xs" style={{ color: palette.muted }}>
        {label}
      </span>
    </div>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2 py-1 text-xs"
      style={{ background: palette.soft }}
    >
      {children}
    </span>
  );
}
function State({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p
      className="py-16 text-center text-sm"
      style={{ color: error ? palette.red : palette.muted }}
    >
      {text}
    </p>
  );
}
function KeyValues({ rows }: { rows: [string, unknown][] }) {
  return (
    <dl className="divide-y">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-2">
          <dt className="text-sm" style={{ color: palette.muted }}>
            {label}
          </dt>
          <dd className="text-sm font-semibold">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "NOT AVAILABLE";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
