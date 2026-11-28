"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";

type MonthCell = {
  month: number;
  hours: number;
  knownLaborCost: string;
  producedValue: string;
  contributionMargin: string;
  cumulativeValue: string;
  provisional: boolean;
  costPartial: boolean;
  valuePartial: boolean;
};
type Series = {
  months: MonthCell[];
  totals: { hours: number; knownLaborCost: string; producedValue: string; contributionMargin: string };
};
type MonthlyResponse = {
  year: number;
  currency: string;
  scope: "ORGANIZATION" | "ADVISOR";
  team: (Series & { objective: string | null }) | null;
  advisors: Array<Series & { userId: string; userName: string; objective: string | null }>;
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const money = (value: string | number | null) =>
  value === null
    ? "—"
    : `${Number(value).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $`;
const hours = (value: number) =>
  `${value.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;

/** Mois écoulés dans l'année affichée (12 pour une année passée, 0 pour une année future). */
function elapsedMonths(year: number) {
  const now = new Date();
  if (year < now.getFullYear()) return 12;
  if (year > now.getFullYear()) return 0;
  return now.getMonth() + (now.getDate() / new Date(year, now.getMonth() + 1, 0).getDate());
}

function Progress({ value, objective, year }: { value: string; objective: string | null; year: number }) {
  if (!objective || Number(objective) <= 0)
    return <p className="text-sm text-slate-500">Aucun objectif annuel défini.</p>;
  const target = Number(objective);
  const done = Number(value);
  const percent = Math.round((done / target) * 100);
  const expected = (target * elapsedMonths(year)) / 12;
  const gap = done - expected;
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-800">
          {money(done)} sur {money(target)} · {percent} %
        </span>
        <span className={gap >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
          {gap >= 0 ? `En avance de ${money(gap)}` : `En retard de ${money(-gap)}`} sur le rythme prévu
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded bg-slate-100" aria-hidden="true">
        <div className="h-3 bg-red-700" style={{ width: `${Math.min(100, percent)}%` }} />
        <div className="absolute top-0 h-3 w-0.5 bg-slate-800" style={{ left: `${Math.min(100, (expected / target) * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">La barre verticale indique le rythme prévu à ce jour (objectif ÷ 12 par mois).</p>
    </div>
  );
}

function ObjectiveEditor({
  current,
  onSave,
}: {
  current: string | null;
  onSave: (value: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ? String(Math.round(Number(current))) : "");
  useEffect(() => setValue(current ? String(Math.round(Number(current))) : ""), [current]);
  if (!editing)
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-blue-700 underline">
        {current ? "Modifier l’objectif" : "Définir l’objectif"}
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        step={1000}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-32 rounded border border-slate-300 px-2 py-1 text-xs"
        aria-label="Objectif annuel en dollars"
      />
      <button
        type="button"
        className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
        onClick={async () => {
          await onSave(value.trim() ? String(Math.max(0, Math.round(Number(value)))) : null);
          setEditing(false);
        }}
      >
        Enregistrer
      </button>
      <button type="button" className="text-xs text-slate-500" onClick={() => setEditing(false)}>
        Annuler
      </button>
    </span>
  );
}

function MonthTable({ series, objective }: { series: Series; objective: string | null }) {
  const monthlyTarget = objective ? Number(objective) / 12 : null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="p-2">Mois</th>
            <th className="p-2">Heures</th>
            <th className="p-2">Valeur produite</th>
            <th className="p-2">Coût connu</th>
            <th className="p-2">Marge</th>
            <th className="p-2">Cumul</th>
            {monthlyTarget !== null && <th className="p-2">Objectif cumulé</th>}
          </tr>
        </thead>
        <tbody>
          {series.months.map((cell, index) => (
            <tr key={cell.month} className="border-t border-slate-100">
              <td className="p-2 font-semibold text-slate-700">{MONTHS[index]}</td>
              <td className="p-2">{cell.hours ? hours(cell.hours) : "—"}</td>
              <td className="p-2">
                {cell.hours ? money(cell.producedValue) : "—"}
                {cell.provisional && <span className="ml-1 text-xs text-amber-700" title="Mandat non terminé : valeur provisoire">provisoire</span>}
                {cell.valuePartial && <span className="ml-1 text-xs text-slate-500" title="Heures sur un mandat sans vente validée">*</span>}
              </td>
              <td className="p-2">
                {cell.hours ? money(cell.knownLaborCost) : "—"}
                {cell.costPartial && <span className="ml-1 text-xs text-slate-500" title="Taux interne manquant pour une partie des heures">*</span>}
              </td>
              <td className={`p-2 ${Number(cell.contributionMargin) < 0 ? "text-red-700" : ""}`}>{cell.hours ? money(cell.contributionMargin) : "—"}</td>
              <td className="p-2 text-slate-600">{money(cell.cumulativeValue)}</td>
              {monthlyTarget !== null && <td className="p-2 text-slate-500">{money(monthlyTarget * (index + 1))}</td>}
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 font-semibold">
            <td className="p-2">Total</td>
            <td className="p-2">{hours(series.totals.hours)}</td>
            <td className="p-2">{money(series.totals.producedValue)}</td>
            <td className="p-2">{money(series.totals.knownLaborCost)}</td>
            <td className="p-2">{money(series.totals.contributionMargin)}</td>
            <td className="p-2" />
            {monthlyTarget !== null && <td className="p-2">{money(objective)}</td>}
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">
        « provisoire » : le mandat n’est pas terminé, la valeur du mois peut encore baisser s’il dépasse son budget d’heures.
        * : heures sur un mandat sans vente validée, ou sans taux interne.
      </p>
    </div>
  );
}

/**
 * Suivi mensuel du rendement d'une année et progression vers l'objectif
 * annuel de valeur produite : équipe (administrateurs) ou conseiller (le sien).
 */
export default function MonthlyRendementPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [error, setError] = useState("");
  const [openAdvisor, setOpenAdvisor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<MonthlyResponse>("/rendement/monthly", { params: { year } });
      setData(response.data);
      setError("");
    } catch {
      setError("Le suivi mensuel ne peut pas être chargé.");
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveObjective = async (userId: string | null, valueTarget: string | null) => {
    try {
      await api.put("/rendement/objectives", { year, userId, valueTarget });
      toast("Objectif enregistré.", "success");
      await load();
    } catch (err: any) {
      toast(err?.response?.data?.message || "Objectif non enregistré.", "error");
    }
  };

  const isTeam = data?.scope === "ORGANIZATION";
  const own = useMemo(() => (data && !isTeam ? data.advisors[0] : null), [data, isTeam]);

  return (
    <section className="mb-6 rounded-md border border-slate-200 bg-white" aria-label="Suivi mensuel">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <h2 className="font-bold text-slate-800">Suivi mensuel et objectif annuel</h2>
        <label className="ml-auto text-sm text-slate-600">
          Année{" "}
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded border border-slate-300 px-2 py-1">
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="p-4 text-sm text-red-800">{error}</p>}
      {!data && !error && <p className="p-4 text-sm text-slate-500">Chargement…</p>}

      {data && isTeam && data.team && (
        <div className="p-4">
          <div className="mb-4 rounded-md border border-slate-200 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-slate-800">Équipe — objectif {year}</h3>
              <ObjectiveEditor current={data.team.objective} onSave={(value) => saveObjective(null, value)} />
            </div>
            <Progress value={data.team.totals.producedValue} objective={data.team.objective} year={year} />
          </div>
          <MonthTable series={data.team} objective={data.team.objective} />

          <h3 className="mb-2 mt-6 font-semibold text-slate-800">Par conseiller</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-2">Conseiller</th>
                  {MONTHS.map((label) => <th key={label} className="p-2 text-right">{label}</th>)}
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Objectif</th>
                </tr>
              </thead>
              <tbody>
                {data.advisors.map((advisor) => {
                  const percent = advisor.objective && Number(advisor.objective) > 0
                    ? Math.round((Number(advisor.totals.producedValue) / Number(advisor.objective)) * 100)
                    : null;
                  const expanded = openAdvisor === advisor.userId;
                  return (
                    <Fragment key={advisor.userId}>
                      <tr className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setOpenAdvisor(expanded ? null : advisor.userId)}>
                        <td className="p-2 font-semibold text-slate-800">
                          <span className="mr-1 text-slate-400">{expanded ? "▾" : "▸"}</span>
                          {advisor.userName}
                        </td>
                        {advisor.months.map((cell) => (
                          <td key={cell.month} className="p-2 text-right">{cell.hours ? money(cell.producedValue) : "—"}</td>
                        ))}
                        <td className="p-2 text-right font-semibold">{money(advisor.totals.producedValue)}</td>
                        <td className="p-2" onClick={(event) => event.stopPropagation()}>
                          {advisor.objective && <span className="mr-2">{money(advisor.objective)}{percent !== null && ` · ${percent} %`}</span>}
                          <ObjectiveEditor current={advisor.objective} onSave={(value) => saveObjective(advisor.userId, value)} />
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={15} className="p-3">
                            <Progress value={advisor.totals.producedValue} objective={advisor.objective} year={year} />
                            <div className="mt-3"><MonthTable series={advisor} objective={advisor.objective} /></div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && !isTeam && (
        <div className="p-4">
          {own ? (
            <>
              <div className="mb-4 rounded-md border border-slate-200 p-4">
                <h3 className="mb-2 font-semibold text-slate-800">Mon objectif {year}</h3>
                <Progress value={own.totals.producedValue} objective={own.objective} year={year} />
              </div>
              <MonthTable series={own} objective={own.objective} />
            </>
          ) : (
            <p className="text-sm text-slate-500">Aucune heure saisie sur un mandat en {year}.</p>
          )}
        </div>
      )}
    </section>
  );
}
