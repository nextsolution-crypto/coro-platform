'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { formatCivilDate } from '@/app/planning/time';
import { downloadActivityIcs } from '@/lib/download-ics';
// GLASS:begin — vue Liquid Glass (route bêta du registre). Hors des blocs GLASS, ce fichier est le code Legacy d'origine, inchangé.
import { useTheme } from '@/design-system/theme/ThemeProvider';
import PortfolioGlassView from './PortfolioGlassView';
// GLASS:end

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  a_faire:  { label: 'À faire',  color: '#2980B9', bg: '#EBF5FB', border: '#AED6F1' },
  fait:     { label: 'Fait',     color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
  reporte:  { label: 'Reporté',  color: '#E67E22', bg: '#FEF9E7', border: '#FAD7A0' },
  annule:   { label: 'Annulé',   color: '#95A5A6', bg: '#F8F9FA', border: '#DEE2E6' },
  termine:  { label: 'Terminé',  color: '#1A5276', bg: '#D6EAF8', border: '#AED6F1' },
};

export default function ActivitiesPortfolioPage() {
  const router = useRouter();
  // GLASS:begin
  const { ui, routeMode } = useTheme();
  // GLASS:end

  const [data, setData] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientsRes, activitiesRes] = await Promise.all([
        api.get('/clients'),
        api.get('/activities/portfolio'),
      ]);
      const clientsList = clientsRes.data?.clients || clientsRes.data || [];
      setClients(clientsList);
      setData(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
    } catch (err) {
      console.error(err);
      setData([]);
      setLoadError('Impossible de charger le planning. Vérifiez votre session et réessayez.');
    }
    finally { setLoading(false); }
  };

  const handleDownloadIcs = async (activityId: string, label: string) => {
    setDownloadError('');
    const token = localStorage.getItem('coro_token');
    try {
      await downloadActivityIcs(activityId, label);
    } catch (error) {
      console.error(error);
      setDownloadError('Le calendrier n’a pas pu être téléchargé. Réessayez.');
    }
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

  if (loadError) return (
    <AppLayout>
      <div role="alert" className="rounded-md p-5" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F5B7B1' }}>
        <p className="text-sm mb-3" style={{ color: '#922B21' }}>{loadError}</p>
        <button type="button" onClick={() => void fetchData()} className="px-4 py-2 rounded text-sm font-semibold" style={{ backgroundColor: '#C0392B', color: '#FFFFFF' }}>
          Réessayer
        </button>
      </div>
    </AppLayout>
  );

  // GLASS:begin
  // Vue Liquid Glass : uniquement si Glass est actif ET que la route est rendue en Glass (bêta activée, ou ga au registre).
  // Sinon (Legacy, ou île Legacy tant que la bêta n'est pas activée), le rendu d'origine ci-dessous est utilisé tel quel.
  // Chargement, filtrage, statistiques, ouverture d'un projet et téléchargement .ics restent calculés ICI, une seule fois, pour les deux rendus.
  if (ui === 'glass' && routeMode === 'glass') {
    return (
      <AppLayout>
        {downloadError && <p role="alert" className="mb-4 text-sm" style={{ color: '#C0392B' }}>{downloadError}</p>}
        <PortfolioGlassView
          loading={loading}
          stats={{ total, done, aFaire, reporte, pct }}
          rows={filtered.map(row => ({
            id: row.id,
            projectId: row.projectId,
            clientName: row.clientName,
            buildingName: row.buildingName,
            label: row.customLabel || row.label,
            duration: row.duration,
            mode: row.mode,
            scheduledDate: row.scheduledDate,
            status: row.status,
          }))}
          search={search}
          onSearch={setSearch}
          clients={clients}
          filterClient={filterClient}
          onFilterClient={setFilterClient}
          statusOptions={Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label }))}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          types={uniqueTypes}
          filterType={filterType}
          onFilterType={setFilterType}
          statusLabels={Object.fromEntries(Object.entries(STATUS_CONFIG).map(([key, config]) => [key, config.label]))}
          formatDate={value => formatCivilDate(value, { day: 'numeric', month: 'short', year: 'numeric' })}
          onOpen={projectId => router.push(`/projects/${projectId}/activities`)}
          onDownloadIcs={handleDownloadIcs}
        />
      </AppLayout>
    );
  }
  // GLASS:end
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

      {downloadError && <p role="alert" className="mb-4 text-sm" style={{ color: '#C0392B' }}>{downloadError}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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

      {/* Activités */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-md"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
        >
          <p className="text-4xl mb-4">📅</p>
          <p className="text-sm" style={{ color: '#6C757D' }}>
            Aucune activité trouvée
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE — cartes */}
          <div className="md:hidden space-y-3">
            {filtered.map(row => {
              const status = STATUS_CONFIG[row.status] || STATUS_CONFIG['a_faire'];
              const label = row.customLabel || row.label;

              return (
                <div
                  key={row.id}
                  onClick={() => router.push(`/projects/${row.projectId}/activities`)}
                  className="rounded-md p-4 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold break-words"
                        style={{ color: '#2C3E50' }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-xs mt-1 break-words"
                        style={{ color: '#6C757D' }}
                      >
                        {row.clientName}
                      </p>
                    </div>

                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                      style={{
                        backgroundColor: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs break-words" style={{ color: '#495057' }}>
                      🏢 {row.buildingName}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center"
                        style={{
                          backgroundColor: row.mode === 'teams' ? '#EBF5FB' : '#EAFAF1',
                          color: row.mode === 'teams' ? '#2980B9' : '#27AE60',
                        }}
                      >
                        {row.mode === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                      </span>

                      {row.duration && (
                        <span className="text-xs" style={{ color: '#ADB5BD' }}>
                          ⏱ {row.duration}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-xs" style={{ color: '#495057' }}>
                        {row.scheduledDate
                          ? `📅 ${formatCivilDate(row.scheduledDate, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : '📅 Date à définir'}
                      </span>

                      {row.scheduledDate && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDownloadIcs(row.id, label);
                          }}
                          className="p-2 rounded transition-colors flex-shrink-0"
                          title="Télécharger .ics"
                          aria-label={`Télécharger ${label} au format calendrier`}
                          style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EBF5FB')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLETTE + DESKTOP — tableau */}
          <div
            className="hidden md:block rounded-md overflow-x-auto"
            style={{ border: '1px solid #E9ECEF' }}
          >
            <table
              className="w-full text-sm min-w-[900px]"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  {['Client', 'Bâtiment', 'Activité', 'Mode', 'Date prévue', 'Statut', ''].map(col => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#6C757D', border: '1px solid #E9ECEF' }}
                    >
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
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
                        cursor: 'pointer',
                      }}
                      onClick={() => router.push(`/projects/${row.projectId}/activities`)}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EBF5FB')}
                      onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor =
                          idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA')
                      }
                    >
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}
                      >
                        {row.clientName}
                      </td>

                      <td
                        className="px-4 py-3"
                        style={{ border: '1px solid #E9ECEF', color: '#495057' }}
                      >
                        {row.buildingName}
                      </td>

                      <td
                        className="px-4 py-3"
                        style={{
                          border: '1px solid #E9ECEF',
                          color: '#495057',
                          maxWidth: '240px',
                        }}
                      >
                        <span className="block truncate">{label}</span>
                        {row.duration && (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>
                            ⏱ {row.duration}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3" style={{ border: '1px solid #E9ECEF' }}>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center"
                          style={{
                            backgroundColor: row.mode === 'teams' ? '#EBF5FB' : '#EAFAF1',
                            color: row.mode === 'teams' ? '#2980B9' : '#27AE60',
                          }}
                        >
                          {row.mode === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                        </span>
                      </td>

                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ border: '1px solid #E9ECEF', color: '#495057' }}
                      >
                        {row.scheduledDate ? (
                          formatCivilDate(row.scheduledDate, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3" style={{ border: '1px solid #E9ECEF' }}>
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap inline-flex items-center"
                          style={{
                            backgroundColor: status.bg,
                            color: status.color,
                            border: `1px solid ${status.border}`,
                          }}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td
                        className="px-3 py-3 text-center"
                        style={{ border: '1px solid #E9ECEF' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {row.scheduledDate && (
                          <button
                            onClick={() => handleDownloadIcs(row.id, label)}
                            className="p-1.5 rounded transition-colors"
                            title="Télécharger .ics"
                            style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EBF5FB')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
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
        </>
      )}
    </AppLayout>
  );
}
