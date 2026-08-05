'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Props {
  projectId: string;
  mandate: any;
}

type ViewMode = 'week' | 'month' | 'year' | 'custom';

export default function TimesheetTab({ projectId, mandate }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [totalHeures, setTotalHeures] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Dates selon le mode
  const getDateRange = (mode: ViewMode) => {
    const now = new Date();
    let from: Date, to: Date;

    if (mode === 'week') {
      const day = now.getDay();
      from = new Date(now);
      from.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      to = new Date(from);
      to.setDate(from.getDate() + 6);
    } else if (mode === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (mode === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    } else {
      from = new Date(customFrom || now.toISOString().split('T')[0]);
      to = new Date(customTo || now.toISOString().split('T')[0]);
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  };

  const now = new Date();
  const [customFrom, setCustomFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [customTo, setCustomTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

  useEffect(() => { fetchTimesheet(); }, [projectId, viewMode, customFrom, customTo]);

  const fetchTimesheet = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(viewMode);
      const res = await api.get(`/projects/${projectId}/timesheet`, {
        params: { from, to },
      });
      setEntries(res.data?.entries || []);
      setTotalHeures(res.data?.totalHeures || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { from, to } = getDateRange(viewMode);
      const token = localStorage.getItem('coro_token');
      const res = await fetch(
        `http://localhost:3002/api/projects/${projectId}/timesheet/export?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feuille-temps-${from}-${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  // Grouper par date
  const grouped: Record<string, any[]> = {};
  entries.forEach(e => {
    const date = new Date(e.date).toISOString().split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  });

  // Stats par conseiller
  const byUser: Record<string, { name: string; heures: number }> = {};
  entries.forEach(e => {
    const key = e.userId;
    if (!byUser[key]) byUser[key] = { name: `${e.user?.firstName} ${e.user?.lastName}`, heures: 0 };
    byUser[key].heures += e.heures;
  });

  const budget = mandate?.heuresBudgetees || 0;
  const taux = mandate?.tauxHoraire || 0;
  const montant = mandate?.montantVendu || 0;
  const coutReel = totalHeures * taux;
  const margeEstimee = montant - coutReel;
  const budgetPct = budget > 0 ? Math.min(Math.round((totalHeures / budget) * 100), 100) : 0;

  const { from, to } = getDateRange(viewMode);

  const VIEW_MODES = [
    { id: 'week', label: 'Cette semaine' },
    { id: 'month', label: 'Ce mois' },
    { id: 'year', label: 'Cette année' },
    { id: 'custom', label: 'Personnalisé' },
  ];

  return (
    <div>
      {/* Contrôles */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {VIEW_MODES.map(m => (
            <button key={m.id} onClick={() => setViewMode(m.id as ViewMode)}
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
        <button onClick={handleExportPDF} disabled={exporting || entries.length === 0}
          className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => { if (!exporting) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          {exporting ? '⏳ Export...' : '📄 Exporter PDF'}
        </button>
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Heures saisies</p>
          <p className="text-2xl font-black" style={{ color: '#2980B9' }}>{totalHeures.toFixed(2).replace(/\.?0+$/, '')}h</p>
          <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>sur {budget}h budgétées</p>
        </div>
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Budget consommé</p>
          <p className="text-2xl font-black" style={{ color: budgetPct > 90 ? '#C0392B' : budgetPct > 70 ? '#F39C12' : '#27AE60' }}>
            {budgetPct}%
          </p>
          <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: '#E9ECEF' }}>
            <div className="h-1.5 rounded-full" style={{
              width: `${budgetPct}%`,
              backgroundColor: budgetPct > 90 ? '#C0392B' : budgetPct > 70 ? '#F39C12' : '#27AE60',
            }} />
          </div>
        </div>
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Coût réel</p>
          <p className="text-2xl font-black" style={{ color: '#2C3E50' }}>
            {taux > 0 ? `${coutReel.toFixed(0)} $` : '—'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>{totalHeures.toFixed(2).replace(/\.?0+$/, '')}h × {taux}$/h</p>
        </div>
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Marge estimée</p>
          <p className="text-2xl font-black" style={{ color: margeEstimee >= 0 ? '#27AE60' : '#C0392B' }}>
            {montant > 0 ? `${margeEstimee.toFixed(0)} $` : '—'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
            {montant > 0 ? `${Math.round((margeEstimee / montant) * 100)}% de marge` : 'Montant non configuré'}
          </p>
        </div>
      </div>

      {/* Par conseiller */}
      {Object.keys(byUser).length > 1 && (
        <div className="rounded-md p-5 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Heures par conseiller</p>
          <div className="space-y-2">
            {Object.values(byUser).map(u => (
              <div key={u.name} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#2C3E50' }}>{u.name}</span>
                <span className="text-sm font-bold" style={{ color: '#2980B9' }}>{u.heures.toFixed(2).replace(/\.?0+$/, '')}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau des entrées */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-2xl mb-3">⏱</p>
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune heure saisie pour cette période</p>
        </div>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA' }}>
                {['Date', 'Catégorie', 'Tâche', 'Conseiller', 'Heures', 'Note'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#6C757D', border: '1px solid #E9ECEF' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id}
                  style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                  <td className="px-4 py-3 text-xs" style={{ border: '1px solid #E9ECEF', color: '#495057', whiteSpace: 'nowrap' }}>
                    {new Date(entry.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ border: '1px solid #E9ECEF', color: '#6C757D' }}>
                    {entry.task?.categoryName}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>
                    {entry.task?.taskTitle}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                    {entry.user?.firstName} {entry.user?.lastName}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-center" style={{ border: '1px solid #E9ECEF', color: '#2980B9' }}>
                    {Number(entry.heures).toFixed(2).replace(/\.?0+$/, '')}h
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ border: '1px solid #E9ECEF', color: '#6C757D' }}>
                    {entry.note || '—'}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#F8F9FA', fontWeight: 700 }}>
                <td colSpan={4} className="px-4 py-3 text-xs text-right" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>
                  TOTAL
                </td>
                <td className="px-4 py-3 text-xs font-black text-center" style={{ border: '1px solid #E9ECEF', color: '#C0392B' }}>
                  {totalHeures.toFixed(2).replace(/\.?0+$/, '')}h
                </td>
                <td style={{ border: '1px solid #E9ECEF' }} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}