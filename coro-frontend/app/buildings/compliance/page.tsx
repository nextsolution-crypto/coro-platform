'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type DocumentaryStatus = 'APPROVED_AVAILABLE' | 'IN_REVIEW' | 'DRAFT_ONLY' | 'HISTORICAL_ONLY' | 'NO_ACCESSIBLE_DOCUMENT';
interface Source { documentId: string; documentTitle: string; documentStatus: string; version: number; documentType: string; projectId: string; projectName: string; projectStatus: string; lastModifiedAt: string; approvalDate: string | null; dateMeaning: 'PROJECT_APPROVAL_DATE' | 'APPROVAL_DATE_UNKNOWN' | 'LAST_MODIFIED_DATE'; current: boolean }
interface Building { id: string; name: string; address: string; city: string; province: string; buildingType: string; clientName: string; documentaryStatus: DocumentaryStatus; sourceCount: number; approvedCount: number; reviewCount: number; draftCount: number; historicalCount: number; primarySource: Source | null; sources: Source[]; regulatoryAttestation: false }

const CONFIG: Record<DocumentaryStatus, { label: string; bg: string; text: string; border: string }> = {
  APPROVED_AVAILABLE: { label: 'Document approuvé disponible', bg: '#EAFAF1', text: '#1E8449', border: '#A9DFBF' },
  IN_REVIEW: { label: 'Document en révision', bg: '#EBF5FB', text: '#2471A3', border: '#AED6F1' },
  DRAFT_ONLY: { label: 'Brouillon seulement', bg: '#FEF9E7', text: '#9A7D0A', border: '#F7DC6F' },
  HISTORICAL_ONLY: { label: 'Documents historiques seulement', bg: '#F4ECF7', text: '#7D3C98', border: '#D2B4DE' },
  NO_ACCESSIBLE_DOCUMENT: { label: 'Aucun document accessible', bg: '#F8F9FA', text: '#5D6D7E', border: '#D5D8DC' },
};
const STATUSES = Object.keys(CONFIG) as DocumentaryStatus[];

