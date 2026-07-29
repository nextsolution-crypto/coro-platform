'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

export default function RendementPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'custom'>('month');
  const [filterUser, setFilterUser] = useState('');
  const [customFrom, setCustomFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customTo, setCustomTo] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    if (viewMode === 'month') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      };
    } else if (viewMode === 'year') {
      return {
        from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
      };
    }
    return { from: customFrom, to: customTo };
  };

  useEffect(() => { fetchData(); }, [viewMode, customFrom, customTo, filterUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const params: any = { from, to };
      if (filterUser) params.userId = filterUser;
      const res = await api.get('/rendement', { params });
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (!user) return null;

  const VIEW_MODES = [
    { id: 'month', label: 'Ce mois' },
    { id: 'year', label: 'Cette année' },
    { id: 'custom', label: 'Personnalisé' },
  ];

  return (
    <AppLayout>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Administration
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>
            Rendement & Rentabilité
          </h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {VIEW_MODES.map(m => (
          <button key={m.id} onClick={() => setViewMode(m.id as any)}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: viewMode === m.id ? '#2C3E50' : '#F8F9FA',
              color: viewMode === m.id ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${viewMode === m.id ? '#2C3E50' : '#DEE2E6'}`,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Dates personnalisées */}
      {viewMode === 'custom' && (
        <div className="flex gap-4 mb-6 p-4 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Du</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-2 text-sm rounded"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Au</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-2 text-sm rounded"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : !data ? null : (
        <>
          {/* Stats équipe globale */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Heures équipe', value: `${data.teamStats.heuresTotal.toFixed(1)}h`, color: '#2980B9' },
              { label: 'Revenus équipe', value: data.teamStats.revenusTotal > 0 ? `${data.teamStats.revenusTotal.toFixed(0)} $` : '—', color: '#27AE60' },
              { label: 'Mandats déficitaires', value: data.teamStats.mandatsDeficitaires, color: data.teamStats.mandatsDeficitaires > 0 ? '#C0392B' : '#27AE60' },
            ].map(stat => (
              <div key={stat.label} className="rounded-md p-5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>{stat.label}</p>
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tableau par conseiller */}
          {data.conseillers.length === 0 ? (
            <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-3xl mb-4">⏱</p>
              <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune heure saisie pour cette période</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.conseillers.map((conseiller: any) => (
                <div key={conseiller.userId} className="rounded-md overflow-hidden"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

                  {/* Header conseiller */}
                  <button
                    onClick={() => setExpandedUser(expandedUser === conseiller.userId ? null : conseiller.userId)}
                    className="w-full flex items-center justify-between px-5 py-4 transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: '#C0392B' }}>
                        {conseiller.userName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>{conseiller.userName}</p>
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>
                          {conseiller.mandatsCount} mandat{conseiller.mandatsCount > 1 ? 's' : ''} · {conseiller.heuresTotal.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>Heures</p>
                        <p className="font-black" style={{ color: '#2980B9' }}>{conseiller.heuresTotal.toFixed(1)}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>Revenus</p>
                        <p className="font-black" style={{ color: '#27AE60' }}>
                          {conseiller.revenusTotal > 0 ? `${conseiller.revenusTotal.toFixed(0)} $` : '—'}
                        </p>
                      </div>
                      {conseiller.mandatsDeficitaires > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                          ⚠ {conseiller.mandatsDeficitaires} déficitaire{conseiller.mandatsDeficitaires > 1 ? 's' : ''}
                        </span>
                      )}
                      <span style={{ color: '#ADB5BD', fontSize: '12px' }}>
                        {expandedUser === conseiller.userId ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Détail mandats */}
                  {expandedUser === conseiller.userId && (
                    <div style={{ borderTop: '1px solid #E9ECEF' }}>
                      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8F9FA' }}>
                            {['Client', 'Mandat', 'Heures', 'Budget', 'Montant vendu', 'Coût réel', 'Marge'].map(col => (
                              <th key={col} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                                style={{ color: '#ADB5BD', borderBottom: '1px solid #E9ECEF' }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {conseiller.mandatsList.map((mandat: any, idx: number) => (
                            <tr key={mandat.projectId}
                              onClick={() => router.push(`/projects/${mandat.projectId}/mandate`)}
                              className="cursor-pointer transition-colors"
                              style={{ borderBottom: idx < conseiller.mandatsList.length - 1 ? '1px solid #F8F9FA' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td className="px-4 py-3 text-xs" style={{ color: '#6C757D' }}>{mandat.clientName}</td>
                              <td className="px-4 py-3 text-xs font-medium" style={{ color: '#2C3E50' }}>{mandat.projectName}</td>
                              <td className="px-4 py-3 text-xs font-bold" style={{ color: '#2980B9' }}>{mandat.heures.toFixed(1)}h</td>
                              <td className="px-4 py-3 text-xs" style={{ color: '#ADB5BD' }}>
                                {mandat.heuresBudgetees > 0 ? `${mandat.heuresBudgetees}h` : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: '#2C3E50' }}>
                                {mandat.montantVendu > 0 ? `${mandat.montantVendu.toFixed(0)} $` : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: '#2C3E50' }}>
                                {mandat.coutReel > 0 ? `${mandat.coutReel.toFixed(0)} $` : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold"
                                style={{ color: mandat.marge >= 0 ? '#27AE60' : '#C0392B' }}>
                                {mandat.montantVendu > 0
                                  ? `${mandat.marge.toFixed(0)} $ (${mandat.margePct}%)`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}