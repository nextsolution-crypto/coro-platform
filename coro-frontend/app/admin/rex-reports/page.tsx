'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type Report = { id: string; reportVersion: number; status: 'GENERATING' | 'FINALIZED'; generatorVersion: string; generatedAt: string; supersessionReason: string | null };
type SearchResult = { reference: string; reviewVersion: number; status: string; reports: Report[] };

export default function RexReportsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { initAuth(); }, [initAuth]);
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'SUPER_ADMIN') router.replace('/dashboard');
    if (!isAuthenticated && !localStorage.getItem('coro_token')) router.replace('/login');
  }, [isAuthenticated, user, router]);

  async function search(value = reference) {
    setBusy(true); setError(''); setResult(null); setSourceId(null); setConfirming(false);
    try {
      const response = await api.get<SearchResult>(`/admin/operational-review-reports/by-reference/${encodeURIComponent(value.trim())}`);
      setResult(response.data);
    } catch { setError('REX introuvable ou consultation indisponible.'); }
    finally { setBusy(false); }
  }

  async function supersede() {
    if (!sourceId || !comment.trim() || busy) return;
    setBusy(true); setError('');
    try {
      await api.post(`/admin/operational-review-reports/${encodeURIComponent(sourceId)}/supersede`, {
        reason: 'TECHNICAL_CORRECTION', comment: comment.trim(),
      });
      setConfirming(false); setComment('');
      await search();
    } catch { setError('La version corrigée n’a pas pu être créée. Actualisez pour vérifier son état avant de réessayer.'); setBusy(false); }
  }

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') return null;
  return <AppLayout>
    <main style={{ maxWidth: 800, padding: '24px 16px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Rapports REX</h1>
      <form onSubmit={(event) => { event.preventDefault(); void search(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label htmlFor="rex-reference">Référence REX</label>
        <input id="rex-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="REX-2026-000001" required style={{ minWidth: 220, padding: 8 }} />
        <button type="submit" disabled={busy} style={{ padding: '8px 12px' }}><Search size={16} aria-hidden="true" /> Rechercher</button>
      </form>
      {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
      {result && <section aria-label="Versions du rapport" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 19 }}>{result.reference}</h2>
        <p>Version du REX : {result.reviewVersion} · {result.status}</p>
        {result.reports.length === 0 && <p>Aucun rapport généré.</p>}
        {result.reports.map((report) => <div key={report.id} style={{ borderTop: '1px solid #d0d5dd', padding: '12px 0' }}>
          <strong>Rapport R{report.reportVersion}</strong> · {report.status}
          <div>Généré le {new Date(report.generatedAt).toLocaleString('fr-CA')} · {report.generatorVersion}</div>
          {report.supersessionReason && <div>Correction technique</div>}
          {report.status === 'FINALIZED' && !result.reports.some((candidate) => candidate.reportVersion > report.reportVersion) &&
            <button type="button" disabled={busy} onClick={() => { setSourceId(report.id); setConfirming(true); setError(''); }} style={{ marginTop: 8, padding: 8 }}><FileText size={16} aria-hidden="true" /> Créer une version corrigée</button>}
        </div>)}
      </section>}
      {confirming && sourceId && <section aria-label="Confirmer la supersession" style={{ borderTop: '2px solid #175c4a', marginTop: 24, paddingTop: 16 }}>
        <h2 style={{ fontSize: 18 }}>Créer une nouvelle version documentaire ?</h2>
        <p>Le rapport actuel restera conservé et immuable. La nouvelle version utilisera le même contenu historique.</p>
        <p>Motif : correction technique</p>
        <label htmlFor="supersession-comment">Commentaire obligatoire</label>
        <textarea id="supersession-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} required rows={3} style={{ display: 'block', width: '100%', margin: '8px 0 16px', padding: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy} onClick={() => setConfirming(false)}>Annuler</button>
          <button type="button" disabled={busy || !comment.trim()} onClick={() => void supersede()}><FileText size={16} aria-hidden="true" /> Créer la version</button>
        </div>
      </section>}
    </main>
  </AppLayout>;
}
