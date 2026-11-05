"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import styles from "./pilot.module.css";

type CheckStatus = "NOT_RUN" | "PASS" | "FAIL" | "BLOCKED" | "NOT_APPLICABLE";
type RunStatus = "PLANNED" | "RUNNING" | "PASSED" | "FAILED" | "PARTIAL";
type PilotCheck = {
  id: string;
  phase: string;
  checkKey: string;
  label: string;
  status: CheckStatus;
  notes?: string | null;
  evidence?: Record<string, unknown> | null;
};
type PilotRun = {
  id: string;
  sequence: number;
  environment: "QA" | "PRODUCTION_DEMO";
  status: RunStatus;
  sourceCommit?: string | null;
  completedAt?: string | null;
  checks: PilotCheck[];
};
type PilotScenario = {
  id: string;
  scenarioKey: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "ARCHIVED";
  organization: { id: string; name: string };
  building: { id: string; name: string };
  project: { id: string; name: string };
  runs: PilotRun[];
};
type EligibleTarget = {
  id: string;
  name: string;
  buildings: Array<{ id: string; name: string }>;
  projects: Array<{
    id: string;
    name: string;
    buildingId: string;
    documentType: string;
    status: string;
  }>;
};

const PHASE_LABELS: Record<string, string> = {
  FOUNDATION: "1 · Fondation",
  CONFIGURATION: "2 · Configurateur bâtiment",
  DOCUMENT_GENERATION: "3 · Génération documentaire",
  INTERNAL_REVIEW: "4 · Révision interne",
  CLIENT_APPROVAL: "5 · Portail et approbation client",
  KNOWLEDGE_AI: "6 · Knowledge et CORO AI",
  INCIDENT_SENTINELLE: "7 · Incident et Sentinelle",
  EXERCISE_REX: "8 · Exercice, REX et actions correctives",
  RESILIENCE: "9 · Résilience",
  NETWORK: "10 · CORO Network",
  FINANCIAL: "11 · Rendement",
  SECURITY_RECOVERY: "12 · Sécurité, reprise et reset",
};

const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  NOT_RUN: "Non exécuté",
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "Bloqué",
  NOT_APPLICABLE: "Non applicable",
};

function checkAction(
  scenario: PilotScenario,
  check: PilotCheck,
): { href: string; label: string } | null {
  if (check.phase === "CONFIGURATION") {
    return {
      href: `/configurator/${scenario.project.id}`,
      label: "Ouvrir le configurateur",
    };
  }
  if (
    ["DOCUMENT_GENERATION", "INTERNAL_REVIEW", "CLIENT_APPROVAL"].includes(
      check.phase,
    )
  ) {
    return {
      href: `/projects/${scenario.project.id}`,
      label: "Ouvrir le projet",
    };
  }
  if (check.phase === "KNOWLEDGE_AI") {
    return {
      href: `/buildings/${scenario.building.id}`,
      label: "Ouvrir les documents du bâtiment",
    };
  }
  if (check.phase === "FINANCIAL") {
    return {
      href: `/projects/${scenario.project.id}/mandate`,
      label: "Ouvrir le mandat",
    };
  }
  if (check.phase === "FOUNDATION") {
    return check.checkKey === "foundation.building"
      ? {
          href: `/buildings/${scenario.building.id}`,
          label: "Ouvrir le bâtiment",
        }
      : {
          href: `/projects/${scenario.project.id}`,
          label: "Ouvrir le projet",
        };
  }
  return null;
}

function statusClass(status: CheckStatus | RunStatus) {
  if (status === "PASS" || status === "PASSED")
    return `${styles.status} ${styles.statusPass}`;
  if (status === "FAIL" || status === "FAILED")
    return `${styles.status} ${styles.statusFail}`;
  if (status === "BLOCKED" || status === "PARTIAL")
    return `${styles.status} ${styles.statusBlocked}`;
  return `${styles.status} ${styles.statusNeutral}`;
}

