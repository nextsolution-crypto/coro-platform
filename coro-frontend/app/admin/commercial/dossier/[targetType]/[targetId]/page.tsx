"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Money = {
  oneTimeMinor: string | null;
  annualRecurringMinor: string | null;
  firstYearMinor: string | null;
};
type Dossier = {
  observationOnly: true;
  target: {
    type: "PROSPECT" | "ORGANIZATION";
    id: string;
    name: string;
    status?: string;
  };
  workspaces: Array<{
    id: string;
    reference: string;
    title: string;
    status: string;
    updatedAt: string;
    scenarioCount: number;
    scenariosTruncated: boolean;
    retainedScenarioId: string | null;
    resumeUrl: string;
    scenarios: Array<{
      id: string;
      name: string;
      retained: boolean;
      familyCodes: string[];
      currentOfficialRun: null | {
        current: boolean;
        priceStatus: string;
        calculatedAt: string;
        totals: Money | null;
      };
    }>;
  }>;
  proposals: Array<{
    id: string;
    reference: string;
    title: string;
    status: string;
    source: "CONFIGURATOR" | "DIRECT";
    detailUrl: string;
    latestRevision: null | {
      revisionNumber: number;
      status: string;
      validUntil: string | null;
      documentReadiness: "NO_COMPOSITION" | "INTERNAL_DRAFT" | "ISSUANCE_READY";
      documentsTruncated: boolean;
      documents: Array<{
        id: string;
        fileName: string;
        status: string;
        documentKind: string;
        downloadUrl: string | null;
      }>;
      relatedContract: null | {
        contract: {
          id: string;
          reference: string;
          title: string;
          status: string;
        };
      };
    };
  }>;
  contracts: Array<{
    id: string;
    reference: string;
    title: string;
    status: string;
    revisions: Array<{ revisionNumber: number; status: string }>;
  }>;
  entitlementSummary: {
    present: boolean;
    count: number;
    inferred: false;
    items: Array<{
      id: string;
      capabilityCode: string;
      capabilityLabel: string;
      latestRevision: null | { lifecycle: string; enabled: boolean };
    }>;
  };
  progress: Array<{ code: string; complete: boolean }>;
  blockers: Array<{ code: string; label: string }>;
  nextActions: Array<{ code: string; label: string; href: string | null }>;
  truncation: Record<
    "workspaces" | "proposals" | "contracts" | "entitlements",
    boolean
  >;
};

const money = (minor: string | null) =>
  minor == null
    ? "—"
    : new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(minor) / 100);

const stageLabels: Record<string, string> = {
  CLIENT_IDENTIFIED: "Client identifié",
  SOLUTION_CONFIGURED: "Solution configurée",
  PROPOSAL_CREATED: "Proposition créée",
  DOCUMENT_PREPARED: "Document préparé",
  INTERNAL_REVIEW: "Revue interne et émission",
  CONTRACT_ACCEPTED: "Contrat accepté",
  ACTIVATION: "Activation",
};
const readinessLabels: Record<string, string> = {
  NO_COMPOSITION: "Aucune composition",
  INTERNAL_DRAFT: "Composition interne à compléter",
  ISSUANCE_READY: "Composition prête pour émission",
};

