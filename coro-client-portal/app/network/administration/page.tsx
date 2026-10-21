"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import PortalLayout from "../../components/PortalLayout";
import { apiGet, apiPost } from "../../store/auth";
import styles from "./network-administration.module.css";

type Scope = "PORTFOLIO" | "REGION" | "BUILDING";
type Permission = "NETWORK_SUPERVISION_READ" | "NETWORK_HIERARCHY_MANAGE" | "NETWORK_ASSIGNMENT_MANAGE";
type Option = { id: string; name: string };
type Person = { id: string; firstName: string; lastName: string; email: string; role: string };
type Assignment = {
  id: string; clientUserId?: string | null; scope: Scope; portfolioId?: string | null;
  regionId?: string | null; buildingId?: string | null; permissions: Permission[];
  status: "ACTIVE" | "REVOKED"; effectiveFrom: string; effectiveUntil?: string | null; lockVersion: number;
};
type AuditEvent = { id: string; actorDisplayName: string; action: string; reason?: string | null; createdAt: string };
type Context = { users: Person[]; portfolios: Option[]; regions: Option[]; buildings: Option[]; assignments: Assignment[]; auditEvents: AuditEvent[] };

const permissionLabels: Record<Permission, string> = {
  NETWORK_SUPERVISION_READ: "Consulter la supervision",
  NETWORK_HIERARCHY_MANAGE: "Gérer la hiérarchie",
  NETWORK_ASSIGNMENT_MANAGE: "Gérer les délégations",
};

export default function NetworkAdministrationPage() {
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ clientUserId: "", scope: "BUILDING" as Scope, targetId: "", permissions: ["NETWORK_SUPERVISION_READ"] as Permission[], effectiveUntil: "", reason: "" });
  const [successorByAssignment, setSuccessorByAssignment] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setContext(await apiGet("/client-portal/network/management-context") as Context); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Gestion Network indisponible."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const targets = useMemo(() => form.scope === "PORTFOLIO" ? context?.portfolios : form.scope === "REGION" ? context?.regions : context?.buildings, [context, form.scope]);
  const person = (id?: string | null) => context?.users.find((user) => user.id === id);
  const targetName = (assignment: Assignment) => {
    const source = assignment.scope === "PORTFOLIO" ? context?.portfolios : assignment.scope === "REGION" ? context?.regions : context?.buildings;
    const id = assignment.portfolioId ?? assignment.regionId ?? assignment.buildingId;
    return source?.find((option) => option.id === id)?.name ?? "Périmètre indisponible";
  };

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await apiPost("/client-portal/network/assignments", {
        subjectType: "CLIENT_USER", clientUserId: form.clientUserId, scope: form.scope,
        portfolioId: form.scope === "PORTFOLIO" ? form.targetId : undefined,
        regionId: form.scope === "REGION" ? form.targetId : undefined,
        buildingId: form.scope === "BUILDING" ? form.targetId : undefined,
        permissions: form.permissions, effectiveUntil: form.effectiveUntil || undefined, reason: form.reason,
      });
      setNotice("Délégation créée et auditée."); setForm((value) => ({ ...value, targetId: "", reason: "" })); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Création impossible."); }
    finally { setBusy(false); }
  }

  async function revoke(assignment: Assignment) {
    const reason = window.prompt("Justification de la révocation (10 caractères minimum)");
    if (!reason) return;
    setBusy(true); setError("");
    try { await apiPost(`/client-portal/network/assignments/${assignment.id}/revoke`, { lockVersion: assignment.lockVersion, reason }); setNotice("Délégation révoquée."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Révocation impossible."); }
    finally { setBusy(false); }
  }

  async function succeed(assignment: Assignment) {
    const successorClientUserId = successorByAssignment[assignment.id];
    if (!successorClientUserId) { setError("Sélectionnez un successeur."); return; }
    const reason = window.prompt("Justification de la succession (10 caractères minimum)");
    if (!reason) return;
    setBusy(true); setError("");
    try {
      await apiPost(`/client-portal/network/assignments/${assignment.id}/succeed`, { successorClientUserId, effectiveFrom: new Date().toISOString(), lockVersion: assignment.lockVersion, reason });
      setNotice("Succession enregistrée de façon transactionnelle."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Succession impossible."); }
    finally { setBusy(false); }
  }

  return <PortalLayout><main className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>CORO Network</p><h1>Délégations et succession</h1><p>Attribuez uniquement les responsabilités comprises dans votre propre périmètre.</p></div><Link href="/network">Retour à la supervision</Link></header>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    {context && <><section className={styles.panel}><h2>Nouvelle délégation</h2><form className={styles.form} onSubmit={submit}>
      <label>Destinataire<select required value={form.clientUserId} onChange={(e) => setForm({ ...form, clientUserId: e.target.value })}><option value="">Sélectionner</option>{context?.users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} — {user.email}</option>)}</select></label>
      <label>Portée<select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Scope, targetId: "" })}><option value="BUILDING">Bâtiment</option><option value="REGION">Région</option><option value="PORTFOLIO">Portefeuille</option></select></label>
      <label>Périmètre<select required value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })}><option value="">Sélectionner</option>{targets?.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label>
      <fieldset><legend>Permissions</legend>{(Object.keys(permissionLabels) as Permission[]).map((permission) => <label className={styles.check} key={permission}><input type="checkbox" checked={form.permissions.includes(permission)} onChange={(e) => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, permission] : form.permissions.filter((item) => item !== permission) })}/>{permissionLabels[permission]}</label>)}</fieldset>
      <label>Expiration facultative<input type="datetime-local" value={form.effectiveUntil} onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value ? new Date(e.target.value).toISOString() : "" })}/></label>
      <label className={styles.full}>Justification<textarea required minLength={10} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}/></label>
      <button disabled={busy || form.permissions.length === 0} type="submit">Créer la délégation</button>
    </form></section>
    <section className={styles.panel}><h2>Affectations</h2><div className={styles.cards}>{context?.assignments.map((assignment) => { const user = person(assignment.clientUserId); return <article key={assignment.id} className={styles.card} data-status={assignment.status}><div><strong>{user ? `${user.firstName} ${user.lastName}` : "Identité interne ou opérateur"}</strong><span>{assignment.scope} · {targetName(assignment)}</span></div><ul>{assignment.permissions.map((permission) => <li key={permission}>{permissionLabels[permission]}</li>)}</ul><p>{assignment.status === "ACTIVE" ? "Active" : "Révoquée"}{assignment.effectiveUntil ? ` · expire ${new Date(assignment.effectiveUntil).toLocaleString("fr-CA")}` : ""}</p>{assignment.status === "ACTIVE" && <div className={styles.actions}><select aria-label="Successeur" value={successorByAssignment[assignment.id] ?? ""} onChange={(e) => setSuccessorByAssignment({ ...successorByAssignment, [assignment.id]: e.target.value })}><option value="">Choisir un successeur</option>{context.users.filter((item) => item.id !== assignment.clientUserId).map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select><button disabled={busy} onClick={() => void succeed(assignment)}>Transférer</button><button className={styles.danger} disabled={busy} onClick={() => void revoke(assignment)}>Révoquer</button></div>}</article>; })}</div></section>
    <section className={styles.panel}><h2>Historique d’audit</h2><div className={styles.audit}>{context.auditEvents.map((event) => <article key={event.id}><strong>{event.action}</strong><span>{event.actorDisplayName} · {new Date(event.createdAt).toLocaleString("fr-CA")}</span>{event.reason && <p>{event.reason}</p>}</article>)}</div></section></>}
  </main></PortalLayout>;
}
