'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  a_faire:  { label: 'À faire',  color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1' },
  fait:     { label: 'Fait',     color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
  reporte:  { label: 'Reporté',  color: '#E67E22', bg: '#FEF9E7', border: '#FAD7A0' },
  annule:   { label: 'Annulé',   color: '#95A5A6', bg: '#F8F9FA', border: '#DEE2E6' },
  termine:  { label: 'Terminé',  color: '#1A5276', bg: '#D6EAF8', border: '#AED6F1' },
};

export default function ActivitiesPortfolioPage() {
  const router = useRouter();

  const [data, setData] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        api.get('/clients'),
        api.get('/projects?limit=200'),
      ]);
      const clientsList = clientsRes.data?.clients || clientsRes.data || [];
      setClients(clientsList);

      const projects = projectsRes.data?.projects || projectsRes.data || [];
      const rows: any[] = [];

      await Promise.all(projects.map(async (project: any) => {
        try {
          const actRes = await api.get(`/projects/${project.id}/activities`);
          const activities = actRes.data || [];
          activities.forEach((activity: any) => {
            rows.push({
              ...activity,
              projectId: project.id,
              projectName: project.name,
              documentType: project.documentType,
              clientId: project.client?.id || project.clientId,
              clientName: project.client?.name || '—',
              buildingName: project.building?.name || '—',
            });
          });
        } catch { }
      }));

      rows.sort((a, b) => {
        if (!a.scheduledDate) return 1;
        if (!b.scheduledDate) return -1;
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });

      setData(rows);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDownloadIcs = (activityId: string, label: string) => {
    const token = localStorage.getItem('coro_token');
    fetch(`http://localhost:3002/api/activities/${activityId}/ics`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const filtered = data.filter(row => {
    if (filterClient && row.clientId !== filterClient) return false;
    if (filterStatus && row.status !== filterStatus) return false;
    if (filterType && row.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!row.clientName?.toLowerCase().includes(q) &&
          !row.buildingName?.toLowerCase().includes(q) &&
          !row.label?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const done = filtered.filter(r => r.status === 'termine').length;
  const aFaire = filtered.filter(r => r.status === 'a_faire').length;
  const reporte = filtered.filter(r => r.status === 'reporte').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const uniqueTypes = Array.from(new Set(data.map(r => r.type))).filter(Boolean);

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement du portefeuille...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>Vue globale</p>
        <h1 className="text-2xl font-black uppercase" style={{ color: '#2C3E50' }}>Portefeuille des activités</h1>
        <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total activités', value: total, color: '#2C3E50' },
          { label: 'Terminées', value: done, color: '#27AE60' },
          { label: 'À faire', value: aFaire, color: '#2980B9' },
          { label: 'Reportées', value: reporte, color: '#E67E22' },
        ].map(stat => (
          <div key={stat.label} className="rounded-md p-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>{stat.label}</p>
            <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Progression globale */}
      {total > 0 && (
        <div className="rounded-md p-4 mb-6"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: '#6C757D' }}>Progression globale</span>
            <span className="text-xs font-bold" style={{ color: '#2C3E50' }}>{pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E9ECEF' }}>
            <div className="h-2 rounded-full transition-all" style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? '#27AE60' : pct > 50 ? '#F39C12' : '#C0392B',
            }} />
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          className="px-3 py-2 text-sm rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }} />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="px-3 py-2 text-sm rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
          <option value="">Tous les clients</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
          <option value="">Tous les types</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-md"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-4xl mb-4">📅</p>
          <p className="text-sm" style={{ color: '#6C757D' }}>Aucune activité trouvée</p>
        </div>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA' }}>
                {['Client', 'Bâtiment', 'Activité', 'Mode', 'Date prévue', 'Statut', ''].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#6C757D', border: '1px solid #E9ECEF' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const status = STATUS_CONFIG[row.status] || STATUS_CONFIG['a_faire'];
                const label = row.customLabel || row.label;
                return (
                  <tr key={row.id}
                    style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA', cursor: 'pointer' }}
                    onClick={() => router.push(`/projects/${row.projectId}/activities`)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA'}>
                    <td className="px-4 py-3 font-medium" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>
                      {row.clientName}
                    </td>
                    <td className="px-4 py-3" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                      {row.buildingName}
                    </td>
                    <td className="px-4 py-3" style={{ border: '1px solid #E9ECEF', color: '#495057', maxWidth: '240px' }}>
                      <span className="block truncate">{label}</span>
                      {row.duration && <span className="text-xs" style={{ color: '#ADB5BD' }}>⏱ {row.duration}</span>}
                    </td>
                    <td className="px-4 py-3" style={{ border: '1px solid #E9ECEF' }}>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: row.mode === 'teams' ? '#EBF5FB' : '#EAFAF1', color: row.mode === 'teams' ? '#2980B9' : '#27AE60' }}>
                        {row.mode === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                      {row.scheduledDate
                        ? new Date(row.scheduledDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span style={{ color: '#ADB5BD' }}>—</span>}
                    </td>
                    <td className="px-4 py-3" style={{ border: '1px solid #E9ECEF' }}>
                      <span className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center" style={{ border: '1px solid #E9ECEF' }}
                      onClick={e => e.stopPropagation()}>
                      {row.scheduledDate && (
                        <button onClick={() => handleDownloadIcs(row.id, label)}
                          className="p-1.5 rounded transition-colors"
                          title="Télécharger .ics"
                          style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Download size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}