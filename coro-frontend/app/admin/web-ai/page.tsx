"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Dashboard = {
  periodDays: number;
  service: { enabled: boolean; observabilityEnabled: boolean; provider: string; bedrockInvocationEnabled: boolean };
  corpus: { sourceCount: number; lastSync: { status: string; startedAt: string; completedAt?: string | null } | null };
  totals: { events: number; sessions: number };
  byCategory: Array<{ category: string; _count: { _all: number } }>;
  byResult: Array<{ result: string; _count: { _all: number } }>;
  commercial: Array<{ status: string; _count: { _all: number } }>;
  latency: { p50Ms: number | null; p95Ms: number | null };
  recommendations: Array<{ id: string; category: string; description: string; frequencyObserved: number; status: string }>;
  unavailableMetrics: string[];
};

export default function WebAIDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/admin/v1/web-ai/dashboard").then((response) => setData(response.data)).catch(() => setError("Le tableau de bord CORO AI est indisponible.")); }, []);
  return <AppLayout><main className="mx-auto max-w-7xl p-6">
    <h1 className="text-3xl font-semibold">CORO AI · Assistant Web</h1>
    <p className="mt-1 text-sm text-slate-600">Observabilité minimisée des 30 derniers jours. Les conversations et coordonnées ne sont pas affichées.</p>
    {error && <p role="alert" className="mt-5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!data && !error && <p aria-busy="true" className="mt-5 text-sm">Chargement des indicateurs…</p>}
    {data && <>
      <section aria-label="État du service" className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric label="Assistant" value={data.service.enabled ? "Activé" : "Désactivé"} />
        <Metric label="Mode" value={data.service.provider} />
        <Metric label="Bedrock réel" value={data.service.bedrockInvocationEnabled ? "Activé" : "Désactivé"} danger={data.service.bedrockInvocationEnabled} />
        <Metric label="Sources approuvées" value={String(data.corpus.sourceCount)} />
        <Metric label="Événements minimisés" value={String(data.totals.events)} />
        <Metric label="Sessions pseudonymisées" value={String(data.totals.sessions)} />
        <Metric label="Latence P50" value={data.latency.p50Ms === null ? "Indisponible" : `${data.latency.p50Ms} ms`} />
        <Metric label="Latence P95" value={data.latency.p95Ms === null ? "Indisponible" : `${data.latency.p95Ms} ms`} />
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Breakdown title="Besoins exprimés" rows={data.byCategory.map((row) => [row.category, row._count._all])} />
        <Breakdown title="Résultats" rows={data.byResult.map((row) => [row.result, row._count._all])} />
        <Breakdown title="Demandes commerciales" rows={data.commercial.map((row) => [row.status, row._count._all])} />
        <Breakdown title="Métriques non disponibles" rows={data.unavailableMetrics.map((value) => [value, "NOT_VERIFIED"])} />
      </section>
      <section className="mt-8 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Lacunes documentaires</h2>
        {data.recommendations.length === 0 ? <p className="mt-3 text-sm text-slate-600">Aucune recommandation enregistrée.</p> : <ul className="mt-3 divide-y">{data.recommendations.map((item) => <li key={item.id} className="py-3"><strong>{item.category}</strong><p className="text-sm text-slate-700">{item.description}</p><span className="text-xs text-slate-500">{item.frequencyObserved} observation(s) · {item.status}</span></li>)}</ul>}
      </section>
      <p className="mt-6 rounded border border-amber-200 bg-amber-50 p-3 text-sm">Ce tableau de bord ne permet pas d’activer Bedrock, de modifier le corpus public ni de consulter des conversations individuelles.</p>
    </>}
  </main></AppLayout>;
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${danger ? "text-red-700" : "text-slate-900"}`}>{value}</p></div>; }
function Breakdown({ title, rows }: { title: string; rows: Array<[string, number | string]> }) { return <div className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">{title}</h2>{rows.length === 0 ? <p className="mt-3 text-sm text-slate-600">Aucune donnée disponible.</p> : <dl className="mt-3 divide-y">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-2 text-sm"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>}</div>; }
