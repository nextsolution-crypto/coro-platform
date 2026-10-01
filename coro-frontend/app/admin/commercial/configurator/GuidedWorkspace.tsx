"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { CONFIGURATOR_API_BASE } from "./configurator-contract.mjs";
import type {
  CatalogComponent,
  CommercialFamily,
  DriverDefinition,
  GuidedWorkspace as Workspace,
} from "./configurator-types";
import { ScenarioEditor } from "./ScenarioEditor";
import { ScenarioResults } from "./ScenarioResults";
import { ScenarioSidebar } from "./ScenarioSidebar";

export function GuidedWorkspace({
  workspaceId,
  families,
  drivers,
  onClose,
}: {
  workspaceId: string;
  families: CommercialFamily[];
  drivers: DriverDefinition[];
  onClose: () => void;
}) {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [catalog, setCatalog] = useState<CatalogComponent[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const reload = useCallback(
    async (preferredId?: string) => {
      const [workspaceResponse, catalogResponse] = await Promise.all([
        api.get(`${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}`),
        api.get(`${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/catalog`),
      ]);
      const next = workspaceResponse.data as Workspace;
      setWorkspace(next);
      setCatalog(catalogResponse.data.components);
      setActiveId(
        (current) =>
          preferredId ??
          current ??
          next.scenarios.find((scenario) => scenario.status === "ACTIVE")?.id,
      );
    },
    [workspaceId],
  );

  useEffect(() => {
    // The API response is the external source that initializes this workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch(() =>
      setMessage("Unable to load this commercial configuration."),
    );
  }, [reload]);

  async function action(
    task: () => Promise<unknown>,
    success: string,
    preferredId?: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await task();
      const createdId = (response as { data?: { id?: string } })?.data?.id;
      await reload(preferredId ?? createdId);
      setMessage(success);
    } catch (error) {
      const apiMessage = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setMessage(
        Array.isArray(apiMessage)
          ? apiMessage.join(" · ")
          : (apiMessage ?? "The operation could not be completed."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!workspace)
    return (
      <p className="mt-6 rounded border bg-white p-4">
        Loading guided workspace…
      </p>
    );
  const scenario = workspace.scenarios.find((item) => item.id === activeId);

  return (
    <div className="mt-6">
      <header className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600"
            >
              ← All configurations
            </button>
            <h1 className="mt-2 text-2xl font-semibold">{workspace.title}</h1>
            <p className="text-sm text-slate-500">
              {workspace.target.name} · {workspace.catalog.name} v
              {workspace.catalog.versionNumber} · {workspace.catalog.audience} ·{" "}
              {workspace.currency}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Guided configuration
          </span>
        </div>
      </header>
      <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
        <ScenarioSidebar
          scenarios={workspace.scenarios}
          activeId={activeId}
          onOpen={setActiveId}
          onCreate={() => {
            const name = window.prompt("Scenario name", "Standard");
            if (name?.trim())
              void action(
                () =>
                  api.post(
                    `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios`,
                    { name: name.trim() },
                  ),
                "Scenario created.",
              );
          }}
        />
        <main className="space-y-5">
          {scenario ? (
            <>
              <ScenarioEditor
                key={`${scenario.id}:${scenario.lockVersion}`}
                scenario={scenario}
                families={families}
                drivers={drivers}
                catalog={catalog}
                busy={busy}
                onSaveMetadata={(name, description) =>
                  action(
                    () =>
                      api.put(
                        `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/metadata`,
                        {
                          name,
                          description: description || undefined,
                          lockVersion: scenario.lockVersion,
                        },
                      ),
                    "Scenario details saved.",
                    scenario.id,
                  )
                }
                onSave={(payload) =>
                  action(
                    () =>
                      api.put(
                        `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}`,
                        payload,
                      ),
                    "Scenario configuration saved.",
                    scenario.id,
                  )
                }
                onCalculate={() =>
                  action(
                    () =>
                      api.post(
                        `/admin/v1/commercial/simulator/workspaces/${workspaceId}/scenarios/${scenario.id}/calculate`,
                        {},
                      ),
                    "Scenario calculated.",
                    scenario.id,
                  )
                }
                onDuplicate={() =>
                  action(
                    () =>
                      api.post(
                        `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/duplicate`,
                      ),
                    "Scenario duplicated.",
                  )
                }
                onArchive={() =>
                  action(
                    () =>
                      api.post(
                        `${CONFIGURATOR_API_BASE}/workspaces/${workspaceId}/scenarios/${scenario.id}/archive`,
                        { lockVersion: scenario.lockVersion },
                      ),
                    "Scenario archived.",
                  )
                }
                onSelect={() =>
                  action(
                    () =>
                      api.post(
                        `/admin/v1/commercial/simulator/workspaces/${workspaceId}/select`,
                        {
                          scenarioId: scenario.id,
                          lockVersion: workspace.lockVersion,
                        },
                      ),
                    "Scenario selected.",
                    scenario.id,
                  )
                }
              />
              <ScenarioResults scenario={scenario} />
            </>
          ) : (
            <section className="rounded-xl border bg-white p-8 text-center">
              <h2 className="text-lg font-semibold">
                Create or open a scenario
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                The guided editor keeps catalog semantics server-controlled and
                calculation evidence in the existing simulator.
              </p>
            </section>
          )}
          {message && (
            <p role="status" className="rounded border bg-white p-3 text-sm">
              {message}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