export default function CommercialDossierPage({
  params,
}: {
  params: Promise<{ targetType: string; targetId: string }>;
}) {
  const { targetType, targetId } = use(params);
  const [dossier, setDossier] = useState<Dossier>();
  const [downloadError, setDownloadError] = useState("");
  const [state, setState] = useState<
    "LOADING" | "READY" | "ERROR" | "UNAUTHORIZED"
  >("LOADING");
  const load = useCallback(async () => {
    try {
      const response = await api.get(
        `/admin/v1/commercial/dossiers/${targetType}/${targetId}`,
      );
      setDossier(response.data);
      setState("READY");
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      setState(status === 401 || status === 403 ? "UNAUTHORIZED" : "ERROR");
    }
  }, [targetId, targetType]);
  useEffect(() => {
    let active = true;
    void api
      .get(`/admin/v1/commercial/dossiers/${targetType}/${targetId}`)
      .then((response) => {
        if (!active) return;
        setDossier(response.data);
        setState("READY");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        setState(status === 401 || status === 403 ? "UNAUTHORIZED" : "ERROR");
      });
    return () => {
      active = false;
    };
  }, [targetId, targetType]);

  async function downloadDocument(document: {
    fileName: string;
    downloadUrl: string | null;
  }) {
    if (!document.downloadUrl) return;
    setDownloadError("");
    try {
      const response = await api.get(document.downloadUrl, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Impossible de télécharger le document privé.");
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        {state === "LOADING" && (
          <p role="status">Chargement du dossier commercial…</p>
        )}
        {state === "UNAUTHORIZED" && (
          <p role="alert">Accès réservé aux administrateurs de plateforme.</p>
        )}
        {state === "ERROR" && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-4"
          >
            Impossible de charger le dossier commercial.
            <button
              className="ml-3 underline"
              onClick={() => {
                setState("LOADING");
                void load();
              }}
            >
              Réessayer
            </button>
          </div>
        )}
        {state === "READY" && dossier && (
          <>
            <header className="rounded-xl border bg-white p-6">
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Dossier commercial ·{" "}
                {dossier.target.type === "PROSPECT"
                  ? "Prospect"
                  : "Organisation"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold">
                {dossier.target.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Vue consolidée en lecture seule des autorités commerciales
                existantes.
              </p>
            </header>

            {Object.values(dossier.truncation).some(Boolean) && (
              <p
                role="status"
                className="rounded border border-amber-200 bg-amber-50 p-4 text-sm"
              >
                Le dossier contient plus de 100 éléments dans au moins une
                section. Consultez les surfaces détaillées pour l’historique
                complet.
              </p>
            )}

            <section className="rounded-xl border bg-white p-5">
              <h2 className="text-xl font-semibold">Progression</h2>
              <ol className="mt-4 grid gap-2 md:grid-cols-4">
                {dossier.progress.map((stage) => (
                  <li
                    key={stage.code}
                    className={`rounded border p-3 text-sm ${stage.complete ? "border-emerald-300 bg-emerald-50" : "bg-slate-50"}`}
                  >
                    {stage.complete ? "✓ " : "○ "}
                    {stageLabels[stage.code] ?? stage.code}
                  </li>
                ))}
              </ol>
              {dossier.nextActions.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <strong>Prochaine action :</strong>
                  {dossier.nextActions.map((action, index) =>
                    action.href ? (
                      <Link
                        key={action.code}
                        href={action.href}
                        className={
                          index === 0
                            ? "rounded bg-emerald-700 px-4 py-2 text-white"
                            : "underline"
                        }
                      >
                        {action.label}
                      </Link>
                    ) : (
                      <span
                        key={action.code}
                        className={
                          index === 0
                            ? "rounded bg-slate-900 px-4 py-2 text-white"
                            : "rounded border px-3 py-2"
                        }
                      >
                        {action.label}
                      </span>
                    ),
                  )}
                </div>
              )}
              {dossier.blockers.length > 0 && (
                <ul className="mt-4 space-y-1 rounded border border-amber-200 bg-amber-50 p-4 text-sm">
                  {dossier.blockers.map((blocker) => (
                    <li key={blocker.code}>• {blocker.label}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">
                Configurations commerciales
              </h2>
              {!dossier.workspaces.length && (
                <Empty>Aucune configuration existante.</Empty>
              )}
              {dossier.workspaces.map((workspace) => (
                <article
                  key={workspace.id}
                  className="rounded-xl border bg-white p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{workspace.title}</h3>
                      <p className="text-sm text-slate-500">
                        {workspace.reference} · {workspace.scenarioCount}{" "}
                        scénario(s) · Mis à jour le{" "}
                        {new Date(workspace.updatedAt).toLocaleDateString(
                          "fr-CA",
                        )}
                      </p>
                    </div>
                    <Link href={workspace.resumeUrl} className="underline">
                      Reprendre cette configuration
                    </Link>
                  </div>
                  <ul className="mt-4 grid gap-2 md:grid-cols-2">
                    {workspace.scenarios.map((scenario) => (
                      <li
                        key={scenario.id}
                        className="rounded border p-3 text-sm"
                      >
                        <strong>{scenario.name}</strong>
                        {scenario.retained && " · Retenu"}
                        <div className="text-slate-500">
                          {scenario.familyCodes.join(", ") ||
                            "Famille non résolue"}
                        </div>
                        <div>
                          {scenario.currentOfficialRun
                            ? scenario.currentOfficialRun.current
                              ? "Calcul officiel courant"
                              : "Calcul à actualiser"
                            : "Aucun calcul officiel"}
                        </div>
                        {scenario.currentOfficialRun?.totals && (
                          <div>
                            Première année :{" "}
                            {money(
                              scenario.currentOfficialRun.totals.firstYearMinor,
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {workspace.scenariosTruncated && (
                    <p className="mt-3 text-sm text-amber-700">
                      Plus de 100 scénarios : liste partielle.
                    </p>
                  )}
                </article>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">
                Propositions et documents
              </h2>
              {downloadError && (
                <p role="alert" className="text-sm text-red-700">
                  {downloadError}
                </p>
              )}
              {!dossier.proposals.length && (
                <Empty>Aucune proposition existante.</Empty>
              )}
              {dossier.proposals.map((proposal) => (
                <article
                  key={proposal.id}
                  className="rounded-xl border bg-white p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {proposal.reference} · {proposal.title}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {proposal.source === "DIRECT"
                          ? "Création directe/historique"
                          : "Issue du Configurateur"}
                      </p>
                    </div>
                    <Link href={proposal.detailUrl} className="underline">
                      Ouvrir la proposition
                    </Link>
                  </div>
                  {proposal.latestRevision ? (
                    <div className="mt-3 text-sm">
                      <p>
                        Révision v{proposal.latestRevision.revisionNumber} ·{" "}
                        {proposal.latestRevision.status}
                      </p>
                      <p>
                        Document :{" "}
                        {
                          readinessLabels[
                            proposal.latestRevision.documentReadiness
                          ]
                        }
                      </p>
                      <ul className="mt-2 space-y-1">
                        {proposal.latestRevision.documents.map((document) => (
                          <li key={document.id}>
                            {document.documentKind} · {document.status}
                            {document.downloadUrl && (
                              <>
                                {" "}
                                ·{" "}
                                <button
                                  type="button"
                                  className="underline"
                                  onClick={() =>
                                    void downloadDocument(document)
                                  }
                                >
                                  Télécharger
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                      {proposal.latestRevision.documentsTruncated && (
                        <p className="mt-2 text-amber-700">
                          Plus de 50 documents : liste partielle.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-700">
                      Aucune révision disponible.
                    </p>
                  )}
                </article>
              ))}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border bg-white p-5">
                <h2 className="text-xl font-semibold">Contrats</h2>
                {!dossier.contracts.length ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Aucun contrat relié.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {dossier.contracts.map((contract) => (
                      <li key={contract.id} className="rounded border p-3">
                        {contract.reference} · {contract.title}
                        <div className="text-sm text-slate-500">
                          {contract.status} · v
                          {contract.revisions[0]?.revisionNumber ?? "—"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-xl border bg-white p-5">
                <h2 className="text-xl font-semibold">Activations</h2>
                <p className="mt-2 text-sm">
                  {dossier.entitlementSummary.present
                    ? `${dossier.entitlementSummary.count} droit(s) explicite(s)`
                    : "Aucun droit explicite configuré."}
                </p>
                <p className="text-xs text-slate-500">
                  Aucun droit n’est inféré depuis une proposition ou un contrat.
                </p>
              </section>
            </div>

            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer font-semibold">
                Détails techniques avancés
              </summary>
              <p className="mt-3 text-sm text-slate-500">
                Type de cible : {dossier.target.type} · Observation seulement :
                oui · Autorité économique inchangée.
              </p>
            </details>
          </>
        )}
      </main>
    </AppLayout>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border bg-white p-5 text-sm text-slate-500">
      {children}
    </p>
  );
}
