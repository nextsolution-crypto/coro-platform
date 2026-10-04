"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
type Proposal = {
  id: string;
  reference: string;
  title: string;
  status: string;
  organization?: { name: string };
  prospect?: { displayName: string };
  revisions: { revisionNumber: number; status: string; validUntil?: string }[];
};
export default function ProposalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Proposal[]>([]);
  useEffect(() => {
    api.get("/admin/v1/commercial/proposals").then((r) => setItems(r.data));
  }, []);
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Commercial
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Propositions CORO
            </h1>
            <p className="mt-2 text-slate-500">
              Configuration, prix explicables, offre PDF et conversion
              contractuelle.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/commercial/proposals/new")}
            className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Nouvelle proposition
          </button>
        </div>
        <div className="mt-8 overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4">Référence</th>
                <th>Cible</th>
                <th>Statut</th>
                <th>Révision</th>
                <th>Validité</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const r = x.revisions[0];
                return (
                  <tr
                    key={x.id}
                    className="cursor-pointer border-t"
                    onClick={() =>
                      router.push(`/admin/commercial/proposals/${x.id}`)
                    }
                  >
                    <td className="p-4">
                      <b>{x.reference}</b>
                      <div className="text-slate-500">{x.title}</div>
                    </td>
                    <td>{x.organization?.name || x.prospect?.displayName}</td>
                    <td>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                        {r?.status || x.status}
                      </span>
                    </td>
                    <td>{r ? `v${r.revisionNumber}` : "—"}</td>
                    <td>
                      {r?.validUntil
                        ? new Date(r.validUntil).toLocaleDateString("fr-CA")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!items.length && (
            <p className="p-8 text-center text-slate-500">
              Aucune proposition. La migration ne crée aucune donnée
              commerciale.
            </p>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
