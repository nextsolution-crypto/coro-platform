"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  financialCurrencyLabel,
  formatFinancialAmount,
} from "./financial-money";

type Total = {
  currency: string;
  soldAmount: string;
  knownLaborCost: string;
  contributionMargin: string;
  completeMandates: number;
  incompleteMandates: number;
  uniqueLossMakingMandates: number;
};

type FinancialResponse = {
  totals: Total[];
  mandates: Array<{
    mandateId: string;
    projectId: string;
    projectName: string;
    clientName: string;
    soldAmount: string | null;
    soldCurrency: string | null;
    knownLaborCost: string;
    contributionMargin: string | null;
    contributionMarginPercent: string | null;
    completeness: string;
    incompleteReasons: string[];
  }>;
};

export default function RendementPage() {
  const router = useRouter();
  const { user, isInitialized, initAuth } = useAuthStore();
  const [data, setData] = useState<FinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace("/profile/rendement");
      return;
    }
    let active = true;
    api
      .get<FinancialResponse>("/rendement/financial", {
        params: { view: "cumulative" },
      })
      .then((response) => {
        if (active) {
          setData(response.data);
          setError("");
        }
      })
      .catch(
        () =>
          active &&
          setError("Les indicateurs financiers ne peuvent pas être chargés."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isInitialized, router, user]);

  const summary = useMemo(
    () => ({
      incomplete:
        data?.totals.reduce(
          (sum, total) => sum + total.incompleteMandates,
          0,
        ) ?? 0,
      lossMaking:
        data?.totals.reduce(
          (sum, total) => sum + total.uniqueLossMakingMandates,
          0,
        ) ?? 0,
    }),
    [data],
  );

  return (
    <AppLayout>
      <header className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
          Direction
        </p>
        <h1 className="text-2xl font-black text-slate-800">
          Rendement et rentabilité
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Vue cumulative gouvernée. Les coûts couvrent uniquement la
          main-d’œuvre connue; un mandat incomplet ne produit pas de marge
          présentée comme certaine.
        </p>
      </header>

      {loading && <p role="status">Chargement des indicateurs…</p>}
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-red-800"
        >
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <section
            aria-label="Synthèse financière"
            className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {data.totals.map((total) => (
              <article
                key={total.currency}
                className="rounded-md border border-slate-200 bg-white p-5"
              >
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {financialCurrencyLabel(total.currency)}
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Montant vendu validé</dt>
                    <dd className="text-xl font-bold">
                      {formatFinancialAmount(total.soldAmount, total.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">
                      Coût de main-d’œuvre connu
                    </dt>
                    <dd>
                      {formatFinancialAmount(
                        total.knownLaborCost,
                        total.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">
                      Marge des mandats complets
                    </dt>
                    <dd>
                      {formatFinancialAmount(
                        total.contributionMargin,
                        total.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
            <article className="rounded-md border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Mandats déficitaires uniques
              </p>
              <p className="text-2xl font-black text-red-700">
                {summary.lossMaking}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Mandats incomplets</p>
              <p className="text-2xl font-black text-amber-700">
                {summary.incomplete}
              </p>
            </article>
          </section>

          <section
            aria-labelledby="mandates-heading"
            className="overflow-hidden rounded-md border border-slate-200 bg-white"
          >
            <h2
              id="mandates-heading"
              className="border-b border-slate-200 px-5 py-4 font-bold"
            >
              Rentabilité cumulative par mandat
            </h2>
            {data.mandates.length === 0 ? (
              <p className="p-8 text-center text-slate-500">
                Aucun mandat financier dans ce périmètre.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Client / mandat</th>
                      <th className="p-3">Vendu</th>
                      <th className="p-3">Coût connu</th>
                      <th className="p-3">Marge</th>
                      <th className="p-3">Complétude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.mandates.map((mandate) => (
                      <tr
                        key={mandate.mandateId}
                        className="border-t border-slate-100"
                      >
                        <td className="p-3">
                          <button
                            className="text-left font-semibold text-red-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2"
                            onClick={() =>
                              router.push(
                                `/projects/${mandate.projectId}/mandate`,
                              )
                            }
                          >
                            {mandate.clientName}
                            <span className="block font-normal text-slate-600">
                              {mandate.projectName}
                            </span>
                          </button>
                        </td>
                        <td className="p-3">
                          {formatFinancialAmount(
                            mandate.soldAmount,
                            mandate.soldCurrency,
                          )}
                        </td>
                        <td className="p-3">
                          {formatFinancialAmount(
                            mandate.knownLaborCost,
                            mandate.soldCurrency,
                          )}
                        </td>
                        <td className="p-3">
                          {formatFinancialAmount(
                            mandate.contributionMargin,
                            mandate.soldCurrency,
                          )}
                          {mandate.contributionMarginPercent && (
                            <span className="block text-xs text-slate-500">
                              {mandate.contributionMarginPercent} %
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              mandate.completeness === "COMPLETE"
                                ? "text-green-700"
                                : "text-amber-700"
                            }
                          >
                            {mandate.completeness === "COMPLETE"
                              ? "Complet"
                              : "Incomplet"}
                          </span>
                          {mandate.incompleteReasons.length > 0 && (
                            <span className="block max-w-xs text-xs text-slate-500">
                              {mandate.incompleteReasons.join(", ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
