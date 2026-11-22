'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

type Closure = { period: string; status: 'CLOSED' | 'REOPENED'; closedAt: string; reopenReason?: string | null };

/** Trois derniers mois terminés (AAAA-MM), du plus récent au plus ancien. */
function lastCompletedMonths(count = 3): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

const label = (period: string) =>
  new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${period}-01T00:00:00Z`));

/**
 * Clôture mensuelle des saisies de temps (M6-02) : une fois fermé, un mois ne
 * peut plus être modifié ; le rouvrir exige un motif, et chaque correction
 * faite pendant la réouverture est consignée.
 */
export default function PeriodClosurePanel() {
  const [closures, setClosures] = useState<Record<string, Closure>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<Closure[]>('/timelog/periods');
      setClosures(Object.fromEntries(res.data.map((c) => [c.period, c])));
    } catch {
      setError('Impossible de charger l’état des périodes.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (period: string, action: 'close' | 'reopen') => {
    setBusy(period);
    setError('');
    try {
      await api.post(`/timelog/periods/${period}/${action}`, action === 'reopen' ? { reason } : {});
      setReopening(null);
      setReason('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'L’opération a échoué.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-md p-5 mb-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }} aria-label="Clôture des périodes">
      <h2 className="text-sm font-bold mb-1" style={{ color: '#2C3E50' }}>Clôture des périodes</h2>
      <p className="text-xs mb-3" style={{ color: '#6C757D' }}>
        Un mois fermé ne peut plus être modifié. Pour corriger, rouvrez-le avec un motif : chaque correction est consignée.
      </p>
      {error && <p role="alert" className="text-xs mb-2" style={{ color: '#C0392B' }}>{error}</p>}
      <div className="space-y-2">
        {lastCompletedMonths().map((period) => {
          const closure = closures[period];
          const closed = closure?.status === 'CLOSED';
          return (
            <div key={period} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold capitalize" style={{ color: '#2C3E50', minWidth: 140 }}>{label(period)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: closed ? '#E8F5F1' : closure ? '#FEF9E7' : '#F8F9FA', color: closed ? '#167D6A' : closure ? '#9A6700' : '#6C757D' }}>
                {closed ? 'Fermée' : closure ? 'Rouverte' : 'Ouverte'}
              </span>
              {!closed && (
                <button type="button" disabled={busy === period} onClick={() => act(period, 'close')}
                  className="px-3 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#2C3E50', color: '#FFFFFF' }}>
                  Fermer le mois
                </button>
              )}
              {closed && reopening !== period && (
                <button type="button" onClick={() => { setReopening(period); setReason(''); }}
                  className="px-3 py-1 rounded text-xs font-semibold" style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}>
                  Rouvrir pour corriger
                </button>
              )}
              {reopening === period && (
                <span className="flex flex-wrap items-center gap-2">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif de la correction"
                    aria-label="Motif de la réouverture" className="px-2 py-1 rounded text-xs" style={{ border: '1px solid #DEE2E6', minWidth: 240 }} />
                  <button type="button" disabled={reason.trim().length < 10 || busy === period} onClick={() => act(period, 'reopen')}
                    className="px-3 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#C0392B', color: '#FFFFFF' }}>
                    Rouvrir
                  </button>
                  <button type="button" onClick={() => setReopening(null)} className="text-xs" style={{ color: '#6C757D' }}>Annuler</button>
                </span>
              )}
              {closure?.status === 'REOPENED' && closure.reopenReason && (
                <span className="text-xs" style={{ color: '#6C757D' }}>Motif : {closure.reopenReason}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
