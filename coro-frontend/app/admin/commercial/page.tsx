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
  const [error, setError] = useState(false);
  useEffect(() => {
    api
      .get("/admin/v1/commercial/overview")
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, []);
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-semibold">Commercial</h1>
        <p className="text-sm text-slate-600">
          Vue d’ensemble des dossiers, contrats et écarts commerciaux.
        </p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
          href="/admin/commercial/journey"
        >
          Préparer une offre
        </Link>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["Dossiers commerciaux", "/admin/commercial/prospects"],
            ["Propositions", "/admin/commercial/proposals"],
            ["Contrats", "/admin/commercial/contracts"],
            ["Réconciliation", "/admin/commercial/reconciliation"],
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
        {error ? (
          <p
            role="alert"
            className="mt-8 rounded border border-red-200 bg-red-50 p-4"
          >
            Impossible de charger le tableau commercial.
          </p>
        ) : data ? (
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <ControlCenterSummaryCard
              label="Propositions acceptées sans contrat"
              value={data.mismatches.acceptedProposalsWithoutContract}
              href="/admin/commercial/reconciliation"
            />
            <ControlCenterSummaryCard
              label="Contrats sans activation"
              value={data.mismatches.activeContractsWithoutEntitlement}
              href="/admin/commercial/reconciliation"
            />
            <ControlCenterSummaryCard
              label="Contrats arrivant à échéance"
              value={data.expirations.contracts}
              href="/admin/commercial/contracts"
            />
            <ControlCenterSummaryCard
              label="Activations arrivant à échéance"
              value={data.expirations.entitlements}
              href="/admin/commercial/entitlements"
            />
            <ControlCenterSummaryCard
              label="Distributions partenaires"
              value={data.partnerDistributions}
              href="/admin/commercial/entitlements"
            />
          </div>
        ) : (
          <p role="status" className="mt-8">
            Chargement…
          </p>
        )}
      </div>
    </AppLayout>
  );
}
