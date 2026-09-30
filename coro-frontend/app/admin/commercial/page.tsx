"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { ControlCenterSummaryCard } from "@/components/admin/control-center/ControlCenterComponents";
type CommercialOverview = {
  expirations: { contracts: number; entitlements: number };
  partnerDistributions: number;
  mismatches: {
    acceptedProposalsWithoutContract: number;
    activeContractsWithoutEntitlement: number;
  };
};
export default function CommercialCenterPage() {
  const [data, setData] = useState<CommercialOverview>();
  useEffect(() => {
    api.get("/admin/v1/commercial/overview").then((r) => setData(r.data));
  }, []);
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-semibold">Commercial</h1>
        <p className="text-sm text-slate-600">
          Cockpit read-only · Observation only · No billing
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["Prospects", "/admin/commercial/prospects"],
            ["Proposals", "/admin/commercial/proposals"],
            ["New proposal", "/admin/commercial/proposals/new"],
            ["Contracts", "/admin/commercial/contracts"],
            ["Entitlements", "/admin/commercial/entitlements"],
            ["Reconciliation", "/admin/commercial/reconciliation"],
          ].map(([l, h]) => (
            <Link
              className="rounded-lg border bg-white px-4 py-2"
              key={h}
              href={h}
            >
              {l}
            </Link>
          ))}
        </div>
        {data ? (
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <ControlCenterSummaryCard
              label="Accepted without contract"
              value={data.mismatches.acceptedProposalsWithoutContract}
              href="/admin/commercial/reconciliation"
            />
            <ControlCenterSummaryCard
              label="Contracts without entitlement"
              value={data.mismatches.activeContractsWithoutEntitlement}
              href="/admin/commercial/reconciliation"
            />
            <ControlCenterSummaryCard
              label="Expiring contracts"
              value={data.expirations.contracts}
              href="/admin/commercial/contracts"
            />
            <ControlCenterSummaryCard
              label="Expiring entitlements"
              value={data.expirations.entitlements}
              href="/admin/commercial/entitlements"
            />
            <ControlCenterSummaryCard
              label="Partner distributions"
              value={data.partnerDistributions}
              href="/admin/commercial/entitlements"
            />
          </div>
        ) : (
          <p className="mt-8">Loading…</p>
        )}
      </div>
    </AppLayout>
  );
}
