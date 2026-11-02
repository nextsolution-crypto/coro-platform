'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type Change = { id: string; action: string; reason: string; actorUserId: string; createdAt: string };
type QrCode = { id: string; slug: string; permanentPath: string; destinationUrl: string; status: 'ACTIVE' | 'DISABLED'; configurationVersion: number; humanScanCount: number; technicalRequestCount: number; createdAt: string; updatedAt: string; changes: Change[] };
const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;

export default function QrCodesAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [codes, setCodes] = useState<QrCode[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { destinationUrl: string; reason: string }>>({});
  const [create, setCreate] = useState({ slug: '', destinationUrl: 'https://getcoro.io/', reason: '' });
  const load = useCallback(async () => {
    const { data } = await api.get<QrCode[]>('/qr/admin/codes');
    setCodes(data);
    setDrafts(Object.fromEntries(data.map((code) => [code.slug, { destinationUrl: code.destinationUrl, reason: '' }])));
  }, []);

  useEffect(() => { initAuth(); }, [initAuth]);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronise l'écran avec l'autorité distante après hydratation de l'authentification.
    void load().catch(() => setMessage('Le registre QR est indisponible.'));
  }, [isAuthenticated, load, router, user?.role]);

  async function update(code: QrCode, enabled = code.status === 'ACTIVE') {
    const draft = drafts[code.slug];
    if (!draft?.reason.trim()) { setMessage('Une raison est obligatoire.'); return; }
    setBusy(true); setMessage('');
    try {
      await api.patch(`/qr/admin/codes/${code.slug}`, { destinationUrl: draft.destinationUrl, enabled, expectedVersion: code.configurationVersion, reason: draft.reason });
      await load(); setMessage('Modification enregistrée et journalisée. Le QR imprimé reste inchangé.');
    } catch (error: unknown) { setMessage(errorMessage(error, 'Modification refusée.')); }
    finally { setBusy(false); }
  }

  async function createCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await api.post('/qr/admin/codes', create);
      setCreate({ slug: '', destinationUrl: 'https://getcoro.io/', reason: '' });
      await load(); setMessage('Code créé. Générez ses exports avant toute impression.');
    } catch (error: unknown) { setMessage(errorMessage(error, 'Création refusée.')); }
    finally { setBusy(false); }
  }

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') return null;
  return (
    <AppLayout>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Administration CORO</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Codes QR permanents</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">La destination peut changer, jamais l’adresse imprimée. Chaque modification exige une raison et conserve son historique. Le registre a une portée globale à la plateforme.</p>
        {message && <p role="status" className="mt-5 rounded-lg border border-slate-300 bg-white p-3 text-sm">{message}</p>}
        <form onSubmit={(event) => void createCode(event)} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
          <h2 className="text-xl font-bold md:col-span-3">Créer un code</h2>
          <label className="grid gap-1 text-sm font-semibold">Identifiant stable<input className="rounded-lg border border-slate-300 px-3 py-2" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required minLength={2} maxLength={64} value={create.slug} onChange={(event) => setCreate((value) => ({ ...value, slug: event.target.value.toLowerCase() }))} /></label>
          <label className="grid gap-1 text-sm font-semibold">Destination HTTPS CORO<input className="rounded-lg border border-slate-300 px-3 py-2" type="url" required value={create.destinationUrl} onChange={(event) => setCreate((value) => ({ ...value, destinationUrl: event.target.value }))} /></label>
          <label className="grid gap-1 text-sm font-semibold">Raison<input className="rounded-lg border border-slate-300 px-3 py-2" required minLength={3} maxLength={500} value={create.reason} onChange={(event) => setCreate((value) => ({ ...value, reason: event.target.value }))} /></label>
          <button disabled={busy} className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">Créer sans publier</button>
        </form>
        <div className="mt-8 grid gap-6">
          {codes.map((code) => {
            const draft = drafts[code.slug] ?? { destinationUrl: code.destinationUrl, reason: '' };
            return <section key={code.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{code.slug}</h2><code className="mt-2 block text-sm">https://getcoro.io{code.permanentPath}</code></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${code.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{code.status === 'ACTIVE' ? 'Actif' : 'Désactivé'}</span></div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Scans humains estimés</dt><dd className="font-bold">{code.humanScanCount}</dd></div><div><dt className="text-slate-500">Requêtes techniques</dt><dd className="font-bold">{code.technicalRequestCount}</dd></div><div><dt className="text-slate-500">Dernière modification</dt><dd className="font-bold">{new Date(code.updatedAt).toLocaleString('fr-CA')}</dd></div></dl>
              <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void update(code); }}>
                <label className="grid gap-1 text-sm font-semibold">Destination HTTPS CORO<input className="rounded-lg border border-slate-300 px-3 py-2" type="url" required value={draft.destinationUrl} onChange={(event) => setDrafts((value) => ({ ...value, [code.slug]: { ...draft, destinationUrl: event.target.value } }))} /></label>
                <label className="grid gap-1 text-sm font-semibold">Raison de la modification<input className="rounded-lg border border-slate-300 px-3 py-2" required minLength={3} maxLength={500} value={draft.reason} onChange={(event) => setDrafts((value) => ({ ...value, [code.slug]: { ...draft, reason: event.target.value } }))} /></label>
                <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">Enregistrer</button><button type="button" disabled={busy} onClick={() => void update(code, code.status !== 'ACTIVE')} className="rounded-lg border border-slate-400 px-4 py-2 font-bold disabled:opacity-50">{code.status === 'ACTIVE' ? 'Désactiver' : 'Réactiver'}</button></div>
              </form>
              <details className="mt-6"><summary className="cursor-pointer font-semibold">Journal des modifications ({code.changes.length})</summary><ol className="mt-3 grid gap-2 text-sm text-slate-600">{code.changes.map((change) => <li key={change.id}>{new Date(change.createdAt).toLocaleString('fr-CA')} · {change.action} · {change.reason}</li>)}</ol></details>
            </section>;
          })}
        </div>
      </main>
    </AppLayout>
  );
}
