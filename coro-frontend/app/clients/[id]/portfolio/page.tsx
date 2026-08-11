'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function ClientPortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');

  useEffect(() => { fetchData(); }, [clientId]);

  const fetchData = async () => {
    try {
      const [clientRes, portfolioRes] = await Promise.all([
        api.get(`/clients/${clientId}`),
        api.get(`/clients/${clientId}/activities/portfolio`),
      ]);
      setClient(clientRes.data);
      setPortfolio(portfolioRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDownloadIcs = (activityId: string, label: string) => {
    const token = localStorage.getItem('coro_token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/activities/${activityId}/ics`, {
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

  // Filtres
  const allActivities = portfolio?.projects?.flatMap((p: any) =>
    p.activities.map((a: any) => ({
      ...a,
      projectName: p.projectName,
      buildingName: p.buildingName,
      documentType: p.documentType,
      projectId: p.projectId,
    }))
  ) || [];

  const filtered = allActivities.filter((a: any) => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterBuilding && a.buildingName !== filterBuilding) return false;
    return true;
  });

  const buildings = Array.from(new Set(allActivities.map((a: any) => a.buildingName))).filter(Boolean);

  const total = filtered.length;
  const done = filtered.filter((a: any) => a.status === 'termine').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <button onClick={() => router.push(`/clients/${clientId}`)}
        className="text-sm mb-4 flex items-center gap-1 transition-colors"
        style={{ color: '#6C757D' }}
        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
        onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
        ← Retour au client
      </button>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Portefeuille client
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>{client?.name}</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        {client?.logoBase64 && (
          <img src={client.logoBase64} alt={client.name}
            style={{ height: '48px', objectFit: 'contain' }} />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Bâtiments', value: portfolio?.projects?.length || 0, color: '#2C3E50' },
          { label: 'Total activités', value: total, color: '#2C3E50' },
          { label: 'Terminées', value: done, color: '#27AE60' },
          { label: 'Progression', value: `${pct}%`, color: pct === 100 ? '#27AE60' : pct > 50 ? '#F39C12' : '#C0392B' },
        ].map(stat => (
          <div key={stat.label} className="rounded-md p-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>{stat.label}</p>
            <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Barre progression */}
      {total > 0 && (
        <div className="rounded-md p-4 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: '#6C757D' }}>Progression annuelle globale</span>
            <span className="text-xs font-bold" style={{ color: '#2C3E50' }}>{done}/{total} activités terminées</span>
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
      <div className="grid grid-cols-3 gap-3 mb-6">
        <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}
          className="px-3 py-2 text-sm rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
          <option value="">Tous les bâtiments</option>
          {buildings.map((b: any) => (
            <option key={b} value={b}>{b}</option>
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
        <div />
      </div>

      {/* Vue par bâtiment */}
      {portfolio?.projects?.filter((p: any) => {
        if (!filterBuilding) return true;
        return p.buildingName === filterBuilding;
      }).map((project: any) => {
        const projectActivities = project.activities.filter((a: any) => {
          if (filterStatus && a.status !== filterStatus) return false;
          return true;
        });
        if (projectActivities.length === 0) return null;

        const projDone = projectActivities.filter((a: any) => a.status === 'termine').length;
        const projPct = projectActivities.length > 0 ? Math.round((projDone / projectActivities.length) * 100) : 0;

        return (
          <div key={project.projectId} className="rounded-md overflow-hidden mb-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

            {/* Header bâtiment */}
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: '#F8F9FA', borderBottom: '1px solid #E9ECEF' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: '#C0392B' }}>
                  {project.documentType}
                </span>
                <span className="text-sm font-bold" style={{ color: '#2C3E50' }}>{project.buildingName}</span>
                <span className="text-xs" style={{ color: '#ADB5BD' }}>{project.projectName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium" style={{ color: projPct === 100 ? '#27AE60' : '#6C757D' }}>
                  {projDone}/{projectActivities.length} · {projPct}%
                </span>
                <button onClick={() => router.push(`/projects/${project.projectId}/activities`)}
                  className="text-xs px-2.5 py-1 rounded transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Voir les activités →
                </button>
              </div>
            </div>

            {/* Activités */}
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAFAFA' }}>
                  {['Activité', 'Mode', 'Date prévue', 'Statut', ''].map(col => (
                    <th key={col} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#ADB5BD', borderBottom: '1px solid #E9ECEF' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectActivities.map((activity: any, idx: number) => {
                  const status = STATUS_CONFIG[activity.status] || STATUS_CONFIG['a_faire'];
                  const label = activity.customLabel || activity.label;
                  return (
                    <tr key={activity.id}
                      style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td className="px-4 py-3" style={{ borderBottom: '1px solid #F8F9FA', color: '#2C3E50' }}>
                        <p className="text-sm">{label}</p>
                        {activity.duration && <p className="text-xs" style={{ color: '#ADB5BD' }}>⏱ {activity.duration}</p>}
                      </td>
                      <td className="px-4 py-3" style={{ borderBottom: '1px solid #F8F9FA' }}>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: activity.mode === 'teams' ? '#EBF5FB' : '#EAFAF1', color: activity.mode === 'teams' ? '#2980B9' : '#27AE60' }}>
                          {activity.mode === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ borderBottom: '1px solid #F8F9FA', color: '#495057' }}>
                        {activity.scheduledDate
                          ? new Date(activity.scheduledDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span style={{ color: '#ADB5BD' }}>—</span>}
                      </td>
                      <td className="px-4 py-3" style={{ borderBottom: '1px solid #F8F9FA' }}>
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #F8F9FA' }}>
                        {activity.scheduledDate && (
                          <button onClick={() => handleDownloadIcs(activity.id, label)}
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
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-3xl mb-4">📅</p>
          <p className="text-sm" style={{ color: '#6C757D' }}>Aucune activité pour ce client</p>
        </div>
      )}
    </AppLayout>
  );
}