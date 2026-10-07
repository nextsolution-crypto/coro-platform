import type { GuidedScenario } from "./configurator-types";

export function ScenarioSidebar({
  scenarios,
  activeId,
  onOpen,
  onCreate,
}: {
  scenarios: GuidedScenario[];
  activeId?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <aside className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Scénarios</h2>
        <button
          type="button"
          onClick={onCreate}
          className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
        >
          Nouveau
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onOpen(scenario.id)}
            className={`w-full rounded-lg border p-3 text-left text-sm ${activeId === scenario.id ? "border-emerald-600 bg-emerald-50" : "bg-white"}`}
          >
            <span className="font-medium">{scenario.name}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {scenario.status === "ACTIVE" ? "Actif" : "Archivé"}
              {" · "}
              {scenario.selected
                ? "Scénario retenu"
                : scenario.stale === true
                  ? "Recalcul requis"
                  : scenario.latestResult
                    ? "Calcul officiel à jour"
                    : "Non calculé"}
            </span>
          </button>
        ))}
        {!scenarios.length && (
          <p className="text-sm text-slate-500">
            Create the first business scenario.
          </p>
        )}
      </div>
    </aside>
  );
}
