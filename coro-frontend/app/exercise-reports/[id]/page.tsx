'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileArchive, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import styles from './report.module.css';

const labels: Record<string, string> = { DRAFT: 'Brouillon', IN_REVIEW: 'En revue', APPROVED: 'Approuvé', PUBLISHED: 'Publié' };

export default function ExerciseReportPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter();
  const [report, setReport] = useState<any>(null); const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('Validation gouvernée du rapport d’exercice.'); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setReport((await api.get(`/exercise-reports/${id}`)).data); setError(''); } catch { setError('Le rapport ne peut pas être chargé.'); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  async function transition(action: string) { setBusy(true); setError(''); try { const response = await api.post(`/exercise-reports/${id}/${action}`, { lockVersion: report.lockVersion, requestId: crypto.randomUUID(), reason }); setReport(response.data); } catch (caught: any) { setError(caught?.response?.data?.message ?? 'Transition refusée. Actualisez le rapport.'); } finally { setBusy(false); } }
  async function download(version: number) { const response = await api.get(`/exercise-reports/${id}/versions/${version}/download`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = `rapport-exercice-${id}-v${version}.pdf`; a.click(); URL.revokeObjectURL(url); }
  async function closure() { const response = await api.get(`/exercise-reports/${id}/closure-export`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = `cloture-exercice-${id}.tar.gz`; a.click(); URL.revokeObjectURL(url); }
  if (!report) return <AppLayout><main className={styles.page}><button className={styles.back} onClick={() => router.back()}><ArrowLeft size={18}/>Retour</button><p role="status">{error || 'Chargement…'}</p></main></AppLayout>;
  const actions = report.status === 'DRAFT' ? [['submit-review','Soumettre en revue']] : report.status === 'IN_REVIEW' ? [['review','Confirmer la revue'],['reject','Retourner pour correction'],['approve','Approuver']] : report.status === 'APPROVED' ? [['publish','Publier']] : report.status === 'PUBLISHED' ? [['revisions','Ouvrir une nouvelle révision']] : [];
  return <AppLayout><main className={styles.page}>
    <button className={styles.back} onClick={() => router.back()}><ArrowLeft size={18}/>Activités</button>
    <header className={styles.header}><div><span className={styles.eyebrow}>PREUVE DE CONTINUITÉ</span><h1>{report.activityLabel}</h1><p>{report.buildingName} · {report.buildingAddress}</p></div><button className={styles.secondary} onClick={() => void load()}><RefreshCw size={16}/>Actualiser</button></header>
    <div className={styles.status}><strong>{labels[report.status] ?? report.status}</strong><span>LockVersion {report.lockVersion}</span><span>{report.type}</span></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.card}><h2>Décision gouvernée</h2><label htmlFor="reason">Justification obligatoire</label><textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000}/><div className={styles.actions}>{actions.map(([action,label]) => <button key={action} disabled={busy || reason.trim().length < 3} onClick={() => void transition(action)}>{label}</button>)}</div></section>
    <div className={styles.grid}>
      <section className={styles.card}><h2>Chronologie</h2>{report.timelineEntries?.length ? <ol>{report.timelineEntries.map((item:any)=><li key={item.id}><strong>{item.event}</strong><p>{item.description || 'Sans précision'}</p><small>{item.source} · {item.occurredAt ? new Date(item.occurredAt).toLocaleString('fr-CA') : 'heure non enregistrée'}</small></li>)}</ol> : <p className={styles.empty}>Aucun événement.</p>}</section>
      <section className={styles.card}><h2>Participants</h2>{report.participants?.length ? report.participants.map((item:any)=><article key={item.id} className={styles.item}><strong>{item.name}</strong><span>{item.teamFunction || item.simulatedRole || 'Rôle non précisé'}</span></article>) : <p className={styles.empty}>Aucun participant.</p>}</section>
      <section className={styles.card}><h2>Constats</h2>{report.findings?.length ? report.findings.map((item:any)=><article key={item.id} className={styles.item}><strong>{item.type} · {item.title}</strong><p>{item.description}</p></article>) : <p className={styles.empty}>Aucun constat.</p>}</section>
      <section className={styles.card}><h2>Recommandations et actions</h2>{report.recommendations?.map((item:any)=><article key={item.id} className={styles.item}><strong>{item.priority || 'Priorité non définie'}</strong><p>{item.text}</p></article>)}{report.actionItems?.map((item:any)=><article key={item.id} className={styles.item}><strong>{item.title}</strong><p>{item.assignedTo || 'Non attribuée'} · {item.dueDate ? new Date(item.dueDate).toLocaleDateString('fr-CA') : 'Sans échéance'}</p></article>)}</section>
    </div>
    <section className={styles.card}><div className={styles.cardHead}><h2>Versions officielles</h2>{report.status === 'PUBLISHED' && <button className={styles.secondary} onClick={() => void closure()}><FileArchive size={16}/>Exporter la clôture</button>}</div>{report.versions?.length ? report.versions.map((version:any)=><article className={styles.version} key={version.id}><div><strong>Version {version.versionNumber}</strong><p>Empreinte {version.documentSha256}</p></div><button className={styles.secondary} onClick={() => void download(version.versionNumber)}><Download size={16}/>PDF officiel</button></article>) : <p className={styles.empty}>Aucune version publiée.</p>}</section>
  </main></AppLayout>;
}
