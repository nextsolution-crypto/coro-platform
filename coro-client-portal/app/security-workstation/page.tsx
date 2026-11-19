/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ApiError,
  apiDownload,
  apiGet,
  apiPost,
  getUser,
} from "../store/auth";
import PortalLayout from "../components/PortalLayout";
import styles from "./security-workstation.module.css";

type Capability = { feature: string; available: boolean; reason: string };
type Building = { id: string; name: string };
type Item = Record<string, any>;
type Tab = "overview" | "log" | "shifts" | "directives" | "followups" | "reports";

const FEATURES: Record<Exclude<Tab, "overview">, string> = {
  log: "OPERATIONAL_LOG",
  shifts: "OPERATIONAL_SHIFTS",
  directives: "OPERATIONAL_DIRECTIVES",
  followups: "OPERATIONAL_FOLLOWUPS",
  reports: "INCIDENT_REPORTS",
};

const labels: Record<Tab, string> = {
  overview: "Vue d’ensemble",
  log: "Main courante",
  shifts: "Quarts et relève",
  directives: "Consignes",
  followups: "Suivis",
  reports: "Rapports",
};

const asItems = (value: any): Item[] =>
  Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
const isCanonicalUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const uuid = () => crypto.randomUUID();
const formatDate = (value?: string) =>
  value ? new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Une erreur est survenue.";