export default function TestScenarioPilotsPage() {
  const [scenarios, setScenarios] = useState<PilotScenario[]>([]);
  const [targets, setTargets] = useState<EligibleTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [organizationId, setOrganizationId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [projectId, setProjectId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [scenarioResponse, targetResponse] = await Promise.all([
        api.get<PilotScenario[]>("/admin/v1/test-scenario-pilots"),
        api.get<EligibleTarget[]>(
          "/admin/v1/test-scenario-pilots/eligible-targets",
        ),
      ]);
      setScenarios(scenarioResponse.data);
      setTargets(targetResponse.data);
    } catch {
      setError("Impossible de charger les scénarios pilotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedOrganization = targets.find(
    (target) => target.id === organizationId,
  );
  const eligibleProjects =
    selectedOrganization?.projects.filter(
      (project) => project.buildingId === buildingId,
    ) ?? [];

  async function createScenario() {
    const project = eligibleProjects.find((entry) => entry.id === projectId);
    if (!selectedOrganization || !buildingId || !project) {
      setError(
        "Sélectionnez une organisation, un bâtiment et un projet admissibles.",
      );
      return;
    }
    setBusy("create-scenario");
    setError("");
    try {
      await api.post("/admin/v1/test-scenario-pilots", {
        scenarioKey: `PILOT_${project.id.replaceAll("-", "").slice(0, 24).toUpperCase()}`,
        name: `Pilote bout en bout — ${project.name}`,
        description:
          "Recette gouvernée couvrant le parcours documentaire et les modules CORO liés.",
        organizationId: selectedOrganization.id,
        buildingId,
        projectId: project.id,
        reason: "Création gouvernée du scénario pilote depuis SuperAdmin",
      });
      setOrganizationId("");
      setBuildingId("");
      setProjectId("");
      await load();
    } catch {
      setError(
        "Le scénario n’a pas pu être créé. Vérifiez qu’il n’existe pas déjà.",
      );
    } finally {
      setBusy("");
    }
  }

  async function createRun(
    scenario: PilotScenario,
    environment: PilotRun["environment"],
  ) {
    setBusy(`run-${scenario.id}`);
    setError("");
    try {
      await api.post(`/admin/v1/test-scenario-pilots/${scenario.id}/runs`, {
        environment,
        reason: `Démarrage gouverné de la recette ${environment}`,
      });
      await load();
    } catch {
      setError("La nouvelle exécution n’a pas pu être créée.");
    } finally {
      setBusy("");
    }
  }

  async function updateCheck(
    scenario: PilotScenario,
    run: PilotRun,
    check: PilotCheck,
    status: CheckStatus,
  ) {
    setBusy(check.id);
    setError("");
    try {
      await api.patch(
        `/admin/v1/test-scenario-pilots/${scenario.id}/runs/${run.id}/checks/${encodeURIComponent(check.checkKey)}`,
        {
          status,
          notes: notes[check.id] ?? check.notes ?? undefined,
          reason: `Résultat du contrôle ${check.checkKey}`,
        },
      );
      await load();
    } catch {
      setError(`Le contrôle « ${check.label} » n’a pas pu être enregistré.`);
    } finally {
      setBusy("");
    }
  }

  async function completeRun(scenario: PilotScenario, run: PilotRun) {
    setBusy(`complete-${run.id}`);
    setError("");
    try {
      await api.post(
        `/admin/v1/test-scenario-pilots/${scenario.id}/runs/${run.id}/complete`,
        {
          reason: "Clôture gouvernée de l’exécution pilote",
        },
      );
      await load();
    } catch {
      setError("L’exécution n’a pas pu être clôturée.");
    } finally {
      setBusy("");
    }
  }

  return (
    <AppLayout>
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Test Scenario Pilot</h1>
            <p className={styles.subtitle}>
              Registre gouverné des parcours de bout en bout. Une coche
              représente une preuve exécutée, jamais une simple présence de
              données.
            </p>
          </div>
          <button
            className={styles.button}
            type="button"
            onClick={() => void load()}
            disabled={loading}
          >
            Actualiser
          </button>
        </header>

        {error && (
          <p className={`${styles.message} ${styles.error}`} role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className={styles.message} aria-live="polite">
            Chargement des scénarios…
          </p>
        )}
        {!loading && (
          <section
            className={styles.createPanel}
            aria-labelledby="create-pilot-title"
          >
            <div>
              <h2 id="create-pilot-title">Enregistrer une cible pilote</h2>
              <p>
                Seuls les environnements Démo actifs et leurs projets actifs
                sont proposés.
              </p>
            </div>
            <div className={styles.createGrid}>
              <label>
                Organisation
                <select
                  className={styles.select}
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setBuildingId("");
                    setProjectId("");
                  }}
                >
                  <option value="">Sélectionner</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bâtiment
                <select
                  className={styles.select}
                  value={buildingId}
                  disabled={!selectedOrganization}
                  onChange={(event) => {
                    setBuildingId(event.target.value);
                    setProjectId("");
                  }}
                >
                  <option value="">Sélectionner</option>
                  {selectedOrganization?.buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Projet
                <select
                  className={styles.select}
                  value={projectId}
                  disabled={!buildingId}
                  onChange={(event) => setProjectId(event.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {eligibleProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} · {project.documentType} · {project.status}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                type="button"
                disabled={!projectId || Boolean(busy)}
                onClick={() => void createScenario()}
              >
                Créer le scénario
              </button>
            </div>
          </section>
        )}
        {!loading && !scenarios.length && (
          <p className={styles.message}>
            Aucun scénario gouverné n’est encore enregistré. Le provisionnement
            doit passer par l’autorité SuperAdmin.
          </p>
        )}

        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            busy={busy}
            notes={notes}
            setNotes={setNotes}
            createRun={createRun}
            updateCheck={updateCheck}
            completeRun={completeRun}
          />
        ))}
      </main>
    </AppLayout>
  );
}

