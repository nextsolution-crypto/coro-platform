"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import {
  ControlCenterSummaryCard,
  CommercialRelationshipBadge,
  OrganizationStatusBadge,
} from "@/components/admin/control-center/ControlCenterComponents";
type AttentionOrganization = {
  id: string;
  name: string;
  isActive: boolean;
  commercialRelationship?: string | null;
};
type ControlOverview = {
  organizations: Record<string, number>;
  commercial: Record<string, number>;
  entitlements: Record<string, number>;
  operational: Record<string, { value: number }>;
  attentionItems: AttentionOrganization[];
  measurement: { supportedMetrics: number; currentResults: number; correctedResultRows: number; organizationsWithMeasurements: number; billingStatus: string };
};
export default function ControlCenterPage() {
  const [data, setData] = useState<ControlOverview>();
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/admin/v1/control-center/overview")
      .then((r) => setData(r.data))
      .catch(() => setError("Control Center unavailable."));
  }, []);
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-semibold">Control Center</h1>
        <p className="text-sm text-slate-600">
          Platform cockpit · Observation only · No enforcement
        </p>
        {error ? (
          <p className="mt-6 text-red-700">{error}</p>
        ) : !data ? (
          <p className="mt-6">Loading…</p>
        ) : (
          <>
            <h2 className="mt-8 text-xl font-semibold">Platform Summary</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <ControlCenterSummaryCard
                label="Active organizations"
                value={data.organizations.active}
                href="/admin/organizations"
              />
              <ControlCenterSummaryCard
                label="Suspended"
                value={data.organizations.suspended}
                href="/admin/organizations"
              />
              <ControlCenterSummaryCard
                label="Partner"
                value={data.organizations.PARTNER}
              />
              <ControlCenterSummaryCard
                label="Active contracts"
                value={data.commercial.activeContracts}
                href="/admin/commercial/contracts"
              />
              <ControlCenterSummaryCard
                label="Effective entitlements"
                value={data.entitlements.effective}
                href="/admin/commercial/entitlements"
              />
              <ControlCenterSummaryCard
                label="Sites"
                value={data.operational.sites.value}
                href="/admin/map"
              />
            </div>
            <h2 className="mt-8 text-xl font-semibold">Commercial Attention</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ControlCenterSummaryCard
                label="Accepted without contract"
                value={data.commercial.acceptedProposalsWithoutContract}
                href="/admin/commercial/reconciliation"
              />
              <ControlCenterSummaryCard
                label="Contracts without entitlement"
                value={data.commercial.contractsWithoutEntitlement}
                href="/admin/commercial/reconciliation"
              />
              <ControlCenterSummaryCard
                label="Expiring entitlements"
                value={data.entitlements.expiring}
                href="/admin/commercial/entitlements"
              />
            </div>
            <h2 className="mt-8 text-xl font-semibold">
              Operational Attention
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ControlCenterSummaryCard
                label="Active incidents"
                value={data.operational.activeIncidents.value}
              />
              <ControlCenterSummaryCard
                label="Population programs"
                value={data.operational.populationPrograms.value}
              />
              <ControlCenterSummaryCard
                label="Open corrective actions"
                value={data.operational.openCorrectiveActions.value}
              />
              <ControlCenterSummaryCard label="Active evacuations" value={data.operational.activeEvacuations.value} />
              <ControlCenterSummaryCard label="Active Population operations" value={data.operational.activePopulationOperations.value} />
            </div>
            <h2 className="mt-8 text-xl font-semibold">Measurement</h2>
            <p className="text-sm text-slate-600">Operational measurements · Commercial evaluation not performed</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <ControlCenterSummaryCard label="Supported metrics" value={data.measurement.supportedMetrics} href="/admin/metering" />
              <ControlCenterSummaryCard label="Current results" value={data.measurement.currentResults} href="/admin/metering" />
              <ControlCenterSummaryCard label="Corrected result rows" value={data.measurement.correctedResultRows} href="/admin/metering" />
              <ControlCenterSummaryCard label="Organizations measured" value={data.measurement.organizationsWithMeasurements} href="/admin/metering" />
            </div>
            <h2 className="mt-8 text-xl font-semibold">
              Organizations requiring attention
            </h2>
            <div className="mt-3 rounded-xl border bg-white">
              {data.attentionItems.map((o) => (
                <Link
                  className="flex items-center gap-3 border-b p-3 last:border-0"
                  key={o.id}
                  href={`/admin/organizations/${o.id}`}
                >
                  <span className="flex-1 font-medium">{o.name}</span>
                  <OrganizationStatusBadge active={o.isActive} />
                  <CommercialRelationshipBadge
                    value={o.commercialRelationship}
                  />
                </Link>
              ))}
            </div>
            <h2 className="mt-8 text-xl font-semibold">Quick navigation</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                ["Organizations", "/admin/organizations"],
                ["Map", "/admin/map"],
                ["Health", "/admin/health"],
                ["Commercial", "/admin/commercial"],
                ["Product", "/admin/product-catalog"],
                ["Metering", "/admin/metering"],
              ].map(([label, href]) => (
                <Link
                  className="rounded-lg border bg-white px-4 py-2"
                  key={href}
                  href={href}
                >
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
