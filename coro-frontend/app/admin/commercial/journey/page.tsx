"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { loadAllTargets } from "./target-pagination.mjs";

type TargetType = "PROSPECT" | "ORGANIZATION";
type Target = {
  id: string;
  type: TargetType;
  displayName: string;
  secondaryLabel?: string | null;
  status: string;
  selectable: boolean;
};
type Dossier = {
  target: { id: string; type: TargetType; name: string };
  workspaces: Array<{
    id: string;
    title: string;
    resumeUrl: string;
    scenarios: Array<{
      retained: boolean;
      currentOfficialRun: { current: boolean } | null;
    }>;
  }>;
  proposals: Array<{
    id: string;
    reference: string;
    detailUrl: string;
    latestRevision: null | {
      status: string;
      documentReadiness: string;
    };
  }>;
  progress: Array<{ code: string; complete: boolean }>;
  blockers: Array<{ code: string; label: string }>;
  nextActions: Array<{ code: string; label: string; href: string | null }>;
};

const steps = [
  {
    number: 1,
    title: "Client",
    description: "Identifier le prospect ou l’organisation et son historique.",
    stage: "CLIENT_IDENTIFIED",
  },
  {
    number: 2,
    title: "Solution",
    description:
      "Choisir les familles commerciales et le packaging applicable.",
    stage: "SOLUTION_CONFIGURED",
  },
  {
    number: 3,
    title: "Configuration et prix",
    description: "Configurer, comparer puis calculer officiellement l’offre.",
    stage: "SOLUTION_CONFIGURED",
  },
  {
    number: 4,
    title: "Document commercial",
    description: "Préparer la proposition, sa composition et son document.",
    stage: "DOCUMENT_PREPARED",
  },
  {
    number: 5,
    title: "Vérification et finalisation",
    description:
      "Effectuer la revue interne et émettre selon le lifecycle existant.",
    stage: "INTERNAL_REVIEW",
  },
] as const;

