"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Approval = {
  status: string;
  current: boolean;
  approvedByDisplayName: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
};
type Analysis = {
  definition: { code: string; version: string; fingerprint: string };
  status: string;
  changes: number;
  missingCount: number;
  configurationFingerprint: string;
  blockers: Array<{ kind: string; code: string; status: string }>;
  items: Array<{ kind: string; code: string; status: string; action: string }>;
  target: {
    priceBookVersionNumber: number | null;
    priceBookVersionStatus: string | null;
    costAssumptionVersionStatus: string | null;
  };
  approval: Approval | null;
};
type InternalValue = {
  code: string;
  scope: string;
  moneyMinor: string | null;
  decimal: string | null;
  unit: string | null;
};
type Review = {
  title: string;
  subscription: Array<{ from: string; through: string; amountMinor: string }>;
  implementation: Array<{ labelFr: string; amountMinor: string }>;
  professionalServices: Array<{ labelFr: string; amountMinor: string }>;
  internal: { warning: string; methodology: string; values: InternalValue[] };
  policies: Record<string, boolean>;
};

const cad = (minor: string) =>
  `${new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 }).format(Number(minor) / 100)} $ CA`;
const dateTime = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("fr-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const statusLabels: Record<string, string> = {
  NOT_INSTALLED: "Non installée",
  PARTIALLY_CONFIGURED: "Configuration incomplète",
  READY_FOR_REVIEW: "Prête à vérifier",
  APPROVED: "Approuvée",
  PUBLISHED: "Publiée",
  CONFLICT: "Conflit à résoudre",
  MATCH: "Conforme",
  MISSING: "À créer",
  EXTRA_RELEVANT: "Élément inattendu",
  REUSE: "Conserver",
  CREATE: "Créer",
  CREATE_DRAFT: "Créer le brouillon",
  BLOCK: "Bloquer",
};
const itemLabels: Record<string, string> = {
  CORO_PROFESSIONAL_DIRECT_CAD: "Catalogue CORO Professional — Client direct",
  v1: "Version tarifaire 1",
  CORO_PROFESSIONAL_ANNUAL: "Abonnement CORO Professional",
  CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD: "Implantation Standard",
  CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED: "Implantation avancée",
  DOCUMENT_COMPLIANCE_DELIVERY_HOUR: "Service professionnel Delivery",
  DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR: "Service Senior / technique",
  CORO_PROFESSIONAL_DIRECT_COST: "Hypothèses de coûts CORO Professional",
  "direct-cost/v2": "Méthode de coûts directs",
};

