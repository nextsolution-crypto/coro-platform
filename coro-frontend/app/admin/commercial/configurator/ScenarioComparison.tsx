import type { ScenarioComparison as Comparison } from "./configurator-types";

const money = (value: string | null) =>
  value == null
    ? "Indisponible"
    : new Intl.NumberFormat("fr-CA", {
        style: "currency",
        currency: "CAD",
      }).format(Number(value) / 100);

export function ScenarioComparison({
  comparison,
  onSelect,
}: {
  comparison: Comparison;
  onSelect: (scenarioId: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">Comparaison des scénarios</h2>
      <p className="text-sm text-slate-500">
        Base de comparaison : {comparison.baselineScenarioName ?? "aucune"}. La
        sélection demeure une décision humaine.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {comparison.scenarios.map((scenario) => (
          <article
            key={scenario.scenarioId}
            className={`rounded border p-4 ${scenario.selected ? "border-emerald-500 bg-emerald-50" : ""}`}
          >
            <div className="flex justify-between">
              <b>{scenario.name}</b>
              {scenario.selected && <span>Sélectionné</span>}
            </div>
            <p className="text-xs">
              {scenario.state === "CURRENT"
                ? "Calcul courant"
                : scenario.state === "NOT_CALCULATED"
                  ? "À calculer"
                  : "Recalcul requis"}{" "}
              · Packaging {scenario.packaging}
            </p>
            <dl className="mt-3 text-sm">
              <dt>Ponctuel</dt>
              <dd>{money(scenario.totals?.oneTimeMinor ?? null)}</dd>
              <dt>Récurrent mensuel</dt>
              <dd>{money(scenario.totals?.monthlyRecurringMinor ?? null)}</dd>
              <dt>Équivalent annuel récurrent</dt>
              <dd>
                {money(scenario.totals?.annualRecurringEquivalentMinor ?? null)}
              </dd>
              <dt>Première année</dt>
              <dd>{money(scenario.totals?.firstYearMinor ?? null)}</dd>
              <dt>Coût direct interne</dt>
              <dd>{money(scenario.internalEconomics?.costMinor ?? null)}</dd>
              <dt>Contribution interne</dt>
              <dd>
                {money(scenario.internalEconomics?.contributionMinor ?? null)}
              </dd>
              <dt>Marge interne</dt>
              <dd>
                {scenario.internalEconomics?.marginBasisPoints == null
                  ? "Indisponible"
                  : `${(scenario.internalEconomics.marginBasisPoints / 100).toFixed(2)} %`}
              </dd>
              <dt>Valeur approuvée</dt>
              <dd>
                {scenario.value.length === 0
                  ? "Indisponible"
                  : scenario.value
                      .flatMap((result) => result.metrics)
                      .map((metric) =>
                        metric.moneyMinorValue == null
                          ? `${metric.label}: ${metric.decimalValue ?? "—"}`
                          : `${metric.label}: ${money(metric.moneyMinorValue)}`,
                      )
                      .join(" · ")}
              </dd>
            </dl>
            {scenario.state === "CURRENT" && !scenario.selected && (
              <button
                className="mt-3 rounded border px-3 py-2"
                onClick={() => onSelect(scenario.scenarioId)}
              >
                Sélectionner
              </button>
            )}
          </article>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Composant</th>
              {comparison.scenarios.map((scenario) => (
                <th key={scenario.scenarioId}>{scenario.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.components.map((row) => (
              <tr key={row.componentCode} className="border-t">
                <td className="py-2">
                  <b>{row.label}</b>
                </td>
                {row.scenarios.map((cell) => (
                  <td key={cell.scenarioName}>
                    {cell.included ? (
                      <>
                        <div className="text-xs font-semibold text-emerald-700">
                          {cell.change === "ADDED"
                            ? "Ajout"
                            : cell.professionalService
                              ? "Services professionnels"
                              : cell.implementation
                                ? "Implémentation"
                                : "Inclus"}
                        </div>
                        <div>
                          Qté {cell.quantity ?? "—"} (
                          {cell.quantityDelta ?? "0"})
                        </div>
                        <div>
                          Unitaire {money(cell.unitAmountMinor)} (
                          {money(cell.unitAmountDeltaMinor)})
                        </div>
                        <div>
                          {money(cell.extendedAmountMinor)} (
                          {money(cell.extendedAmountDeltaMinor)})
                        </div>
                      </>
                    ) : cell.change === "UNAVAILABLE" ? (
                      "Calcul indisponible"
                    ) : cell.change === "REMOVED" ? (
                      "Retrait"
                    ) : (
                      "Non inclus"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
