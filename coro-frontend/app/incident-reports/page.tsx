'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import styles from './reports.module.css';

type Field = { key: string; label: string; type: string; required?: boolean; options?: { value: string; label: string }[]; visibleWhen?: { fieldKey: string; operator: string; value?: unknown }; children?: Field[] };
type Template = { id: string; name: string; reportType: string; formSchema: { sections: { key: string; title: string; fields: Field[] }[] }; retentionPolicyId?: string };
type Report = { id: string; reportNumber: string; title: string; status: string; lockVersion: number; updatedAt: string };
const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return fallback;
  const response = (error as { response?: { data?: { message?: unknown } } }).response;
  return typeof response?.data?.message === 'string' ? response.data.message : fallback;
};

const visible = (field: Field, values: Record<string, unknown>) => {
  const condition = field.visibleWhen; if (!condition) return true;
  const current = values[condition.fieldKey];
  return condition.operator === 'PRESENT' ? current !== undefined && current !== '' : condition.operator === 'NEQ' ? current !== condition.value : current === condition.value;
};

function DynamicField({ field, values, setValues }: { field: Field; values: Record<string, unknown>; setValues: (value: Record<string, unknown>) => void }) {
  if (!visible(field, values)) return null;
  const value = values[field.key] ?? '';
  const update = (next: unknown) => setValues({ ...values, [field.key]: next });
  if (field.type === 'LONG_TEXT') return <label>{field.label}{field.required && ' *'}<textarea value={String(value)} onChange={event => update(event.target.value)} required={field.required}/></label>;
  if (field.type === 'CHECKBOX') return <label className={styles.check}><input type="checkbox" checked={Boolean(value)} onChange={event => update(event.target.checked)}/>{field.label}</label>;
  if (field.type === 'SELECT' || field.type === 'RADIO') return <label>{field.label}{field.required && ' *'}<select value={String(value)} onChange={event => update(event.target.value)} required={field.required}><option value="">Sélectionner</option>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  if (field.type === 'REPEATABLE_SECTION') {
    const rows = Array.isArray(value) ? value as Record<string, unknown>[] : [];
    return <fieldset><legend>{field.label}</legend>{rows.map((row, index) => <div className={styles.repeat} key={index}>{field.children?.map(child => <DynamicField key={child.key} field={child} values={row} setValues={next => update(rows.map((item, itemIndex) => itemIndex === index ? next : item))}/>) }<button type="button" className={styles.secondary} onClick={() => update(rows.filter((_, itemIndex) => itemIndex !== index))}>Retirer</button></div>)}<button type="button" className={styles.secondary} onClick={() => update([...rows, {}])}>Ajouter</button></fieldset>;
  }
  const inputType = field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : field.type === 'TIME' ? 'time' : field.type === 'DATETIME' ? 'datetime-local' : 'text';
  return <label>{field.label}{field.required && ' *'}<input type={inputType} value={String(value)} onChange={event => update(inputType === 'number' ? Number(event.target.value) : event.target.value)} required={field.required}/></label>;
}