function ScenarioCard(props: {
  scenario: PilotScenario;
  busy: string;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  createRun: (
    scenario: PilotScenario,
    environment: PilotRun["environment"],
  ) => Promise<void>;
  updateCheck: (
    scenario: PilotScenario,
    run: PilotRun,
    check: PilotCheck,
    status: CheckStatus,
  ) => Promise<void>;
  completeRun: (scenario: PilotScenario, run: PilotRun) => Promise<void>;
}) {
  const run = props.scenario.runs[0];
  const grouped = useMemo(() => {
    const result = new Map<string, PilotCheck[]>();
    for (const check of run?.checks ?? [])
      result.set(check.phase, [...(result.get(check.phase) ?? []), check]);
    return result;
  }, [run]);
  const totals = useMemo(() => {
    const all = run?.checks ?? [];
    return {
      total: all.length,
      pass: all.filter((check) => check.status === "PASS").length,
      fail: all.filter((check) => check.status === "FAIL").length,
      blocked: all.filter((check) => check.status === "BLOCKED").length,
      remaining: all.filter((check) => check.status === "NOT_RUN").length,
    };
  }, [run]);

  return (
    <section
      className={styles.scenario}
      aria-labelledby={`scenario-${props.scenario.id}`}
    >
      <div className={styles.scenarioHeading}>
        <div>
          <h2 id={`scenario-${props.scenario.id}`}>{props.scenario.name}</h2>
          <p className={styles.meta}>
            {props.scenario.organization.name} · {props.scenario.building.name}{" "}
            · {props.scenario.project.name}
          </p>
        </div>
        <span
          className={run ? statusClass(run.status) : statusClass("NOT_RUN")}
        >
          {run?.status ?? "Aucune exécution"}
        </span>
      </div>
      {props.scenario.description && <p>{props.scenario.description}</p>}

      {!run ? (
        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={Boolean(props.busy)}
            onClick={() => void props.createRun(props.scenario, "QA")}
          >
            Démarrer QA
          </button>
          <button
            className={styles.button}
            disabled={Boolean(props.busy)}
            onClick={() =>
              void props.createRun(props.scenario, "PRODUCTION_DEMO")
            }
          >
            Démarrer CORO Démo
          </button>
        </div>
      ) : (
        <>
          <div className={styles.summary} aria-label="Résumé de l’exécution">
            {[
              ["Contrôles", totals.total],
              ["PASS", totals.pass],
              ["FAIL", totals.fail],
              ["Bloqués", totals.blocked],
              ["Restants", totals.remaining],
            ].map(([label, value]) => (
              <div className={styles.summaryCard} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {Array.from(grouped.entries()).map(
            ([phase, checks]: [string, PilotCheck[]]) => (
              <section className={styles.phase} key={phase}>
                <div className={styles.phaseHeading}>
                  <h3>{PHASE_LABELS[phase] ?? phase}</h3>
                  <span>
                    {checks.filter((check) => check.status === "PASS").length}/
                    {checks.length} PASS
                  </span>
                </div>
                {checks.map((check) => (
                  <div className={styles.checkRow} key={check.id}>
                    <div className={styles.checkText}>
                      <strong>{check.label}</strong>
                      <small>
                        {check.checkKey}
                        {check.notes ? ` · ${check.notes}` : ""}
                      </small>
                    </div>
                    {checkAction(props.scenario, check) && (
                      <Link
                        className={styles.actionLink}
                        href={checkAction(props.scenario, check)!.href}
                      >
                        {checkAction(props.scenario, check)!.label}
                      </Link>
                    )}
                    <select
                      className={styles.select}
                      aria-label={`Résultat : ${check.label}`}
                      value={check.status}
                      disabled={
                        Boolean(run.completedAt) || props.busy === check.id
                      }
                      onChange={(event) =>
                        void props.updateCheck(
                          props.scenario,
                          run,
                          check,
                          event.target.value as CheckStatus,
                        )
                      }
                    >
                      {(Object.keys(CHECK_STATUS_LABELS) as CheckStatus[]).map(
                        (status) => (
                          <option value={status} key={status}>
                            {CHECK_STATUS_LABELS[status]}
                          </option>
                        ),
                      )}
                    </select>
                    <input
                      className={styles.input}
                      aria-label={`Note : ${check.label}`}
                      placeholder="Preuve ou réserve concise"
                      disabled={Boolean(run.completedAt)}
                      value={props.notes[check.id] ?? check.notes ?? ""}
                      onChange={(event) =>
                        props.setNotes((current) => ({
                          ...current,
                          [check.id]: event.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (
                          (props.notes[check.id] ?? "") !== (check.notes ?? "")
                        )
                          void props.updateCheck(
                            props.scenario,
                            run,
                            check,
                            check.status,
                          );
                      }}
                    />
                    <span className={statusClass(check.status)}>
                      {CHECK_STATUS_LABELS[check.status]}
                    </span>
                  </div>
                ))}
              </section>
            ),
          )}
          <div className={styles.actions} style={{ marginTop: 16 }}>
            {!run.completedAt && (
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={Boolean(props.busy)}
                onClick={() => void props.completeRun(props.scenario, run)}
              >
                Clôturer cette exécution
              </button>
            )}
            {run.completedAt && (
              <button
                className={styles.button}
                disabled={Boolean(props.busy)}
                onClick={() =>
                  void props.createRun(props.scenario, run.environment)
                }
              >
                Nouvelle exécution
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
