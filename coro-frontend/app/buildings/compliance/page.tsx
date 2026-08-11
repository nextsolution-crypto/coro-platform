'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface BuildingCompliance {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  buildingType: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  documentType: string | null;
  lastUpdated: string | null;
  monthsAgo: number | null;
  complianceStatus: 'CONFORME' | 'AVERTISSEMENT' | 'EXPIRE' | 'AUCUN_DOCUMENT';
}

const STATUS_CONFIG = {
  CONFORME:        { label: '✓ Conforme',        bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF', dot: '#27AE60' },
  AVERTISSEMENT:   { label: '⚠ Bientôt dû',      bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0', dot: '#F39C12' },
  EXPIRE:          { label: '✗ Expiré',           bg: '#FDEDEC', text: '#C0392B', border: '#F1948A', dot: '#C0392B' },
  AUCUN_DOCUMENT:  { label: '○ Aucun document',   bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6', dot: '#ADB5BD' },
};

export default function BuildingsCompliancePage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();

  const [buildings, setBuildings] = useState<BuildingCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('TOUS');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('TOUS');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const res = await api.get('/projects/buildings-compliance');
      setBuildings(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const clients = Array.from(new Set(buildings.map(b => b.clientName))).sort((a, b) => a.localeCompare(b, 'fr'));

  const filtered = buildings.filter(b => {
    const statusMatch = filter === 'TOUS' || b.complianceStatus === filter;
    const clientMatch = clientFilter === 'TOUS' || b.clientName === clientFilter;
    const searchMatch = search === '' ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase());
    return statusMatch && clientMatch && searchMatch;
  });

  const counts = {
    TOUS: buildings.length,
    CONFORME: buildings.filter(b => b.complianceStatus === 'CONFORME').length,
    AVERTISSEMENT: buildings.filter(b => b.complianceStatus === 'AVERTISSEMENT').length,
    EXPIRE: buildings.filter(b => b.complianceStatus === 'EXPIRE').length,
    AUCUN_DOCUMENT: buildings.filter(b => b.complianceStatus === 'AUCUN_DOCUMENT').length,
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Tableau de conformité
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            État des documents de sécurité par bâtiment — {buildings.length} bâtiment{buildings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/buildings')}
          className="w-full sm:w-auto text-sm px-3 py-2 rounded transition-colors"
          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ← Retour aux bâtiments
        </button>
      </div>

      {/* Résumé visuel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'CONFORME', label: 'Conformes', count: counts.CONFORME },
          { key: 'AVERTISSEMENT', label: 'Bientôt dus', count: counts.AVERTISSEMENT },
          { key: 'EXPIRE', label: 'Expirés', count: counts.EXPIRE },
          { key: 'AUCUN_DOCUMENT', label: 'Sans document', count: counts.AUCUN_DOCUMENT },
        ].map(item => {
          const cfg = STATUS_CONFIG[item.key as keyof typeof STATUS_CONFIG];
          return (
            <button
              key={item.key}
              onClick={() => setFilter(filter === item.key ? 'TOUS' : item.key)}
              className="rounded-md p-4 text-left transition-all"
              style={{
                backgroundColor: filter === item.key ? cfg.bg : '#FFFFFF',
                border: `1px solid ${filter === item.key ? cfg.border : '#E9ECEF'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.dot }} />
                <span className="text-xs font-medium" style={{ color: cfg.text }}>{item.label}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: cfg.text }}>{item.count}</p>
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,240px)_1fr] gap-3 mb-4">
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="text-sm px-3 py-2.5 rounded focus:outline-none"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
        >
          <option value="TOUS">Tous les clients ({buildings.length})</option>
          {clients.map(c => (
            <option key={c} value={c}>
              {c} ({buildings.filter(b => b.clientName === c).length})
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#ADB5BD' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par bâtiment, client ou ville..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded focus:outline-none"
            style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
          />
        </div>
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div
          className="rounded-md px-4 py-12 text-center text-sm"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', color: '#ADB5BD' }}
        >
          Aucun bâtiment trouvé
        </div>
      ) : (
        <>
          {/* MOBILE — cartes */}
          <div className="md:hidden space-y-3">
            {filtered.map(b => {
              const cfg = STATUS_CONFIG[b.complianceStatus];

              return (
                <div
                  key={b.id}
                  className="rounded-md p-4"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm break-words" style={{ color: '#2C3E50' }}>
                        {b.name}
                      </p>
                      <p className="text-xs mt-1 break-words" style={{ color: '#ADB5BD' }}>
                        {b.address}
                      </p>
                    </div>

                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p style={{ color: '#495057' }}>
                      <strong>Client :</strong> {b.clientName}
                    </p>

                    <p style={{ color: '#495057' }}>
                      <strong>Ville :</strong> {b.city}, {b.province}
                    </p>

                    <p style={{ color: '#495057' }}>
                      <strong>Type :</strong> {b.buildingType || '—'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span style={{ color: '#495057' }}>
                        <strong>Document :</strong>
                      </span>

                      {b.documentType ? (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: '#C0392B' }}
                        >
                          {b.documentType}
                        </span>
                      ) : (
                        <span style={{ color: '#ADB5BD' }}>—</span>
                      )}

                      {b.projectName && (
                        <span className="break-words" style={{ color: '#ADB5BD' }}>
                          {b.projectName}
                        </span>
                      )}
                    </div>

                    <p style={{ color: '#495057' }}>
                      <strong>Dernière mise à jour :</strong>{' '}
                      {b.lastUpdated ? formatDate(b.lastUpdated) : '—'}
                      {b.monthsAgo !== null && b.lastUpdated ? (
                        <span
                          className="ml-1 font-medium"
                          style={{
                            color:
                              b.complianceStatus === 'EXPIRE'
                                ? '#C0392B'
                                : b.complianceStatus === 'AVERTISSEMENT'
                                ? '#F39C12'
                                : '#ADB5BD',
                          }}
                        >
                          ({b.monthsAgo} mois)
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid #F1F3F5' }}>
                    {b.projectId ? (
                      <button
                        onClick={() => router.push(`/projects/${b.projectId}`)}
                        className="w-full text-xs font-medium px-3 py-2 rounded transition-colors"
                        style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#C0392B';
                          e.currentTarget.style.color = '#C0392B';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#DEE2E6';
                          e.currentTarget.style.color = '#6C757D';
                        }}
                      >
                        Voir le projet →
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push('/projects')}
                        className="w-full text-xs font-medium px-3 py-2 rounded transition-colors"
                        style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        + Créer un projet
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLETTE + DESKTOP — tableau */}
          <div className="hidden md:block rounded-md overflow-x-auto" style={{ border: '1px solid #E9ECEF' }}>
            <table className="w-full min-w-[1150px] text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  {['État', 'Bâtiment', 'Client', 'Ville', 'Type', 'Dernier document', 'Dernière mise à jour', 'Action'].map(col => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((b, idx) => {
                  const cfg = STATUS_CONFIG[b.complianceStatus];

                  return (
                    <tr
                      key={b.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
                        borderBottom: '1px solid #E9ECEF',
                      }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center"
                          style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                        >
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: '#2C3E50' }}>{b.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{b.address}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#495057' }}>
                        {b.clientName}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#495057' }}>
                        {b.city}, {b.province}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs whitespace-nowrap" style={{ color: '#6C757D' }}>
                          {b.buildingType || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {b.documentType ? (
                          <div>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded text-white whitespace-nowrap inline-flex"
                              style={{ backgroundColor: '#C0392B' }}
                            >
                              {b.documentType}
                            </span>
                            {b.projectName && (
                              <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                                {b.projectName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.lastUpdated ? (
                          <div>
                            <p className="text-sm" style={{ color: '#495057' }}>
                              {formatDate(b.lastUpdated)}
                            </p>
                            <p
                              className="text-xs mt-0.5 font-medium"
                              style={{
                                color:
                                  b.complianceStatus === 'EXPIRE'
                                    ? '#C0392B'
                                    : b.complianceStatus === 'AVERTISSEMENT'
                                    ? '#F39C12'
                                    : '#ADB5BD',
                              }}
                            >
                              {b.monthsAgo !== null ? `${b.monthsAgo} mois` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.projectId ? (
                          <button
                            onClick={() => router.push(`/projects/${b.projectId}`)}
                            className="text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = '#C0392B';
                              e.currentTarget.style.color = '#C0392B';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = '#DEE2E6';
                              e.currentTarget.style.color = '#6C757D';
                            }}
                          >
                            Voir le projet →
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push('/projects')}
                            className="text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                            style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            + Créer un projet
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