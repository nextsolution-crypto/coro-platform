"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
type LoadState = "LOADING" | "LOADED" | "ERROR" | "UNAUTHORIZED";
type TargetFilter = "ALL" | "PROSPECT" | "ORGANIZATION";

export default function ProposalsPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("LOADING");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<TargetFilter>("ALL");
  const [status, setStatus] = useState("ALL");

  const load = useCallback(async () => {
    setLoadState("LOADING");
    try {
      const response = await api.get("/admin/v1/commercial/proposals");
      setItems(Array.isArray(response.data) ? response.data : []);
      setLoadState("LOADED");
    } catch (error) {
      const responseStatus = (error as { response?: { status?: number } })
        .response?.status;
      setLoadState(
        responseStatus === 401 || responseStatus === 403
          ? "UNAUTHORIZED"
          : "ERROR",
      );
    }
  }, []);

  useEffect(() => {
    // Initial synchronization with the SUPER_ADMIN proposal index.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          items.map(
            (proposal) => proposal.revisions[0]?.status ?? proposal.status,
          ),
        ),
      ).sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr-CA");
    return items.filter((proposal) => {
      const customer =
        proposal.organization?.name ?? proposal.prospect?.displayName ?? "";
      const currentStatus = proposal.revisions[0]?.status ?? proposal.status;
      return (
        (!needle ||
          [proposal.reference, proposal.title, customer].some((value) =>
            value.toLocaleLowerCase("fr-CA").includes(needle),
          )) &&
        (target === "ALL" ||
          (target === "PROSPECT" && Boolean(proposal.prospect)) ||
          (target === "ORGANIZATION" && Boolean(proposal.organization))) &&
        (status === "ALL" || currentStatus === status)
      );
    });
  }, [items, search, status, target]);

  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Commercial
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Propositions CORO
            </h1>
            <p className="mt-2 text-slate-500">
              Retrouvez les propositions existantes et poursuivez leur
              préparation.
            </p>
          </div>
          <Link
            href="/admin/commercial/configurator"
            className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Préparer une offre
          </Link>
        </div>

        {loadState === "LOADED" && items.length > 0 && (
          <section
            aria-label="Filtres des propositions"
            className="mt-6 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3"
          >
            <label className="text-sm font-medium">
              Rechercher
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Référence, titre ou client"
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Cible
              <select
                value={target}
                onChange={(event) =>
                  setTarget(event.target.value as TargetFilter)
                }
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="ALL">Toutes</option>
                <option value="PROSPECT">Prospects</option>
                <option value="ORGANIZATION">Organisations</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Statut
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="ALL">Tous</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border bg-white">
          {loadState === "LOADING" && (
            <p role="status" className="p-8 text-center text-slate-600">
              Chargement des propositions…
            </p>
          )}
          {loadState === "ERROR" && (
            <StateMessage
              title="Impossible de charger les propositions"
              detail="La liste n’a pas pu être récupérée. Aucune conclusion n’est tirée sur les données existantes."
              onRetry={() => void load()}
            />
          )}
          {loadState === "UNAUTHORIZED" && (
            <StateMessage
              title="Accès non autorisé"
              detail="Cette liste est réservée aux Super Administrateurs."
              onRetry={() => void load()}
            />
          )}
          {loadState === "LOADED" && items.length === 0 && (
            <div className="space-y-2 p-8 text-center">
              <p className="font-medium">Aucune proposition enregistrée.</p>
              <p className="text-sm text-slate-600">
                Préparez une offre depuis un prospect ou le Configurateur pour
                créer explicitement un brouillon.
              </p>
            </div>
          )}
          {loadState === "LOADED" &&
            items.length > 0 &&
            filtered.length === 0 && (
              <p className="p-8 text-center text-slate-600">
                Aucune proposition ne correspond aux filtres.
              </p>
            )}
          {loadState === "LOADED" && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th>Cible</th>
                    <th>Statut</th>
                    <th>Révision</th>
                    <th>Validité</th>
                    <th className="pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((proposal) => {
                    const revision = proposal.revisions[0];
                    return (
                      <tr key={proposal.id} className="border-t">
                        <td className="p-4">
                          <b>{proposal.reference}</b>
                          <div className="text-slate-500">{proposal.title}</div>
                        </td>
                        <td>
                          {proposal.organization?.name ??
                            proposal.prospect?.displayName ??
                            "—"}
                        </td>
                        <td>{revision?.status ?? proposal.status}</td>
                        <td>
                          {revision ? `v${revision.revisionNumber}` : "—"}
                        </td>
                        <td>
                          {revision?.validUntil
                            ? new Date(revision.validUntil).toLocaleDateString(
                                "fr-CA",
                              )
                            : "—"}
                        </td>
                        <td className="pr-4">
                          <Link
                            href={`/admin/commercial/proposals/${proposal.id}`}
                            className="font-medium text-emerald-800 underline"
                          >
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}

function StateMessage({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="space-y-3 p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-600">{detail}</p>
      <button onClick={onRetry} className="rounded border px-4 py-2">
        Réessayer
      </button>
    </div>
  );
}