export default function FounderJourneyPage() {
  const router = useRouter();
  const [targetType, setTargetType] = useState<TargetType>(() => {
    if (typeof window === "undefined") return "PROSPECT";
    return new URLSearchParams(window.location.search).get("targetType") ===
      "ORGANIZATION"
      ? "ORGANIZATION"
      : "PROSPECT";
  });
  const [requestedTargetId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("targetId") ?? ""),
  );
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Target>();
  const [dossier, setDossier] = useState<Dossier>();
  const [dossierState, setDossierState] = useState<
    "IDLE" | "LOADING" | "READY" | "ERROR" | "UNAUTHORIZED"
  >("IDLE");
  const [dossierReloadKey, setDossierReloadKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<
    "LOADING" | "READY" | "EMPTY" | "ERROR" | "UNAUTHORIZED"
  >("LOADING");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const resource =
        targetType === "PROSPECT" ? "prospects" : "organizations";
      void loadAllTargets<Target>(({ page, pageSize }) =>
        api
          .get(
            `/admin/v1/commercial/simulator/configurator/targets/${resource}`,
            {
              params: {
                search: query || undefined,
                page,
                pageSize,
              },
            },
          )
          .then((response) => response.data),
      )
        .then((items) => {
          if (!active) return;
          setTargets(items);
          setState(items.length ? "READY" : "EMPTY");
        })
        .catch((error: unknown) => {
          if (!active) return;
          const status = (error as { response?: { status?: number } }).response
            ?.status;
          setState(status === 401 || status === 403 ? "UNAUTHORIZED" : "ERROR");
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, reloadKey, targetType]);

  useEffect(() => {
    if (!requestedTargetId || selected) return;
    const requested = targets.find((target) => target.id === requestedTargetId);
    if (!requested) return;
    // The URL restores the selected commercial context after a browser reload.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDossierState("LOADING");
    setSelected(requested);
  }, [requestedTargetId, selected, targets]);

  useEffect(() => {
    if (!selected) return;
    void api
      .get(`/admin/v1/commercial/dossiers/${selected.type}/${selected.id}`)
      .then((response) => {
        setDossier(response.data);
        setDossierState("READY");
      })
      .catch((error: unknown) => {
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        setDossierState(
          status === 401 || status === 403 ? "UNAUTHORIZED" : "ERROR",
        );
      });
  }, [dossierReloadKey, selected]);

  const completed = useMemo(
    () =>
      new Set(
        dossier?.progress
          .filter((item) => item.complete)
          .map((item) => item.code),
      ),
    [dossier],
  );
  const newOfferUrl = selected
    ? `/admin/commercial/configurator?targetType=${selected.type}&targetId=${selected.id}`
    : "/admin/commercial/configurator";

  return (
    <AppLayout>
      <main className="mx-auto max-w-screen-2xl space-y-8 p-4 sm:p-6 lg:p-8">
        <header className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Parcours commercial Founder
          </p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Préparer une offre
              </h1>
              <p className="mt-3 max-w-3xl text-slate-300">
                Sélectionnez le client, reprenez son dossier et avancez selon
                les preuves commerciales existantes.
              </p>
            </div>
            <Link
              href="/admin/commercial/prospects"
              className="rounded-xl bg-white px-5 py-3 text-center font-semibold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Créer volontairement un prospect
            </Link>
          </div>
        </header>

        <section
          aria-labelledby="client-step"
          className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.5fr)]"
        >
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 id="client-step" className="text-xl font-semibold">
              1. Choisir le client
            </h2>
            <div
              className="mt-4 flex rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Type de client"
            >
              {(["PROSPECT", "ORGANIZATION"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={targetType === type}
                  onClick={() => {
                    setTargetType(type);
                    setDossier(undefined);
                    setDossierState("IDLE");
                    setSelected(undefined);
                    router.replace("/admin/commercial/journey");
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${targetType === type ? "bg-white shadow" : ""}`}
                >
                  {type === "PROSPECT" ? "Prospects" : "Organisations"}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium">
              Rechercher
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                placeholder="Nom ou référence"
              />
            </label>
            <TargetState
              state={state}
              retry={() => setReloadKey((value) => value + 1)}
            />
            <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {targets.map((target) => (
                <li key={target.id}>
                  <button
                    type="button"
                    disabled={!target.selectable}
                    onClick={() => {
                      setDossier(undefined);
                      setDossierState("LOADING");
                      setSelected(target);
                      router.replace(
                        `/admin/commercial/journey?targetType=${target.type}&targetId=${target.id}`,
                      );
                    }}
                    className={`w-full rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${selected?.id === target.id ? "border-emerald-600 bg-emerald-50" : "bg-white"}`}
                  >
                    <strong>{target.displayName}</strong>
                    <span className="block text-sm text-slate-500">
                      {target.secondaryLabel ?? target.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div aria-live="polite" className="min-w-0 space-y-6">
            {!selected && (
              <div className="rounded-2xl border border-dashed bg-slate-50 p-10 text-center text-slate-600">
                Choisissez un prospect ou une organisation pour afficher son
                parcours.
              </div>
            )}
            {selected && dossierState === "LOADING" && (
              <p role="status">Chargement du dossier commercial…</p>
            )}
            {selected && dossierState === "UNAUTHORIZED" && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                Accès au dossier refusé.
              </p>
            )}
            {selected && dossierState === "ERROR" && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                Impossible de charger le dossier.{" "}
                <button
                  className="underline"
                  onClick={() => setDossierReloadKey((value) => value + 1)}
                >
                  Réessayer
                </button>
              </p>
            )}
            {selected && dossier && (
              <>
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase text-emerald-700">
                    Client sélectionné
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {dossier.target.name}
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
                      href={`/admin/commercial/dossier/${selected.type}/${selected.id}`}
                    >
                      Ouvrir le dossier commercial
                    </Link>
                    <Link
                      className="rounded-xl border px-5 py-3 font-semibold"
                      href={newOfferUrl}
                    >
                      Créer une nouvelle offre
                    </Link>
                  </div>
                  {dossier.workspaces.length > 0 && (
                    <div className="mt-6 border-t pt-5">
                      <h3 className="font-semibold">
                        Reprendre une offre existante
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dossier.workspaces.map((workspace) => (
                          <Link
                            key={workspace.id}
                            href={workspace.resumeUrl}
                            className="rounded-lg border px-4 py-2 text-sm underline"
                          >
                            {workspace.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <nav
                  aria-label="Progression de l’offre"
                  className="grid gap-3 md:grid-cols-5"
                >
                  {steps.map((step) => {
                    const done = completed.has(step.stage);
                    return (
                      <div
                        key={step.number}
                        className={`rounded-2xl border p-4 ${done ? "border-emerald-300 bg-emerald-50" : "bg-white"}`}
                      >
                        <span className="text-xs font-semibold uppercase">
                          Étape {step.number}
                        </span>
                        <h3 className="mt-1 font-semibold">{step.title}</h3>
                        <p className="mt-2 text-xs text-slate-600">
                          {step.description}
                        </p>
                        <p className="mt-3 text-xs font-medium">
                          {done ? "Terminée selon les preuves" : "À poursuivre"}
                        </p>
                      </div>
                    );
                  })}
                </nav>

                {(dossier.nextActions.length > 0 ||
                  dossier.blockers.length > 0) && (
                  <section className="rounded-2xl border-l-4 border-l-amber-500 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Prochaine action</h2>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {dossier.nextActions.map((action) =>
                        action.href ? (
                          <Link
                            key={action.code}
                            href={action.href}
                            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
                          >
                            {action.label}
                          </Link>
                        ) : (
                          <span
                            key={action.code}
                            className="rounded-xl border px-4 py-3"
                          >
                            {action.label}
                          </span>
                        ),
                      )}
                    </div>
                    {dossier.blockers.length > 0 && (
                      <ul className="mt-4 space-y-1 text-sm text-amber-900">
                        {dossier.blockers.map((blocker) => (
                          <li key={blocker.code}>• {blocker.label}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

function TargetState({ state, retry }: { state: string; retry: () => void }) {
  if (state === "LOADING")
    return (
      <p role="status" className="mt-4 text-sm">
        Chargement…
      </p>
    );
  if (state === "EMPTY") return <p className="mt-4 text-sm">Aucun résultat.</p>;
  if (state === "UNAUTHORIZED")
    return (
      <p role="alert" className="mt-4 text-sm text-red-700">
        Accès réservé aux administrateurs de plateforme.
      </p>
    );
  if (state === "ERROR")
    return (
      <p role="alert" className="mt-4 text-sm text-red-700">
        Recherche indisponible.{" "}
        <button className="underline" onClick={retry}>
          Réessayer
        </button>
      </p>
    );
  return null;
}
