"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Invoice = { id: string; number?: string | null; status: string; periodStart: string; periodEnd: string; dueDate?: string | null; totalMinor: string; paidMinor: string; lockVersion: number; subscription: { reference: string }; payments: unknown[]; creditNotes: unknown[] };

export default function BillingOperationsPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setInvoices((await api.get(`/admin/v1/organizations/${organizationId}/billing/invoices`)).data); setError(""); }
    catch { setError("Impossible de charger la facturation."); }
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  const transition = async (invoice: Invoice, action: string) => {
    const reason = window.prompt("Justification obligatoire"); if (!reason) return;
    const body: Record<string, unknown> = { lockVersion: invoice.lockVersion, reason };
    if (action === "issue") { const invoiceNumber = window.prompt("Numéro de facture officiel"); if (!invoiceNumber) return; body.invoiceNumber = invoiceNumber; }
    try { await api.post(`/admin/v1/organizations/${organizationId}/billing/invoices/${invoice.id}/${action}`, body); await load(); }
    catch { setError("Opération refusée. Vérifiez la permission, le statut et la version."); }
  };
  const payment = async (invoice: Invoice) => {
    const amountMinor = window.prompt("Montant reçu en cents CAD"); const evidenceReference = window.prompt("Référence de preuve"); const reason = window.prompt("Justification");
    if (!amountMinor || !evidenceReference || !reason) return;
    try { await api.post(`/admin/v1/organizations/${organizationId}/billing/invoices/${invoice.id}/payments`, { amountMinor, evidenceReference, reason, paidAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID() }); await load(); }
    catch { setError("Paiement manuel refusé."); }
  };
  return <AppLayout><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <Link href={`/admin/organizations/${organizationId}?tab=commercial`} className="text-sm font-medium text-red-700 underline">← Organization 360</Link>
    <header className="mt-4 rounded-xl border bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-semibold uppercase tracking-widest text-red-700">Governed billing</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Invoices and payments</h1><p className="mt-2 text-sm text-slate-600">CAD · Net 30 · manual evidence only · no automatic collection, suspension or customer-data deletion.</p></header>
    {error && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section className="mt-5 grid gap-4">
      {invoices.map((invoice) => <article key={invoice.id} className="min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{invoice.number ?? "Draft invoice"}</h2><p className="mt-1 text-sm text-slate-600">{invoice.subscription.reference} · {invoice.periodStart} → {invoice.periodEnd}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{invoice.status}</span></div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Total" value={money(invoice.totalMinor)} /><Metric label="Paid" value={money(invoice.paidMinor)} /><Metric label="Due" value={invoice.dueDate ?? "Not issued"} /></dl>
        <div className="mt-4 flex flex-wrap gap-2">{invoice.status === "DRAFT" && <Action label="Approve" onClick={() => transition(invoice, "approve")} />}{invoice.status === "APPROVED" && <Action label="Issue" onClick={() => transition(invoice, "issue")} />}{["ISSUED", "PARTIAL", "PAST_DUE"].includes(invoice.status) && <Action label="Record payment" onClick={() => payment(invoice)} />}{["ISSUED", "PARTIAL"].includes(invoice.status) && <Action label="Mark past due" onClick={() => transition(invoice, "past-due")} secondary />}{["DRAFT", "APPROVED", "ISSUED"].includes(invoice.status) && <Action label="Cancel" onClick={() => transition(invoice, "cancel")} danger />}</div>
      </article>)}
      {!invoices.length && !error && <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No synthetic or issued invoice.</div>}
    </section>
  </main></AppLayout>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>; }
function Action({ label, onClick, secondary, danger }: { label: string; onClick: () => void; secondary?: boolean; danger?: boolean }) { return <button type="button" onClick={onClick} className={`min-h-11 rounded px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${danger ? "border border-red-300 bg-white text-red-800" : secondary ? "border bg-white text-slate-800" : "bg-slate-900 text-white"}`}>{label}</button>; }
function money(value: string) { const minor = BigInt(value); return `${(minor / BigInt(100)).toLocaleString("fr-CA")},${(minor % BigInt(100)).toString().padStart(2, "0")} $ CAD`; }