export default function CommercialConfigurationPage() {
  const definition = "professional-direct";
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const analyze = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await api.get(
        `/admin/v1/commercial/configurations/${definition}/analyze`,
      );
      setAnalysis(data);
      setMessage("Analyse actualisée.");
      if (!data.missingCount && !data.blockers.length) {
        const response = await api.get(
          `/admin/v1/commercial/configurations/${definition}/review`,
        );
        setReview(response.data);
      } else setReview(null);
    } catch (error) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Analyse impossible.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void analyze();
  }, [analyze]);
  const mutate = async (
    path: string,
    body: Record<string, string>,
    success: string,
  ) => {
    setBusy(true);
    try {
      await api.post(
        `/admin/v1/commercial/configurations/${definition}/${path}`,
        body,
      );
      setMessage(success);
      await analyze();
    } catch (error) {
      setMessage(
        JSON.stringify(
          (error as { response?: { data?: unknown } }).response?.data ??
            "Opération refusée.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const published = analysis?.status === "PUBLISHED";
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <p className="text-sm font-medium text-amber-700">
            Super Admin · Administration commerciale
          </p>
          <h1 className="text-3xl font-semibold">Configuration tarifaire</h1>
          <p className="text-slate-600">
            Analyser → Préparer le brouillon → Vérifier → Approuver → Publier.
            Aucune étape automatique.
          </p>
        </header>
        {message && (
          <p role="status" className="rounded border bg-white p-3">
            {message}
          </p>
        )}
        <section className="rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                CORO Professional — DIRECT — CAD
              </h2>
              <p className="text-sm text-slate-500">
                {analysis
                  ? (statusLabels[analysis.status] ?? analysis.status)
                  : "Chargement"}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => void analyze()}
              className="rounded border px-4 py-2"
            >
              Analyser
            </button>
          </div>
          {analysis && (
            <>
              {published ? (
                <PublishedSummary analysis={analysis} />
              ) : (
                <DraftSummary analysis={analysis} />
              )}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Élément</th>
                      <th>État</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.items.map((item, index) => (
                      <tr
                        key={`${item.kind}-${item.code}-${index}`}
                        className="border-t"
                      >
                        <td className="py-2">
                          <span className="font-medium">
                            {itemLabels[item.code] ??
                              item.code.replaceAll("_", " ")}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {item.code}
                          </span>
                        </td>
                        <td className="text-center">
                          {statusLabels[item.status] ?? item.status}
                        </td>
                        <td className="text-center">
                          {statusLabels[item.action] ?? item.action}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={
                    busy ||
                    published ||
                    analysis.blockers.length > 0 ||
                    analysis.changes === 0
                  }
                  onClick={() =>
                    confirm(
                      "Préparer uniquement les éléments manquants dans le brouillon?",
                    ) && void mutate("apply", {}, "Brouillon préparé.")
                  }
                  className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
                >
                  Préparer le brouillon
                </button>
                <button
                  disabled={
                    busy || published || analysis.status !== "READY_FOR_REVIEW"
                  }
                  onClick={() =>
                    confirm(
                      "Confirmer la revue exacte et approuver cette empreinte?",
                    ) &&
                    void mutate(
                      "approve",
                      {
                        reason:
                          "Founder reviewed governed Professional DIRECT v1 configuration",
                      },
                      "Configuration approuvée.",
                    )
                  }
                  className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-40"
                >
                  Approuver
                </button>
                <button
                  disabled={
                    busy ||
                    published ||
                    analysis.status !== "APPROVED" ||
                    !analysis.approval?.current
                  }
                  onClick={() =>
                    confirm(
                      "Publier les coûts puis le catalogue tarifaire? Cette opération crée des autorités immuables.",
                    ) &&
                    void mutate(
                      "publish",
                      {
                        reason:
                          "Founder approved governed Professional DIRECT v1 publication",
                        effectiveFrom: new Date().toISOString(),
                      },
                      "Configuration publiée.",
                    )
                  }
                  className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-40"
                >
                  Publier
                </button>
              </div>
            </>
          )}
        </section>
        {review && <FounderReview review={review} analysis={analysis!} />}
      </main>
    </AppLayout>
  );
}

function DraftSummary({ analysis }: { analysis: Analysis }) {
  const approval = analysis.approval;
  const approvalLabel = approval?.current
    ? "Actuelle"
    : approval?.approvedAt
      ? "À renouveler"
      : "Absente";
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Metric label="Changements" value={String(analysis.changes)} />
      <Metric label="Conflits" value={String(analysis.blockers.length)} />
      <Metric label="Approbation du brouillon" value={approvalLabel} />
    </div>
  );
}

function PublishedSummary({ analysis }: { analysis: Analysis }) {
  return (
    <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Statut" value="Publiée" />
        <Metric label="Configuration" value="Conforme" />
        <Metric
          label="Catalogue tarifaire"
          value={`v${analysis.target.priceBookVersionNumber ?? "—"} · ${analysis.target.priceBookVersionStatus ?? "—"}`}
        />
        <Metric
          label="Hypothèses de coûts"
          value={
            analysis.target.costAssumptionVersionStatus === "PUBLISHED"
              ? "Publiées"
              : (analysis.target.costAssumptionVersionStatus ?? "—")
          }
        />
        <Metric
          label="Approuvée par"
          value={analysis.approval?.approvedByDisplayName ?? "—"}
        />
        <Metric
          label="Approuvée le"
          value={dateTime(analysis.approval?.approvedAt)}
        />
        <Metric
          label="Publiée le"
          value={dateTime(analysis.approval?.publishedAt)}
        />
        <Metric
          label="Définition"
          value={`${analysis.definition.code}/${analysis.definition.version}`}
        />
      </div>
    </div>
  );
}

function FounderReview({
  review,
  analysis,
}: {
  review: Review;
  analysis: Analysis;
}) {
  const value = (scope: string, code: string) =>
    review.internal.values.find(
      (entry) => entry.scope === scope && entry.code === code,
    );
  const deliveryCost =
    value("ROLE:DELIVERY_PROFESSIONAL", "LOADED_DIRECT_DELIVERY_COST")
      ?.moneyMinor ?? "0";
  const seniorCost =
    value("ROLE:SENIOR_REVIEWER", "LOADED_DIRECT_DELIVERY_COST")?.moneyMinor ??
    "0";
  const standardHours =
    value(
      "COMPONENT:CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD",
      "STANDARD_DELIVERY_EFFORT",
    )?.decimal ?? "0";
  const advancedHours =
    value(
      "COMPONENT:CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED",
      "STANDARD_DELIVERY_EFFORT",
    )?.decimal ?? "0";
  const advancedSenior =
    value(
      "COMPONENT:CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED",
      "STANDARD_SENIOR_REVIEW_EFFORT",
    )?.decimal ?? "0";
  const checks = [
    [!review.policies.valueAnalysis, "Analyse de valeur désactivée"],
    [!review.policies.partner, "Aucun tarif Partner"],
    [!review.policies.sentinelle, "Sentinelle non incluse"],
    [!review.policies.population, "Sentinelle Population non incluse"],
    [!review.policies.incidentOps, "Incident / Ops non inclus"],
    [
      !review.policies.standardAbove200,
      "Aucun tarif standard au-delà de 200 sites",
    ],
    [
      review.policies.exactlyOneImplementation,
      "Une seule option d’implantation requise",
    ],
  ] as const;
  return (
    <section className="space-y-6 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">Vérification commerciale</h2>
      <section>
        <h3 className="font-semibold">Abonnement CORO Professional</h3>
        <p className="text-sm text-slate-600">
          Client direct · CAD · Tarification annuelle selon la capacité de sites
          actifs.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {review.subscription.map((band) => (
            <div
              key={band.from}
              className="flex justify-between rounded border px-3 py-2"
            >
              <span>
                {band.from}–{band.through} sites
              </span>
              <strong>{cad(band.amountMinor)} / an</strong>
            </div>
          ))}
          <div className="flex justify-between rounded border px-3 py-2">
            <span>Plus de 200 sites</span>
            <strong>Entreprise / sur devis</strong>
          </div>
        </div>
      </section>
      <section>
        <h3 className="font-semibold">Implantation</h3>
        {review.implementation.map((item) => (
          <p key={item.labelFr}>
            {item.labelFr} : <strong>{cad(item.amountMinor)}</strong>
          </p>
        ))}
        <p className="text-sm text-slate-600">
          Une option d’implantation requise.
        </p>
      </section>
      <section>
        <h3 className="font-semibold">Services professionnels</h3>
        {review.professionalServices.map((item) => (
          <p key={item.labelFr}>
            {item.labelFr.replace("Service professionnel ", "")} :{" "}
            <strong>{cad(item.amountMinor)} / heure</strong>
          </p>
        ))}
      </section>
      <section className="rounded border border-amber-300 bg-amber-50 p-4">
        <h3 className="font-semibold">INTERNE — NON VISIBLE PAR LE CLIENT</h3>
        <p>
          Coût chargé Delivery : <strong>{cad(deliveryCost)} / heure</strong>
        </p>
        <p>
          Coût chargé Senior / technique :{" "}
          <strong>{cad(seniorCost)} / heure</strong>
        </p>
        <div className="mt-3">
          <p>Implantation Standard : {standardHours} h Delivery</p>
          <p>
            Coût direct modélisé :{" "}
            <strong>
              {cad(String(Number(deliveryCost) * Number(standardHours)))}
            </strong>
          </p>
        </div>
        <div className="mt-3">
          <p>
            Implantation avancée : {advancedHours} h Delivery · {advancedSenior}{" "}
            h Senior / technique
          </p>
          <p>
            Coût direct modélisé :{" "}
            <strong>
              {cad(
                String(
                  Number(deliveryCost) * Number(advancedHours) +
                    Number(seniorCost) * Number(advancedSenior),
                ),
              )}
            </strong>
          </p>
        </div>
        <div className="mt-3">
          <p>Coût récurrent SaaS CORO Professional</p>
          <strong>Non configuré</strong>
        </div>
      </section>
      <section>
        <h3 className="font-semibold">Contrôles de politique</h3>
        <ul className="mt-2 space-y-1">
          {checks.map(([valid, label]) => (
            <li
              key={label}
              className={valid ? "text-emerald-800" : "text-red-700"}
            >
              {valid ? "✓" : "✕"} {label}
            </li>
          ))}
        </ul>
      </section>
      <details className="rounded border p-4">
        <summary className="cursor-pointer font-semibold">
          Détails techniques
        </summary>
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          <p>
            Définition : {analysis.definition.code}/
            {analysis.definition.version}
          </p>
          <p>Catalogue : CORO_PROFESSIONAL_DIRECT_CAD</p>
          <p>Méthode de coûts : {review.internal.methodology}</p>
          <p>Empreinte de définition : {analysis.definition.fingerprint}</p>
          <p>
            Empreinte de configuration : {analysis.configurationFingerprint}
          </p>
          {analysis.items
            .filter((item) => item.kind === "COMPONENT")
            .map((item) => (
              <p key={item.code}>Composant : {item.code}</p>
            ))}
        </div>
      </details>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-white/70 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