export default function SecurityWorkstationPage() {
  const user = getUser();
  const organizationId = user?.organizationId ?? "";
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [items, setItems] = useState<Item[]>([]);
  const [templates, setTemplates] = useState<Item[]>([]);
  const [reviewers, setReviewers] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Exclude<Tab, "overview"> | null>(null);
  const [query, setQuery] = useState("");

  const enabled = useMemo(
    () => new Set(capabilities.filter((item) => item.available).map((item) => item.feature)),
    [capabilities],
  );
  const selectedBuilding = buildings.find((building) => building.id === buildingId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void apiGet("/client-portal/buildings")
      .then(async (value) => {
        const next = (asItems(value).length ? asItems(value) : value) as Building[];
        const evaluated = await Promise.all(
          next.map(async (building) => {
            try {
              const decision = await apiGet(
                `/client-portal/organizations/${organizationId}/operational-capabilities?buildingId=${building.id}`,
              );
              return {
                building,
                capabilities: (decision.capabilities ?? []) as Capability[],
              };
            } catch {
              return { building, capabilities: [] as Capability[] };
            }
          }),
        );
        if (!active) return;
        setBuildings(next);
        const preferred = evaluated.find(({ capabilities: available }) =>
          available.some((capability) => capability.available),
        );
        setCapabilities(preferred?.capabilities ?? []);
        setBuildingId(preferred?.building.id ?? "");
        if (next.length > 0 && !preferred) {
          setError(
            "Aucun bâtiment accessible ne dispose actuellement d’un module opérationnel autorisé.",
          );
        }
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !buildingId) return;
    setLoading(true);
    setError("");
    void apiGet(
      `/client-portal/organizations/${organizationId}/operational-capabilities?buildingId=${buildingId}`,
    )
      .then((value) => setCapabilities(value.capabilities ?? []))
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, [buildingId, organizationId]);

  const endpoint = useCallback(
    (active: Tab) => {
      const base = `/client-portal/organizations/${organizationId}`;
      const suffix = `buildingId=${buildingId}`;
      if (active === "log") return `${base}/operational-log/entries?${suffix}&page=1&pageSize=50${query ? `&q=${encodeURIComponent(query)}` : ""}`;
      if (active === "shifts") return `${base}/operational-shifts?${suffix}&limit=50`;
      if (active === "directives") return `${base}/operations/directives?${suffix}&limit=50`;
      if (active === "followups") return `${base}/operations/follow-ups?${suffix}&limit=50`;
      if (active === "reports") return `${base}/incident-reports?${suffix}&page=1&pageSize=50${query ? `&q=${encodeURIComponent(query)}` : ""}`;
      return "";
    },
    [buildingId, organizationId, query],
  );

  const refresh = useCallback(async () => {
    if (tab === "overview" || !buildingId) return;
    if (tab === "reports" && !isCanonicalUuid(buildingId)) {
      setItems([]);
      setTemplates([]);
      setReviewers([]);
      setError("Les rapports ne sont pas disponibles pour cet ancien identifiant de bâtiment. Sélectionnez un bâtiment CORO compatible.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const value = await apiGet(endpoint(tab));
      setItems(asItems(value));
      if (tab === "reports") {
        const [templateResult, reviewerResult] = await Promise.allSettled([
          apiGet(
            `/client-portal/organizations/${organizationId}/incident-reports/forms/templates?buildingId=${buildingId}`,
          ),
          apiGet(
            `/client-portal/organizations/${organizationId}/incident-reports/reviewers/eligible?buildingId=${buildingId}`,
          ),
        ]);
        setTemplates(templateResult.status === "fulfilled" ? asItems(templateResult.value) : []);
        setReviewers(reviewerResult.status === "fulfilled" ? asItems(reviewerResult.value) : []);
        if (templateResult.status === "rejected") {
          setError(`Les rapports sont accessibles, mais les formulaires n’ont pas pu être chargés. ${errorMessage(templateResult.reason)}`);
        } else if (reviewerResult.status === "rejected") {
          setError(`Les rapports sont accessibles, mais la liste des réviseurs n’a pas pu être chargée. ${errorMessage(reviewerResult.reason)}`);
        }
      }
    } catch (reason) {
      setError(errorMessage(reason));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId, endpoint, organizationId, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function mutate(action: () => Promise<any>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setDialog(null);
      await refresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setItems([]);
    setError("");
    setNotice("");
  };

  if (loading && buildings.length === 0) return <PortalLayout><Loading /></PortalLayout>;

  return (
    <PortalLayout><main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>CORO REPORT · OPÉRATIONS</p>
          <h1>Poste de sécurité</h1>
          <p>Le registre opérationnel et les rapports gouvernés de votre bâtiment.</p>
        </div>
        <label className={styles.buildingPicker}>
          <span>Bâtiment actif</span>
          <select value={buildingId} onChange={(event) => { setTab("overview"); setItems([]); setTemplates([]); setReviewers([]); setBuildingId(event.target.value); }}>
            {buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
          </select>
        </label>
      </header>

      {error && <div className={styles.error} role="alert"><AlertTriangle size={18} />{error}<button onClick={() => void refresh()}>Réessayer</button></div>}
      {notice && <div className={styles.notice} role="status"><CheckCircle2 size={18} />{notice}</div>}

      <nav className={styles.tabs} aria-label="Poste de sécurité">
        {(Object.keys(labels) as Tab[]).map((key) => {
          const available = key === "overview" || enabled.has(FEATURES[key]);
          if (!available) return null;
          return <button key={key} className={tab === key ? styles.activeTab : ""} onClick={() => switchTab(key)}>{labels[key]}</button>;
        })}
      </nav>

      {tab === "overview" ? (
        <Overview capabilities={capabilities} onOpen={switchTab} buildingName={selectedBuilding?.name} />
      ) : (
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div><h2>{labels[tab]}</h2><p>{items.length} élément{items.length === 1 ? "" : "s"}</p></div>
            <div className={styles.actions}>
              {(tab === "log" || tab === "reports") && <input aria-label="Rechercher" placeholder="Rechercher…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void refresh()} />}
              <button className={styles.secondary} onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} />Actualiser</button>
              <button className={styles.primary} onClick={() => setDialog(tab)}><Plus size={16} />{tab === "log" ? "Nouvelle entrée" : tab === "reports" ? "Nouveau rapport" : tab === "shifts" ? "Nouveau quart" : tab === "directives" ? "Nouvelle consigne" : "Nouveau suivi"}</button>
            </div>
          </div>
          {loading ? <Loading /> : <ItemList tab={tab} items={items} organizationId={organizationId} reviewers={reviewers} mutate={mutate} />}
        </section>
      )}

      {dialog && <CreateDialog kind={dialog} buildingId={buildingId} organizationId={organizationId} templates={templates} busy={busy} onClose={() => setDialog(null)} mutate={mutate} />}
    </main></PortalLayout>
  );
}

function Overview({ capabilities, onOpen, buildingName }: { capabilities: Capability[]; onOpen: (tab: Tab) => void; buildingName?: string }) {
  const cards: Array<[Exclude<Tab, "overview">, typeof ClipboardList, string]> = [
    ["log", ClipboardList, "Consigner et retrouver les événements"],
    ["shifts", Users, "Ouvrir un quart et préparer la relève"],
    ["directives", BookOpenCheck, "Consulter et confirmer les consignes"],
    ["followups", CheckCircle2, "Assigner et fermer les suivis"],
    ["reports", FileText, "Créer, approuver et exporter les rapports"],
  ];
  const available = new Set(capabilities.filter((item) => item.available).map((item) => item.feature));
  return <section><div className={styles.context}><ShieldCheck size={20} /><span>Périmètre actif : <strong>{buildingName ?? "Bâtiment"}</strong>. Chaque action est revérifiée par le serveur.</span></div><div className={styles.grid}>{cards.map(([key, Icon, description]) => { const allowed = available.has(FEATURES[key]); return <button key={key} className={styles.card} disabled={!allowed} onClick={() => onOpen(key)}><Icon size={24} /><span><strong>{labels[key]}</strong><small>{allowed ? description : "Non disponible pour ce profil et ce bâtiment"}</small></span></button>; })}</div></section>;
}

function ItemList({ tab, items, organizationId, reviewers, mutate }: { tab: Exclude<Tab, "overview">; items: Item[]; organizationId: string; reviewers: Item[]; mutate: (action: () => Promise<any>, success: string) => Promise<void> }) {
  if (!items.length) return <div className={styles.empty}><ClipboardList size={30} /><h3>Aucun élément</h3><p>Utilisez l’action principale pour commencer. Aucun contenu de démonstration statique n’est affiché.</p></div>;
  return <div className={styles.list}>{items.map((item) => <article className={styles.row} key={item.id}><div><div className={styles.rowTitle}>{item.title ?? item.description ?? item.activityType ?? item.securityPost ?? item.reportNumber ?? "Élément opérationnel"}</div><div className={styles.meta}><span>{item.status ?? item.priority ?? "ACTIF"}</span><span>{formatDate(item.eventAt ?? item.updatedAt ?? item.createdAt ?? item.plannedStartAt)}</span>{item.createdByDisplayName && <span>{item.createdByDisplayName}</span>}</div></div><RowActions tab={tab} item={item} organizationId={organizationId} reviewers={reviewers} mutate={mutate} /></article>)}</div>;
}

function RowActions({ tab, item, organizationId, reviewers, mutate }: { tab: Exclude<Tab, "overview">; item: Item; organizationId: string; reviewers: Item[]; mutate: (action: () => Promise<any>, success: string) => Promise<void> }) {
  const base = `/client-portal/organizations/${organizationId}`;
  if (tab === "shifts") return <div className={styles.rowActions}>{item.status === "PLANNED" && <button onClick={() => void mutate(() => apiPost(`${base}/operational-shifts/${item.id}/open`, { lockVersion: item.lockVersion, idempotencyKey: uuid() }), "Quart ouvert.")}>Ouvrir</button>}{item.status === "OPEN" && <button onClick={() => void mutate(() => apiPost(`${base}/operational-shifts/${item.id}/handover`, { lockVersion: item.lockVersion, idempotencyKey: uuid(), snapshot: { preparedFromPortal: true } }), "Relève préparée.")}>Préparer la relève</button>}</div>;
  if (tab === "directives") return <div className={styles.rowActions}>{item.status === "PUBLISHED" && item.currentVersionId && <button onClick={() => void mutate(() => apiPost(`${base}/operations/directives/${item.id}/acknowledge`, { versionId: item.currentVersionId, idempotencyKey: uuid() }), "Consigne confirmée.")}>Confirmer</button>}</div>;
  if (tab === "followups") return <div className={styles.rowActions}>{item.status === "OPEN" && <button onClick={() => void mutate(() => apiPost(`${base}/operations/follow-ups/${item.id}/start`, { lockVersion: item.lockVersion, idempotencyKey: uuid() }), "Suivi démarré.")}>Démarrer</button>}{item.status === "IN_PROGRESS" && <button onClick={() => void mutate(() => apiPost(`${base}/operations/follow-ups/${item.id}/complete`, { lockVersion: item.lockVersion, idempotencyKey: uuid(), evidence: { confirmedInPortal: true } }), "Suivi complété.")}>Compléter</button>}</div>;
  if (tab === "reports") return <ReportActions item={item} base={base} reviewers={reviewers} mutate={mutate} />;
  return null;
}

function ReportActions({ item, base, reviewers, mutate }: { item: Item; base: string; reviewers: Item[]; mutate: (action: () => Promise<any>, success: string) => Promise<void> }) {
  const [reviewerId, setReviewerId] = useState(reviewers[0]?.id ?? "");
  const versionId = item.versions?.[0]?.id;
  const decide = (decision: string, success: string) => mutate(() => apiPost(`${base}/incident-reports/${item.id}/decisions`, { decision, expectedLockVersion: item.lockVersion, idempotencyKey: uuid() }), success);
  return <div className={styles.rowActions}>
    {item.status === "DRAFT" && <><AttachmentButton item={item} versionId={versionId} base={base} mutate={mutate} /><button onClick={() => void mutate(() => apiPost(`${base}/incident-reports/${item.id}/submit`, { expectedLockVersion: item.lockVersion, idempotencyKey: uuid() }), "Rapport soumis.")}>Soumettre</button></>}
    {item.status === "SUBMITTED" && <><select aria-label="Réviseur" value={reviewerId} onChange={(event) => setReviewerId(event.target.value)}><option value="">Choisir le réviseur</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.firstName} {reviewer.lastName}</option>)}</select><button disabled={!reviewerId} onClick={() => void mutate(() => apiPost(`${base}/incident-reports/${item.id}/reviewer`, { reviewerClientUserId: reviewerId, expectedLockVersion: item.lockVersion, idempotencyKey: uuid() }), "Réviseur affecté.")}>Affecter</button></>}
    {item.status === "IN_REVIEW" && <><button onClick={() => void decide("REVIEWED", "Révision enregistrée.")}>Réviser</button><button onClick={() => void decide("CORRECTION_REQUESTED", "Corrections demandées.")}>Demander correction</button><button onClick={() => void decide("APPROVED", "Rapport approuvé.")}>Approuver</button></>}
    {item.status === "APPROVED" && <button onClick={() => void mutate(() => apiPost(`${base}/incident-reports/${item.id}/publish`, { expectedLockVersion: item.lockVersion, idempotencyKey: uuid() }), "Rapport publié.")}>Publier</button>}
    {(item.status === "APPROVED" || item.status === "PUBLISHED") && versionId && <button onClick={() => void mutate(async () => { const created = await apiPost(`${base}/incident-reports/${item.id}/exports`, { reportVersionId: versionId, pageFormat: "LETTER", locale: "fr-CA", idempotencyKey: uuid() }); const file = await apiDownload(`${base}/incident-reports/${item.id}/exports/${created.id}/download`); const url = URL.createObjectURL(file.blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.filename; anchor.click(); URL.revokeObjectURL(url); }, "PDF généré et téléchargé.")}>PDF</button>}
  </div>;
}

function AttachmentButton({ item, versionId, base, mutate }: { item: Item; versionId?: string; base: string; mutate: (action: () => Promise<any>, success: string) => Promise<void> }) {
  const upload = async (file?: File) => {
    if (!file || !versionId) return;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(file);
    });
    await mutate(() => apiPost(`${base}/incident-reports/${item.id}/attachments`, { reportVersionId: versionId, originalFileName: file.name, mediaType: file.type, fileBase64: data, idempotencyKey: uuid() }), "Pièce jointe téléversée et soumise à l’analyse antivirus.");
  };
  return <label className={styles.fileButton} aria-disabled={!versionId}>Pièce jointe<input disabled={!versionId} type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => void upload(event.target.files?.[0])} /></label>;
}

function CreateDialog({ kind, buildingId, organizationId, templates, busy, onClose, mutate }: { kind: Exclude<Tab, "overview">; buildingId: string; organizationId: string; templates: Item[]; busy: boolean; onClose: () => void; mutate: (action: () => Promise<any>, success: string) => Promise<void> }) {
  const eligibleTemplates = templates.filter((item) => item.retentionPolicyId && item.formSchema?.sections?.length);
  const firstTemplate = eligibleTemplates[0];
  const [form, setForm] = useState<Record<string, any>>({ priority: "NORMAL", templateVersionId: firstTemplate?.id ?? "", content: {} });
  const [formError, setFormError] = useState("");
  const update = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const selectedTemplate = templates.find((item) => item.id === form.templateVersionId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const base = `/client-portal/organizations/${organizationId}`;
    if (kind === "log") return mutate(() => apiPost(`${base}/operational-log/entries`, { buildingId, eventAt: new Date().toISOString(), activityType: form.activityType, category: form.category, priority: form.priority, description: form.description, followUpRequired: false, idempotencyKey: uuid() }), "Entrée ajoutée à la main courante.");
    if (kind === "shifts") { const now = Date.now(); return mutate(() => apiPost(`${base}/operational-shifts`, { buildingId, securityPost: form.securityPost, teamName: form.teamName || undefined, responsibleUserId: form.responsibleUserId, plannedStartAt: new Date(now).toISOString(), plannedEndAt: new Date(now + 8 * 3600000).toISOString(), participants: [], idempotencyKey: uuid() }), "Quart créé."); }
    if (kind === "directives") return mutate(() => apiPost(`${base}/operations/directives`, { buildingId, title: form.title, description: form.description, type: "OPERATIONAL_NOTICE", priority: form.priority, targetCriteria: { buildingId }, acknowledgementRequired: true, idempotencyKey: uuid() }), "Consigne créée.");
    if (kind === "followups") return mutate(() => apiPost(`${base}/operations/follow-ups`, { buildingId, sourceType: "OBSERVATION", sourceId: form.sourceId || uuid(), description: form.description, priority: form.priority, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined, idempotencyKey: uuid() }), "Suivi créé.");
    const template = selectedTemplate;
    if (!template) {
      setFormError("Sélectionnez un formulaire publié avec une politique de conservation active.");
      return;
    }
    return mutate(() => apiPost(`${base}/incident-reports`, { buildingId, templateVersionId: template.id, retentionPolicyId: template.retentionPolicyId, reportType: template.reportType, title: form.title, content: form.content, idempotencyKey: uuid() }), "Brouillon de rapport créé.");
  }
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className={styles.dialog} onSubmit={(event) => void submit(event)}>
        <header><div><p className={styles.eyebrow}>Nouvel élément</p><h2>{labels[kind]}</h2></div><button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">×</button></header>
        {kind === "reports" && <>
          {eligibleTemplates.length === 0 ? (
            <div className={styles.emptyForm} role="status"><FileText size={24} /><strong>Aucun formulaire de rapport disponible</strong><p>Aucun formulaire publié ne possède une politique de conservation active.</p></div>
          ) : <>
            <Field label="Formulaire"><select required value={form.templateVersionId} onChange={(event) => { setFormError(""); update("templateVersionId", event.target.value); }}><option value="">Sélectionner</option>{eligibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
            <Field label="Titre du rapport"><input required maxLength={240} onChange={(event) => update("title", event.target.value)} /></Field>
            {selectedTemplate && <ReportFields schema={selectedTemplate.formSchema} content={form.content} onChange={(content) => update("content", content)} />}
          </>}
          {formError && <p className={styles.formError} role="alert">{formError}</p>}
        </>}
        {kind === "shifts" ? <><Field label="Poste"><input required maxLength={120} onChange={(event) => update("securityPost", event.target.value)} /></Field><Field label="Identifiant du responsable"><input required type="text" onChange={(event) => update("responsibleUserId", event.target.value)} /></Field><Field label="Équipe"><input maxLength={120} onChange={(event) => update("teamName", event.target.value)} /></Field></> : kind !== "reports" && <><Field label={kind === "log" ? "Type d’activité" : kind === "followups" ? "Description" : "Titre"}><input required maxLength={kind === "log" ? 80 : 200} onChange={(event) => update(kind === "log" ? "activityType" : kind === "followups" ? "description" : "title", event.target.value)} /></Field>{kind === "log" && <Field label="Catégorie"><input required maxLength={80} onChange={(event) => update("category", event.target.value)} /></Field>}{kind !== "followups" && <Field label="Description"><textarea required rows={5} onChange={(event) => update("description", event.target.value)} /></Field>}</>}
        {kind !== "reports" && kind !== "shifts" && <Field label="Priorité"><select value={form.priority} onChange={(event) => update("priority", event.target.value)}><option>NORMAL</option><option>IMPORTANT</option><option>CRITICAL</option>{kind === "log" && <><option>LOW</option><option>HIGH</option></>}</select></Field>}
        <footer><button type="button" className={styles.secondary} onClick={onClose}>Annuler</button><button className={styles.primary} disabled={busy || (kind === "reports" && eligibleTemplates.length === 0)}>{busy && <Loader2 className={styles.spin} size={16} />}Créer</button></footer>
      </form>
    </div>
  );
}

function ReportFields({ schema, content, onChange }: { schema?: Item; content: Item; onChange: (value: Item) => void }) {
  if (!schema?.sections) return <p className={styles.help}>Le formulaire sélectionné ne contient aucun champ utilisable.</p>;
  const visible = (field: Item) => {
    const condition = field.visibleWhen;
    if (!condition) return true;
    const actual = content[condition.fieldKey];
    if (condition.operator === "PRESENT") return actual !== undefined && actual !== "";
    if (condition.operator === "EQ") return actual === condition.value;
    if (condition.operator === "NEQ") return actual !== condition.value;
    return Array.isArray(condition.value) && condition.value.includes(actual);
  };
  const change = (key: string, value: any) => onChange({ ...content, [key]: value });
  return <div className={styles.reportForm}>{schema.sections.map((section: Item) => <fieldset key={section.key}><legend>{section.title}</legend>{(section.fields ?? []).filter(visible).map((field: Item) => field.type === "REPEATABLE_SECTION" ? <RepeatableField key={field.key} field={field} value={content[field.key] ?? []} onChange={(value) => change(field.key, value)} /> : <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`}>{field.type === "LONG_TEXT" ? <textarea required={field.required} rows={4} value={content[field.key] ?? ""} onChange={(event) => change(field.key, event.target.value)} /> : field.type === "SELECT" || field.type === "RADIO" ? <select required={field.required} value={content[field.key] ?? ""} onChange={(event) => change(field.key, event.target.value)}><option value="">Sélectionner</option>{(field.options ?? []).map((option: Item) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "CHECKBOX" ? <input type="checkbox" checked={content[field.key] === true} onChange={(event) => change(field.key, event.target.checked)} /> : <input required={field.required} type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : field.type === "TIME" ? "time" : field.type === "DATETIME" ? "datetime-local" : "text"} value={content[field.key] ?? ""} onChange={(event) => change(field.key, field.type === "NUMBER" ? Number(event.target.value) : event.target.value)} />}</Field>)}</fieldset>)}</div>;
}

function RepeatableField({ field, value, onChange }: { field: Item; value: Item[]; onChange: (value: Item[]) => void }) {
  return <div className={styles.repeatable}><div className={styles.repeatableTitle}><strong>{field.label}</strong><button type="button" className={styles.secondary} onClick={() => onChange([...value, {}])} disabled={value.length >= (field.maxItems ?? 100)}><Plus size={14} />Ajouter</button></div>{value.map((item, index) => <div className={styles.repeatableRow} key={index}>{(field.children ?? []).map((child: Item) => <Field key={child.key} label={`${child.label}${child.required ? " *" : ""}`}><input required={child.required} value={item[child.key] ?? ""} onChange={(event) => onChange(value.map((row, rowIndex) => rowIndex === index ? { ...row, [child.key]: event.target.value } : row))} /></Field>)}<button type="button" className={styles.remove} onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}>Retirer</button></div>)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
function Loading() { return <div className={styles.loading}><Loader2 className={styles.spin} size={24} />Chargement sécurisé…</div>; }
