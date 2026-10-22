"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Item = { id: string; capability: { code: string; nameFr: string }; active: boolean; quantity?: string | null; quantityUnit?: string | null };
type Subscription = { id: string; reference: string; status: string; billingCadence: string; renewalAt?: string | null; lockVersion: number; contract: { reference: string }; items: Item[] };

export default function SubscriptionOperationsPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [items, setItems] = useState<Subscription[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await api.get(`/admin/v1/organizations/${organizationId}/subscriptions`);
      setItems(response.data);
      setError("");
    } catch { setError("Impossible de charger les souscriptions."); }
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  const transition = async (subscription: Subscription, action: string) => {
    const reason = window.prompt("Justification obligatoire");
    if (!reason) return;
    try {
      await api.post(`/admin/v1/organizations/${organizationId}/subscriptions/${subscription.id}/${action}`, { lockVersion: subscription.lockVersion, reason });
      await load();
    } catch { setError("Transition refusée. Vérifiez le statut, la permission et la version."); }
  };

  return <AppLayout><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <Link href={`/admin/organizations/${organizationId}?tab=commercial`} className="text-sm font-medium text-red-700 underline">← Organization 360</Link>
    <header className="mt-4 rounded-xl border bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-700">Commercial authority</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Subscriptions</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">Contract-linked modules, explicit lifecycle transitions and entitlement continuity. PAST_DUE never suspends operational access automatically.</p>
    </header>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section className="mt-5 grid gap-4">
      {items.map((subscription) => <article key={subscription.id} className="min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="break-words font-semibold text-slate-900">{subscription.reference}</h2><p className="mt-1 text-sm text-slate-600">{subscription.contract.reference} · {subscription.billingCadence} · renewal {subscription.renewalAt ?? "not scheduled"}</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{subscription.status}</span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{subscription.items.map((item) => <li key={item.id} className="rounded-lg border bg-slate-50 p-3 text-sm"><strong>{item.capability.nameFr}</strong><span className="mt-1 block text-xs text-slate-600">{item.active ? "ACTIVE" : "PENDING"} · {item.quantity ?? "—"} {item.quantityUnit ?? ""}</span></li>)}</ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {subscription.status === "DRAFT" && <Action label="Activate" onClick={() => transition(subscription, "activate")} />}
          {subscription.status === "ACTIVE" && <Action label="Mark past due" onClick={() => transition(subscription, "past-due")} secondary />}
          {["ACTIVE", "PAST_DUE"].includes(subscription.status) && <Action label="Suspend explicitly" onClick={() => transition(subscription, "suspend")} secondary />}
          {["PAST_DUE", "SUSPENDED"].includes(subscription.status) && <Action label="Reactivate" onClick={() => transition(subscription, "reactivate")} />}
          {subscription.status !== "TERMINATED" && <Action label="Terminate" onClick={() => transition(subscription, "terminate")} danger />}
        </div>
      </article>)}
      {!items.length && !error && <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No governed subscription exists. Creation remains API-governed from an accepted proposal and signed active contract.</div>}
    </section>
  </main></AppLayout>;
}

function Action({ label, onClick, secondary, danger }: { label: string; onClick: () => void; secondary?: boolean; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${danger ? "border border-red-300 bg-white text-red-800" : secondary ? "border bg-white text-slate-800" : "bg-slate-900 text-white"}`}>{label}</button>;
}
