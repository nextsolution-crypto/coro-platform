import type { GuidedScenario } from "./configurator-types";

const money = (value: string | null) =>
  value == null
    ? "Unavailable"
    : new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(value));

export function ScenarioResults({ scenario }: { scenario: GuidedScenario }) {
  const result = scenario.latestResult;
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calculation results</h2>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${scenario.stale ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}
        >
          {scenario.stale
            ? "Recalculation required"
            : result
              ? "Current"
              : "Not calculated"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-slate-500">Contribution</p>
          <strong>{money(result?.contributionCad ?? null)}</strong>
          {result?.marginPercent && (
            <span className="ml-2 text-xs text-slate-500">
              {result.marginPercent}% margin
            </span>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-slate-500">First-year price</p>
          <strong>{money(result?.firstYearCommitmentCad ?? null)}</strong>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-slate-500">First-year direct cost</p>
          <strong>{money(result?.firstYearCostCad ?? null)}</strong>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-slate-500">Value analysis</p>
          <strong>
            {result?.valueStatus === "COMPLETE" ? "Available" : "Unavailable"}
          </strong>
        </div>
      </div>
      {!!result?.warningCodes.length && (
        <p className="mt-3 text-sm text-amber-800">
          Warnings: {result.warningCodes.join(" · ")}
        </p>
      )}
    </section>
  );
}
