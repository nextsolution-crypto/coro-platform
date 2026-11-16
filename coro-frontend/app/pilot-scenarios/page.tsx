"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import styles from "../admin/test-scenario-pilots/pilot.module.css";

type CheckStatus = "NOT_RUN" | "PASS" | "FAIL" | "BLOCKED" | "NOT_APPLICABLE";
type PilotCheck = { id: string; phase: string; checkKey: string; label: string; status: CheckStatus; notes?: string | null };
type PilotRun = { id: string; status: string; completedAt?: string | null; checks: PilotCheck[] };
type PilotScenario = { id: string; name: string; description?: string | null; organization: { id: string; name: string }; building: { id: string; name: string }; project: { id: string; name: string }; runs: PilotRun[] };

const STATUS_LABELS: Record<CheckStatus, string> = { NOT_RUN: "Non exécuté", PASS: "PASS", FAIL: "FAIL", BLOCKED: "Bloqué", NOT_APPLICABLE: "Non applicable" };
const PHASE_LABELS: Record<string, string> = {
  FOUNDATION: "1 · Fondation", CONFIGURATION: "2 · Configurateur bâtiment", DOCUMENT_GENERATION: "3 · Génération documentaire",
  INTERNAL_REVIEW: "4 · Révision interne", CLIENT_APPROVAL: "5 · Portail et approbation client", KNOWLEDGE_AI: "6 · Knowledge et CORO AI",
  INCIDENT_SENTINELLE: "7 · Incident et Sentinelle", EXERCISE_REX: "8 · Exercice, REX et actions correctives", RESILIENCE: "9 · Résilience",
  NETWORK: "10 · CORO Network", FINANCIAL: "11 · Rendement", SECURITY_RECOVERY: "12 · Sécurité, reprise et reset",
};

function actionFor(scenario: PilotScenario, check: PilotCheck) {
  if (check.phase === "CONFIGURATION") return { href: `/configurator/${scenario.project.id}`, label: "Ouvrir le configurateur" };
  if (["DOCUMENT_GENERATION", "INTERNAL_REVIEW", "CLIENT_APPROVAL"].includes(check.phase)) return { href: `/projects/${scenario.project.id}`, label: "Ouvrir le projet" };
  if (check.phase === "KNOWLEDGE_AI") return { href: `/buildings/${scenario.building.id}`, label: "Ouvrir les documents du bâtiment" };
  if (check.phase === "FINANCIAL") return { href: `/projects/${scenario.project.id}/mandate`, label: "Ouvrir le mandat" };
  if (check.phase === "FOUNDATION") return check.checkKey === "foundation.building" ? { href: `/buildings/${scenario.building.id}`, label: "Ouvrir le bâtiment" } : { href: `/projects/${scenario.project.id}`, label: "Ouvrir le projet" };
  return null;
}

export default function PilotScenariosPage() {
  const router = useRouter();
  const { user, isInitialized, initAuth } = useAuthStore();
  const [scenarios, setScenarios] = useState<PilotScenario[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void initAuth(); }, [initAuth]);
  useEffect(() => {
    if (!isInitialized) return;
    if (!user) router.replace("/login");
    else if (user.role !== "ADMIN") router.replace("/dashboard");
  }, [isInitialized, router, user]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setScenarios((await api.get<PilotScenario[]>("/pilot-scenarios")).data); }
    catch { setError("Les recettes pilotes de votre organisation ne peuvent pas être chargées."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (user?.role === "ADMIN") void Promise.resolve().then(load);
  }, [load, user]);

  async function update(scenario: PilotScenario, run: PilotRun, check: PilotCheck, status: CheckStatus) {
    setBusy(check.id); setError("");
    try {
      await api.patch(`/pilot-scenarios/${scenario.id}/runs/${run.id}/checks/${encodeURIComponent(check.checkKey)}`, { status, notes: notes[check.id] ?? check.notes ?? "", reason: "Preuve consignée par l’administrateur du tenant pilote" });
      await load();
    } catch { setError("La preuve n’a pas pu être enregistrée."); }
    finally { setBusy(""); }
  }

  if (!isInitialized || !user || user.role !== "ADMIN") return null;
  return <AppLayout><main className={styles.page}>
    <header className={styles.header}><div><h1 className={styles.title}>Mes recettes pilotes</h1><p className={styles.subtitle}>Exécutez les contrôles dans votre propre organisation. Chaque PASS ou FAIL doit correspondre à une preuve réellement observée.</p></div><button className={styles.button} type="button" onClick={() => void load()} disabled={loading}>Actualiser</button></header>
    {error && <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p>}
    {loading && <p className={styles.message} aria-live="polite">Chargement des recettes…</p>}
    {!loading && !scenarios.length && <p className={styles.message}>Aucune recette pilote active n’est rattachée à votre organisation.</p>}
    {scenarios.map(scenario => <TenantScenario key={scenario.id} scenario={scenario} notes={notes} setNotes={setNotes} busy={busy} update={update} />)}
  </main></AppLayout>;
}

