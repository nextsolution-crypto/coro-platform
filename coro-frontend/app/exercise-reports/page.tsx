'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Layers3, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import styles from './workspace.module.css';

export default function ExerciseReportWorkspace() {
  const [reports, setReports] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [portfolioId, setPortfolioId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('Rapport d’exercice organisationnel');
  const [code, setCode] = useState('ORG_EXERCISE_REPORT');
  const [sections, setSections] = useState('IDENTIFICATION\nPARTICIPANTS\nTIMELINE\nFINDINGS\nRECOMMENDATIONS\nACTIONS\nCONCLUSION');
  const [reason, setReason] = useState('Publication gouvernée du modèle de rapport d’exercice.');

  const loadTemplates = useCallback(async () => {
    setTemplates((await api.get('/exercise-report-templates')).data);
  }, []);
  const loadPortfolio = useCallback(async () => {
    const params = new URLSearchParams();
    if (portfolioId) params.set('portfolioId', portfolioId);
    if (regionId) params.set('regionId', regionId);
    const response = await api.get(`/exercise-reports/portfolio?${params}`);
    setReports(response.data.reports);
  }, [portfolioId, regionId]);
  useEffect(() => { void loadTemplates().catch(() => setError('Accès aux modèles refusé.')); }, [loadTemplates]);

  async function publishTemplate(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await api.post('/exercise-report-templates/publish', { code, name, sections: sections.split('\n').map(item => item.trim()).filter(Boolean), requestId: crypto.randomUUID(), reason });
      await loadTemplates();
    } catch (caught: any) { setError(caught?.response?.data?.message ?? 'Publication du modèle refusée.'); }
  }

  return <AppLayout><main className={styles.page}>
    <header className={styles.header}><div><span>PREUVES DE CONTINUITÉ</span><h1>Rapports d’exercice</h1><p>Modèles gouvernés et rapports publiés selon vos affectations CORO Network.</p></div></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.card} aria-labelledby="portfolio-title">
      <div className={styles.cardHead}><div><h2 id="portfolio-title"><Layers3 size={20}/>Vue portefeuille</h2><p>Aucune portée n’est accordée implicitement.</p></div><button onClick={() => void loadPortfolio()}><RefreshCw size={17}/>Charger</button></div>
      <div className={styles.filters}><label>Portefeuille<input value={portfolioId} onChange={event => setPortfolioId(event.target.value)} placeholder="Identifiant UUID facultatif"/></label><label>Région<input value={regionId} onChange={event => setRegionId(event.target.value)} placeholder="Identifiant UUID facultatif"/></label></div>
      <div className={styles.reportGrid}>{reports.map(report => <article key={report.id}><FileText size={20}/><div><strong>{report.activityLabel}</strong><p>{report.type} · {new Date(report.publishedAt).toLocaleDateString('fr-CA')}</p><small>{report._count.findings} constats · {report._count.correctiveActions} actions</small></div><Link href={`/exercise-reports/${report.id}`}>Consulter</Link></article>)}</div>
      {!reports.length && <p className={styles.empty}>Chargez une portée autorisée pour afficher les rapports publiés.</p>}
    </section>
    <section className={styles.card} aria-labelledby="templates-title">
      <h2 id="templates-title">Modèles officiels</h2>
      <div className={styles.templateList}>{templates.map(template => <article key={template.id}><strong>{template.name}</strong><span>{template.code} · v{template.version}</span><small>SHA-256 {template.contentSha256}</small></article>)}</div>
      <form onSubmit={publishTemplate}><h3>Publier une nouvelle version organisationnelle</h3><div className={styles.filters}><label>Code<input value={code} onChange={event => setCode(event.target.value.toUpperCase())} required pattern="[A-Z][A-Z0-9_]*"/></label><label>Nom<input value={name} onChange={event => setName(event.target.value)} required/></label></div><label>Sections, une par ligne<textarea value={sections} onChange={event => setSections(event.target.value)} required/></label><label>Justification<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={3}/></label><button type="submit">Publier la version immuable</button></form>
    </section>
  </main></AppLayout>;
}
