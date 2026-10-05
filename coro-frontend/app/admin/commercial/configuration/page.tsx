"use client";
import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Analysis = {
  status: string;
  changes: number;
  missingCount: number;
  configurationFingerprint: string;
  blockers: Array<{ kind: string; code: string; status: string }>;
  items: Array<{ kind: string; code: string; status: string; action: string }>;
  approval: null | { current: boolean; approvedAt: string | null };
};
type Review = {
  title: string;
  subscription: Array<{ from: string; through: string; amountMinor: string }>;
  implementation: Array<{ labelFr: string; amountMinor: string }>;
  professionalServices: Array<{ labelFr: string; amountMinor: string }>;
  internal: {
    warning: string;
    methodology: string;
    values: Array<{
      code: string;
      scope: string;
      moneyMinor: string | null;
      decimal: string | null;
      unit: string | null;
    }>;
  };
  policies: Record<string, boolean>;
};
const cad = (minor: string) => {
  const padded = minor.padStart(3, "0");
  const dollars = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const cents = padded.slice(-2);
  return `${dollars}${cents === "00" ? "" : `,${cents}`} $ CA`;
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
        const r = await api.get(
          `/admin/v1/commercial/configurations/${definition}/review`,
        );
        setReview(r.data);
      }
    } catch (e) {
      setMessage(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Analyse impossible.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    // Initial synchronization with the server-owned configuration state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void analyze();
  }, [analyze]);
  const mutate = async (
    path: string,
    body: Record<string, string>,
    ok: string,
  ) => {
    setBusy(true);
    try {
      await api.post(
        `/admin/v1/commercial/configurations/${definition}/${path}`,
        body,
      );
      setMessage(ok);
      await analyze();
    } catch (e) {
      setMessage(
        JSON.stringify(
          (e as { response?: { data?: unknown } }).response?.data ??
            "Opération refusée.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <p className="text-sm font-medium text-amber-700">
            Super Admin · Configuration gouvernée
          </p>
          <h1 className="text-3xl font-semibold">Configuration commerciale</h1>
          <p className="text-slate-600">
            ANALYZE → APPLY TO DRAFT → REVIEW → APPROVE → PUBLISH. Aucune étape
            automatique.
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
                professional-direct/v1 · {analysis?.status ?? "Chargement"}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => void analyze()}
              className="rounded border px-4 py-2"
            >
              Analyser la configuration
            </button>
          </div>
          {analysis && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Changements" value={String(analysis.changes)} />
                <Metric
                  label="Conflits"
                  value={String(analysis.blockers.length)}
                />
                <Metric
                  label="Approbation"
                  value={
                    analysis.approval?.current
                      ? "Actuelle"
                      : "Absente ou périmée"
                  }
                />
              </div>
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
                    {analysis.items.map((i, index) => (
                      <tr
                        key={`${i.kind}-${i.code}-${index}`}
                        className="border-t"
                      >
                        <td className="py-2">
                          {i.kind} · {i.code}
                        </td>
                        <td className="text-center">{i.status}</td>
                        <td className="text-center">{i.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={
                    busy ||
                    analysis.blockers.length > 0 ||
                    analysis.changes === 0
                  }
                  onClick={() =>
                    confirm(
                      "Appliquer uniquement les éléments manquants au DRAFT?",
                    ) &&
                    void mutate(
                      "apply",
                      {},
                      "Configuration appliquée au DRAFT.",
                    )
                  }
                  className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
                >
                  Appliquer la configuration
                </button>
                <button
                  disabled={busy || analysis.status !== "READY_FOR_REVIEW"}
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
                  Approuver la configuration
                </button>
                <button
                  disabled={
                    busy ||
                    analysis.status !== "APPROVED" ||
                    !analysis.approval?.current
                  }
                  onClick={() =>
                    confirm(
                      "Publier Cost puis PriceBook? Cette opération crée des autorités immuables.",
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
        {review && (
          <section className="space-y-5 rounded-xl border bg-white p-5">
            <h2 className="text-xl font-semibold">
              Revue fondatrice — valeurs réellement configurées
            </h2>
            <div>
              <h3 className="font-semibold">Abonnement Professional</h3>
              {review.subscription.map((b) => (
                <p key={b.from}>
                  {b.from}–{b.through} sites : {cad(b.amountMinor)}
                </p>
              ))}
              <p>&gt;200 : Enterprise / custom</p>
            </div>
            <div>
              <h3 className="font-semibold">Implantation</h3>
              {review.implementation.map((i) => (
                <p key={i.labelFr}>
                  {i.labelFr} : {cad(i.amountMinor)}
                </p>
              ))}
              <p>Exactement une requise : OUI</p>
            </div>
            <div>
              <h3 className="font-semibold">Services professionnels</h3>
              {review.professionalServices.map((i) => (
                <p key={i.labelFr}>
                  {i.labelFr} : {cad(i.amountMinor)}/heure
                </p>
              ))}
            </div>
            <div className="rounded border border-amber-300 bg-amber-50 p-4">
              <h3 className="font-semibold">{review.internal.warning}</h3>
              <p>{review.internal.methodology}</p>
              {review.internal.values.map((v) => (
                <p key={`${v.code}-${v.scope}`}>
                  {v.scope} · {v.moneyMinor ? cad(v.moneyMinor) : v.decimal}{" "}
                  {v.unit}
                </p>
              ))}
            </div>
            <div>
              <h3 className="font-semibold">Contrôles de politique</h3>
              <pre className="overflow-auto text-xs">
                {JSON.stringify(review.policies, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </main>
    </AppLayout>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