export default function IncidentReportsPage() {
  const user = useAuthStore(state => state.user);
  const organizationId = user?.organizationId ?? '';
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [queue, setQueue] = useState<Report[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const template = useMemo(() => templates.find(item => item.id === templateId), [templates, templateId]);

  useEffect(() => { void api.get('/buildings').then(response => setBuildings(response.data)).catch(() => setMessage('Impossible de charger vos bâtiments autorisés.')); }, []);
  useEffect(() => { if (!organizationId || !buildingId) return; void Promise.all([api.get(`/organizations/${organizationId}/incident-reports/forms/templates`, { params: { buildingId } }), api.get(`/organizations/${organizationId}/incident-reports`, { params: { buildingId } }), api.get(`/organizations/${organizationId}/incident-reports/review/queue`, { params: { buildingId } })]).then(([templateResponse, reportResponse, queueResponse]) => { setTemplates(templateResponse.data); setReports(reportResponse.data.items); setQueue(queueResponse.data); setMessage(''); }).catch(error => setMessage(error.response?.data?.message ?? 'Accès aux rapports refusé.')); }, [organizationId, buildingId]);

  async function create(event: FormEvent) {
    event.preventDefault(); if (!template || !organizationId) return; setBusy(true); setMessage('');
    try {
      await api.post(`/organizations/${organizationId}/incident-reports`, { buildingId, templateVersionId: template.id, retentionPolicyId: template.retentionPolicyId, reportType: template.reportType, title, content: values, idempotencyKey: crypto.randomUUID() });
      setMessage('Brouillon enregistré.'); setValues({}); setTitle('');
      const response = await api.get(`/organizations/${organizationId}/incident-reports`, { params: { buildingId } }); setReports(response.data.items);
    } catch (error: unknown) { setMessage(errorMessage(error, 'Le brouillon n’a pas pu être enregistré.')); } finally { setBusy(false); }
  }

  async function decide(report: Report, decision: 'APPROVED' | 'CORRECTION_REQUESTED') {
    if (!organizationId) return; setBusy(true);
    try { await api.post(`/organizations/${organizationId}/incident-reports/${report.id}/decisions`, { decision, expectedLockVersion: report.lockVersion, idempotencyKey: crypto.randomUUID() }); setMessage(decision === 'APPROVED' ? 'Rapport approuvé.' : 'Corrections demandées.'); }
    catch (error: unknown) { setMessage(errorMessage(error, 'Décision refusée.')); } finally { setBusy(false); }
  }

  function attachment(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) setMessage('Le fichier dépasse 10 Mo.'); else setMessage(`Pièce prête : ${file.name}. Elle sera analysée avant son ajout au brouillon.`); }

  return <AppLayout><main className={styles.page}><header><span>CORO REPORT</span><h1>Rapports professionnels</h1><p>Rédigez rapidement, reprenez un brouillon et soumettez-le selon vos affectations.</p></header>{message && <p role="status" className={styles.message}>{message}</p>}
    <section className={styles.card}><h2>Nouveau rapport</h2><div className={styles.grid}><label>Bâtiment<select value={buildingId} onChange={event => setBuildingId(event.target.value)}><option value="">Sélectionner</option>{buildings.map(building => <option value={building.id} key={building.id}>{building.name}</option>)}</select></label><label>Type de rapport<select value={templateId} onChange={event => { setTemplateId(event.target.value); setValues({}); }} disabled={!buildingId}><option value="">Sélectionner</option>{templates.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>{template && <form onSubmit={create}><label>Titre *<input value={title} onChange={event => setTitle(event.target.value)} required/></label>{template.formSchema.sections.map(section => <section className={styles.formSection} key={section.key}><h3>{section.title}</h3><div className={styles.grid}>{section.fields.map(field => <DynamicField key={field.key} field={field} values={values} setValues={setValues}/>)}</div></section>)}<label>Photographies et pièces jointes<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={attachment}/></label><div className={styles.actions}><button disabled={busy}>Sauvegarder le brouillon</button><button type="button" className={styles.secondary}>Soumettre</button></div></form>}</section>
    <section className={styles.card}><h2>Mes rapports</h2>{!reports.length ? <p className={styles.empty}>Aucun rapport dans ce bâtiment.</p> : <div className={styles.list}>{reports.map(report => <article key={report.id}><div><strong>{report.title}</strong><small>{report.reportNumber} · {report.status}</small></div><button className={styles.secondary}>Reprendre</button></article>)}</div>}</section>
    <section className={styles.card}><h2>Révision et approbation</h2>{!queue.length ? <p className={styles.empty}>Aucun rapport en attente dans votre périmètre.</p> : <div className={styles.list}>{queue.map(report => <article key={report.id}><div><strong>{report.title}</strong><small>{report.reportNumber} · {report.status}</small></div><div className={styles.actions}><button onClick={() => void decide(report, 'APPROVED')} disabled={busy}>Approuver</button><button className={styles.secondary} onClick={() => void decide(report, 'CORRECTION_REQUESTED')} disabled={busy}>Demander correction</button></div></article>)}</div>}</section>
  </main></AppLayout>;
}