function TenantScenario({ scenario, notes, setNotes, busy, update }: { scenario: PilotScenario; notes: Record<string, string>; setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>; busy: string; update: (scenario: PilotScenario, run: PilotRun, check: PilotCheck, status: CheckStatus) => Promise<void> }) {
  const run = scenario.runs[0];
  const grouped = useMemo(() => { const groups = new Map<string, PilotCheck[]>(); for (const check of run?.checks ?? []) groups.set(check.phase, [...(groups.get(check.phase) ?? []), check]); return groups; }, [run]);
  const checks = run?.checks ?? [];
  return <section className={styles.scenario} aria-labelledby={`scenario-${scenario.id}`}><div className={styles.scenarioHeading}><div><h2 id={`scenario-${scenario.id}`}>{scenario.name}</h2><p className={styles.meta}>{scenario.organization.name} · {scenario.building.name} · {scenario.project.name}</p></div><span className={styles.status}>{run?.status ?? "Aucune exécution"}</span></div>
    {scenario.description && <p>{scenario.description}</p>}
    {!run ? <p className={styles.message}>Le SuperAdmin doit d’abord ouvrir une exécution gouvernée.</p> : <><div className={styles.summary} aria-label="Résumé de l’exécution">{[["Contrôles", checks.length], ["PASS", checks.filter(c => c.status === "PASS").length], ["FAIL", checks.filter(c => c.status === "FAIL").length], ["Bloqués", checks.filter(c => c.status === "BLOCKED").length], ["Restants", checks.filter(c => c.status === "NOT_RUN").length]].map(([label, value]) => <div className={styles.summaryCard} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {Array.from(grouped.entries()).map(([phase, phaseChecks]) => <section className={styles.phase} key={phase}><div className={styles.phaseHeading}><h3>{PHASE_LABELS[phase] ?? phase}</h3><span>{phaseChecks.filter(c => c.status === "PASS").length}/{phaseChecks.length} PASS</span></div>{phaseChecks.map(check => { const action = actionFor(scenario, check); return <div className={styles.checkRow} key={check.id}><div className={styles.checkText}><strong>{check.label}</strong><small>{check.checkKey}{check.notes ? ` · ${check.notes}` : ""}</small></div>{action && <Link className={styles.actionLink} href={action.href}>{action.label}</Link>}<select className={styles.select} aria-label={`Résultat : ${check.label}`} value={check.status} disabled={Boolean(run.completedAt) || busy === check.id} onChange={event => void update(scenario, run, check, event.target.value as CheckStatus)}>{(Object.keys(STATUS_LABELS) as CheckStatus[]).map(status => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select><input className={styles.input} aria-label={`Note : ${check.label}`} placeholder="Preuve ou réserve concise" disabled={Boolean(run.completedAt)} value={notes[check.id] ?? check.notes ?? ""} onChange={event => setNotes(current => ({ ...current, [check.id]: event.target.value }))} onBlur={() => { if ((notes[check.id] ?? "") !== (check.notes ?? "")) void update(scenario, run, check, check.status); }} /><span className={styles.status}>{STATUS_LABELS[check.status]}</span></div>; })}</section>)}
    </>}
  </section>;
}