export default function BuildingsCompliancePage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();
  const sequence = useRef(0);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocumentaryStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => { initAuth(); }, [initAuth]);
  const fetchData = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError(null);
    try {
      const response = await api.get<Building[]>('/projects/buildings-compliance');
      if (request === sequence.current) setBuildings(response.data);
    } catch {
      if (request === sequence.current) {
        setBuildings([]);
        setError('Le suivi documentaire est momentanément indisponible. Les résultats précédents ne sont pas affichés.');
      }
    } finally { if (request === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => {
    if (isAuthenticated) queueMicrotask(() => void fetchData());
    else if (!localStorage.getItem('coro_token')) router.push('/login');
  }, [fetchData, isAuthenticated, router]);

  const clients = useMemo(() => Array.from(new Set(buildings.map((b) => b.clientName))).sort((a, b) => a.localeCompare(b, 'fr')), [buildings]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return buildings.filter((b) => {
      const haystack = [b.name, b.clientName, b.city, ...b.sources.flatMap((s) => [s.documentTitle, s.documentType, s.projectName])].join(' ').toLocaleLowerCase('fr');
      return (filter === 'ALL' || b.documentaryStatus === filter) && (clientFilter === 'ALL' || b.clientName === clientFilter) && (!query || haystack.includes(query));
    });
  }, [buildings, clientFilter, filter, search]);
  const count = (status: DocumentaryStatus) => buildings.filter((b) => b.documentaryStatus === status).length;
  const date = (value: string) => new Date(value).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });

  return <AppLayout>
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-2xl font-semibold text-slate-800">Suivi documentaire des bâtiments</h1><p className="mt-1 text-sm text-slate-600">Documents accessibles dans les projets autorisés pour chaque bâtiment.</p></div>
      <button type="button" onClick={() => router.push('/buildings')} className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-600 sm:w-auto">← Retour aux bâtiments</button>
    </header>
    <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Portée de cet écran :</strong> ce suivi décrit l’état documentaire dans CORO. Il ne constitue pas une attestation de conformité réglementaire et ne déduit aucune échéance légale à partir d’une date de modification.</div>
    {error ? <div role="alert" className="mb-5 rounded-md border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={() => void fetchData()} className="mt-3 rounded bg-red-800 px-3 py-2 font-medium text-white">Réessayer</button></div> : null}
    {!error ? <>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{STATUSES.map((status) => { const c = CONFIG[status]; const selected = filter === status; return <button key={status} type="button" aria-pressed={selected} onClick={() => setFilter(selected ? 'ALL' : status)} className="min-w-0 rounded-md p-4 text-left" style={{ backgroundColor: selected ? c.bg : '#fff', border: `1px solid ${selected ? c.border : '#e9ecef'}` }}><span className="block text-xs font-semibold" style={{ color: c.text }}>{c.label}</span><strong className="mt-1 block text-2xl" style={{ color: c.text }}>{count(status)}</strong></button>; })}</div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,240px)_1fr]">
        <label className="sr-only" htmlFor="compliance-client-filter">Filtrer par client</label><select id="compliance-client-filter" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="ALL">Tous les clients ({buildings.length})</option>{clients.map((client) => <option key={client} value={client}>{client}</option>)}</select>
        <label className="sr-only" htmlFor="compliance-search">Rechercher dans le suivi documentaire</label><input id="compliance-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un bâtiment, client, projet ou document" className="min-w-0 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm" />
      </div>
      {loading ? <p role="status" className="py-12 text-center text-sm text-slate-600">Chargement du suivi documentaire…</p> : buildings.length === 0 ? <p className="rounded-md border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">Aucun bâtiment accessible dans votre périmètre.</p> : filtered.length === 0 ? <p className="rounded-md border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">Aucun résultat ne correspond aux filtres sélectionnés.</p> :
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((b) => { const c = CONFIG[b.documentaryStatus]; const source = b.primarySource; return <article key={b.id} className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h2 className="break-words font-semibold text-slate-800">{b.name}</h2><p className="mt-1 break-words text-xs text-slate-600">{b.clientName} · {b.city}, {b.province}</p></div><span className="self-start rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{c.label}</span></div>
          {source ? <div className="mt-4 space-y-2 text-sm text-slate-700"><p><strong>Document :</strong> {source.documentTitle}</p><p><strong>Type :</strong> {source.documentType} · version {source.version}</p><p><strong>Projet :</strong> {source.projectName}</p><p><strong>État de la source :</strong> {source.documentStatus}</p><p><strong>Dernière modification :</strong> {date(source.lastModifiedAt)}</p><p><strong>Date d’approbation :</strong> {source.approvalDate ? date(source.approvalDate) : source.dateMeaning === 'APPROVAL_DATE_UNKNOWN' ? 'Non enregistrée' : 'Non applicable'}</p><button type="button" onClick={() => router.push(`/projects/${source.projectId}`)} className="mt-2 rounded border border-red-700 px-3 py-2 text-xs font-semibold text-red-700">Voir le projet source →</button></div> : <p className="mt-4 text-sm text-slate-600">Aucun document courant ou historique n’est accessible dans les projets inclus.</p>}
          {b.sources.length > 1 ? <details className="mt-4 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-medium text-slate-600">Afficher les {b.sources.length} sources accessibles</summary><ul className="mt-3 space-y-3">{b.sources.map((s) => <li key={s.documentId} className="rounded bg-slate-50 p-3 text-xs text-slate-600"><strong>{s.documentTitle}</strong> — {s.documentType}, v{s.version}, {s.documentStatus}<br />Projet : {s.projectName} · modifié le {date(s.lastModifiedAt)}</li>)}</ul></details> : null}
        </article>; })}</div>}
    </> : null}
  </AppLayout>;
}
