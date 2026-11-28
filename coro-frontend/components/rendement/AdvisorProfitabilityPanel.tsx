"use client";

import { Fragment, useState } from "react";
import { formatFinancialAmount } from "@/app/dashboard/rendement/financial-money";

export type AdvisorProfitability = {
  userId: string;
  userName: string;
  currency: string | null;
  hours: number;
  knownLaborCost: string;
  producedValue: string;
  contributionMargin: string | null;
  contributionMarginPercent: string | null;
  valuePerHour: string | null;
  mandateCount: number;
  completeness: "COMPLETE" | "INCOMPLETE";
  incompleteReasons: string[];
  mandates: Array<{
    projectId: string;
    projectName: string;
    clientName: string;
    hours: number;
    knownLaborCost: string;
    producedValue: string | null;
  }>;
};

const REASONS: Record<string, string> = {
  MISSING_VALIDATED_SALE: "vente non validée sur un mandat",
  MISSING_ADVISOR_COST_RATE: "taux interne manquant",
  CUMULATIVE_MARGIN_NOT_AVAILABLE_FOR_WORK_PERIOD: "marge cumulative seulement",
};

const hours = (value: number) =>
  `${value.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;

/**
 * Rentabilité individuelle des conseillers : coût de main-d’œuvre connue,
 * valeur produite au prorata des heures et marge, avec le détail par mandat.
 */
export default function AdvisorProfitabilityPanel({ advisors }: { advisors: AdvisorProfitability[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white" aria-label="Rentabilité par conseiller">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4">
        <h2 className="font-bold text-slate-800">Rentabilité par conseiller</h2>
        <span className="ml-auto text-xs text-slate-500">Cliquez sur un conseiller pour voir ses mandats</span>
        <p className="w-full text-xs text-slate-500">
          Valeur produite = montant vendu validé × heures du conseiller ÷ le plus grand de : heures
          budgétées ou heures saisies sur le mandat (un mandat en cours n’attribue que la part
          réalisée; un dépassement réduit la valeur). Coût = heures × taux interne approuvé.
          Cumulatif, tous mandats.
        </p>
      </header>
      {advisors.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">Aucune heure saisie sur un mandat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Conseiller</th>
                <th className="p-3">Heures sur mandats</th>
                <th className="p-3">Coût connu</th>
                <th className="p-3">Valeur produite</th>
                <th className="p-3">Marge</th>
                <th className="p-3">Valeur / heure</th>
                <th className="p-3">Mandats</th>
                <th className="p-3">Complétude</th>
              </tr>
            </thead>
            <tbody>
              {advisors.map((advisor) => {
                const key = `${advisor.userId}|${advisor.currency ?? ""}`;
                const expanded = open === key;
                const marginValue = advisor.contributionMargin === null ? null : Number(advisor.contributionMargin);
                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                      onClick={() => setOpen(expanded ? null : key)}
                      aria-expanded={expanded}
                    >
                      <td className="p-3 font-semibold text-slate-800">
                        <span className="mr-1 text-slate-400">{expanded ? "▾" : "▸"}</span>
                        {advisor.userName}
                      </td>
                      <td className="p-3">{hours(advisor.hours)}</td>
                      <td className="p-3">{formatFinancialAmount(advisor.knownLaborCost, advisor.currency)}</td>
                      <td className="p-3">{formatFinancialAmount(advisor.producedValue, advisor.currency)}</td>
                      <td className={`p-3 font-semibold ${marginValue !== null && marginValue < 0 ? "text-red-700" : "text-slate-800"}`}>
                        {formatFinancialAmount(advisor.contributionMargin, advisor.currency)}
                        {advisor.contributionMarginPercent && (
                          <span className="block text-xs font-normal text-slate-500">
                            {Number(advisor.contributionMarginPercent).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %
                          </span>
                        )}
                      </td>
                      <td className="p-3">{formatFinancialAmount(advisor.valuePerHour, advisor.currency)}</td>
                      <td className="p-3">{advisor.mandateCount}</td>
                      <td className="p-3">
                        {advisor.completeness === "COMPLETE" ? (
                          <span className="text-green-700">Complet</span>
                        ) : (
                          <span className="text-amber-700">
                            Incomplet
                            <span className="block text-xs text-slate-500">
                              {advisor.incompleteReasons.map((code) => REASONS[code] ?? code).join(", ")}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="p-3">
                          <table className="w-full text-xs">
                            <thead className="text-left uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="p-2">Client / mandat</th>
                                <th className="p-2">Heures</th>
                                <th className="p-2">Coût connu</th>
                                <th className="p-2">Valeur produite</th>
                              </tr>
                            </thead>
                            <tbody>
                              {advisor.mandates.map((mandate) => (
                                <tr key={mandate.projectId} className="border-t border-slate-200">
                                  <td className="p-2">
                                    <span className="font-semibold text-slate-700">{mandate.clientName}</span>
                                    <span className="block text-slate-500">{mandate.projectName}</span>
                                  </td>
                                  <td className="p-2">{hours(mandate.hours)}</td>
                                  <td className="p-2">{formatFinancialAmount(mandate.knownLaborCost, advisor.currency)}</td>
                                  <td className="p-2">{formatFinancialAmount(mandate.producedValue, advisor.currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
