"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import styles from "./display.module.css";

type Command = { id: string; type: string; priority: string; status: string; sequence: number; createdAt: string; statusSummary: Record<string, number> };

export default function EmergencyOperations({ organizationId, buildings, capabilities }: { organizationId: string; buildings: { id: string; name: string }[]; capabilities: Record<string, boolean> }) {
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? "");
  const [commands, setCommands] = useState<Command[]>([]);
  const [mode, setMode] = useState<"ENTER_EXERCISE" | "ENTER_EMERGENCY" | "REQUEST_CLEAR">("ENTER_EXERCISE");
  const [incidentId, setIncidentId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!buildingId) return;
    try {
      const response = await api.get<{ commands: Command[] }>(`/organizations/${organizationId}/buildings/${buildingId}/display-operations/supervision`);
      setCommands(response.data.commands);
      setError("");
    } catch (candidate: unknown) {
      const e = candidate as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "Supervision opérationnelle indisponible.");
    }
  }, [buildingId, organizationId]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  const submit = async () => {
    if (!reason.trim()) return setError("Une justification opérationnelle est obligatoire.");
    if (mode !== "ENTER_EXERCISE" && !incidentId.trim()) return setError("Un incident CORO actif est obligatoire pour une urgence réelle ou une sortie.");
    if (mode === "ENTER_EMERGENCY" && !window.confirm("Confirmer la création d’une commande d’urgence réelle? Aucun succès physique ne sera présumé.")) return;
    setBusy(true); setError("");
    try {
      const exercise = mode === "ENTER_EXERCISE";
      await api.post(`/organizations/${organizationId}/buildings/${buildingId}/display-operations/commands`, {
        idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID(), incidentEventId: incidentId.trim() || undefined,
        source: "MANUAL", severity: mode === "ENTER_EMERGENCY" ? "CRITICAL" : "INFORMATION", commandType: mode,
        eventType: exercise ? "EXERCISE" : mode === "REQUEST_CLEAR" ? "RETURN_TO_NORMAL_REQUEST" : "EVACUATION",
        exercise, occurredAt: new Date().toISOString(), zoneIds: [], deviceIds: [],
        payload: { interface: "DISPLAY_MANAGER", exercise }, reason: reason.trim(),
      });
      setReason(""); await load();
    } catch (candidate: unknown) {
      const e = candidate as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "Commande refusée; aucune réussite n’est présumée.");
    } finally { setBusy(false); }
  };
  const allowed = mode === "REQUEST_CLEAR" ? capabilities.DISPLAY_EMERGENCY_RESET : capabilities.DISPLAY_EMERGENCY_ACTIVATE;
  return <section className={styles.emergencyPanel} aria-labelledby="display-operations-title">
    <div className={styles.heading}><div><span className={styles.emergencyEyebrow}>Orchestration gouvernée</span><h2 id="display-operations-title">Commandes d’urgence Display</h2><p>« Envoyée », « reçue » et « appliquée » sont distinctes. Une déclaration du Player n’est pas une observation physique.</p></div><button onClick={() => void load()} disabled={busy}>Actualiser</button></div>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.emergencyControls}>
      <label>Bâtiment<select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>{buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label>
      <label>Action<select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="ENTER_EXERCISE">Démarrer un exercice</option><option value="ENTER_EMERGENCY">Entrer en mode urgence</option><option value="REQUEST_CLEAR">Demander une sortie gouvernée</option></select></label>
      <label>Incident CORO<input value={incidentId} onChange={(e) => setIncidentId(e.target.value)} placeholder="Requis hors exercice" /></label>
      <label className={styles.wideControl}>Justification<textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></label>
      <button className={mode === "ENTER_EMERGENCY" ? styles.dangerButton : undefined} disabled={!allowed || busy || !buildingId} onClick={() => void submit()}>{busy ? "Traitement…" : "Créer la commande gouvernée"}</button>
    </div>
    {!allowed && <p className={styles.note}>Permission spécifique insuffisante pour l’action sélectionnée.</p>}
    <div className={styles.commandTable} role="region" aria-label="Historique des commandes" tabIndex={0}><table><thead><tr><th>Séquence</th><th>Commande</th><th>Priorité</th><th>Serveur</th><th>Livraisons</th><th>Créée</th></tr></thead><tbody>
      {commands.map((command) => <tr key={command.id}><td>{command.sequence}</td><td>{command.type}</td><td>{command.priority}</td><td>{command.status}</td><td>{Object.entries(command.statusSummary).filter(([, count]) => count > 0).map(([status, count]) => `${status}: ${count}`).join(" · ") || "Aucune"}</td><td>{new Date(command.createdAt).toLocaleString("fr-CA")}</td></tr>)}
      {!commands.length && <tr><td colSpan={6}>Aucune commande dans ce bâtiment.</td></tr>}
    </tbody></table></div>
  </section>;
}
