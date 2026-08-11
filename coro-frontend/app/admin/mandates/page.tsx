'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  DRAFT:       { label: 'Brouillon',    bg: '#F8F9FA', color: '#6C757D', border: '#DEE2E6' },
  IN_PROGRESS: { label: 'En cours',     bg: '#EBF5FB', color: '#2980B9', border: '#AED6F1' },
  REVIEW:      { label: 'En révision',  bg: '#FEF9E7', color: '#F39C12', border: '#FAD7A0' },
  VALIDATED:   { label: 'Validé',       bg: '#EAFAF1', color: '#27AE60', border: '#A9DFBF' },
  EXPORTED:    { label: 'Exporté',      bg: '#F4ECF7', color: '#8E44AD', border: '#D2B4DE' },
  ARCHIVED:    { label: 'Archivé',      bg: '#FDEDEC', color: '#C0392B', border: '#F1948A' },
};

const delaiConfig: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  DEPASSE:  { icon: '🔴', color: '#C0392B', bg: '#FDEDEC', border: '#F1948A' },
  CRITIQUE: { icon: '🔴', color: '#C0392B', bg: '#FDEDEC', border: '#F1948A' },
  URGENT:   { icon: '🟠', color: '#E67E22', bg: '#FEF9E7', border: '#FAD7A0' },
  ATTENTION:{ icon: '🟡', color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0' },
  OK:       { icon: '✅', color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF' },
};

export default function AdminMandatesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterConseiller, setFilterConseiller] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterDelai, setFilterDelai] = useState('tous');
  const [filterType, setFilterType] = useState('tous');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role === 'OPERATOR') { router.push('/dashboard'); return; }
    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/portfolio');
      setMandates(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Conseillers uniques
  const conseillers = Array.from(
    new Map(
      mandates
        .filter(m => m.conseiller?.id)
        .map(m => [m.conseiller.id, m.conseiller] as [string, any])
    ).values()
  );

  // Filtres
  const filtered = mandates.filter(m => {
    if (filterConseiller !== 'tous' && m.conseiller?.id !== filterConseiller) return false;
    if (filterStatut !== 'tous' && m.projectStatus !== filterStatut) return false;
    if (filterDelai !== 'tous' && m.delaiLevel !== filterDelai) return false;
    if (filterType !== 'tous' && m.typeMandat !== filterType) return false;
    return true;
  });

  // KPIs
  const totalActifs = mandates.filter(m => !['ARCHIVED', 'EXPORTED'].includes(m.projectStatus)).length;
  const enRetard = mandates.filter(m => m.delaiLevel === 'DEPASSE').length;
  const critique = mandates.filter(m => ['DEPASSE', 'CRITIQUE', 'URGENT'].includes(m.delaiLevel)).length;
  const totalHeuresBudget = mandates.reduce((s, m) => s + (m.heuresBudgetees || 0), 0);
  const totalHeuresReelles = mandates.reduce((s, m) => s + (m.heuresReelles || 0), 0);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Administration
          </p>
          <h2 className="text-2xl font-black" style={{ color: '#2C3E50' }}>
            Portefeuille mandats
          </h2>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Mandats actifs',       value: totalActifs,                        color: '#2980B9', bg: '#EBF5FB' },
          { label: 'Délais dépassés',      value: enRetard,                           color: '#C0392B', bg: '#FDEDEC' },
          { label: 'Alertes critiques',    value: critique,                           color: '#E67E22', bg: '#FEF9E7' },
          { label: `Heures (${totalHeuresReelles.toFixed(0)}h / ${totalHeuresBudget.toFixed(0)}h)`,
            value: `${totalHeuresBudget > 0 ? Math.round((totalHeuresReelles / totalHeuresBudget) * 100) : 0}%`,
            color: '#27AE60', bg: '#EAFAF1' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-md p-5"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>{kpi.label}</p>
            <p className="text-3xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4 p-4 rounded-md"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
        
        {/* Conseiller */}
        <div className="min-w-0">
          <label className="block text-xs font-semibold mb-1" style={{ color: '#6C757D' }}>Conseiller</label>
          <select value={filterConseiller}
            onChange={e => setFilterConseiller(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded focus:outline-none"
            style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}>
            <option value="tous">Tous</option>
            {conseillers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </div>

        {/* Statut */}
        <div className="min-w-0">
          <label className="block text-xs font-semibold mb-1" style={{ color: '#6C757D' }}>Statut projet</label>
          <select value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded focus:outline-none"
            style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}>
            <option value="tous">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="REVIEW">En révision</option>
            <option value="VALIDATED">Validé</option>
          </select>
        </div>

        {/* Type mandat */}
        <div className="min-w-0">
          <label className="block text-xs font-semibold mb-1" style={{ color: '#6C757D' }}>Type mandat</label>
          <select value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded focus:outline-none"
            style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}>
            <option value="tous">Tous</option>
            <option value="FORFAITAIRE">Forfaitaire</option>
            <option value="ANNUEL">Annuel</option>
          </select>
        </div>

        {/* Délai */}
        <div className="min-w-0">
          <label className="block text-xs font-semibold mb-1" style={{ color: '#6C757D' }}>Alerte délai</label>
          <select value={filterDelai}
            onChange={e => setFilterDelai(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded focus:outline-none"
            style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}>
            <option value="tous">Tous</option>
            <option value="DEPASSE">🔴 Dépassé</option>
            <option value="CRITIQUE">🔴 Critique</option>
            <option value="URGENT">🟠 Urgent</option>
            <option value="ATTENTION">🟡 Attention</option>
            <option value="OK">✅ OK</option>
          </select>
        </div>

        <div className="flex items-end sm:col-span-2 xl:col-span-4">
          <p className="text-xs" style={{ color: '#ADB5BD' }}>
            {filtered.length} mandat{filtered.length !== 1 ? 's' : ''} affichés
          </p>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <p className="text-sm text-center py-12 animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-md p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun mandat trouvé</p>
        </div>
      ) : (
        <>
          {/* MOBILE — cartes */}
          <div className="md:hidden space-y-3">
            {filtered.map(m => {
              const s = statusConfig[m.projectStatus] || statusConfig['DRAFT'];
              const d = m.delaiLevel ? delaiConfig[m.delaiLevel] : null;

              return (
                <div
                  key={m.mandateId}
                  onClick={() => router.push(`/projects/${m.projectId}/mandate`)}
                  className="rounded-md p-4 cursor-pointer transition-colors"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded text-white whitespace-nowrap"
                          style={{ backgroundColor: '#C0392B' }}
                        >
                          {m.documentType}
                        </span>
                        <span className="font-semibold text-sm break-words" style={{ color: '#2C3E50' }}>
                          {m.projectName}
                        </span>
                      </div>
                      <p className="text-xs break-words" style={{ color: '#6C757D' }}>
                        {m.clientName}
                      </p>
                      <p className="text-xs break-words" style={{ color: '#ADB5BD' }}>
                        {m.buildingName}
                      </p>
                    </div>

                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0"
                      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    >
                      {s.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                        Conseiller
                      </p>
                      <p className="text-xs font-medium break-words" style={{ color: '#495057' }}>
                        {m.conseiller
                          ? `${m.conseiller.firstName} ${m.conseiller.lastName}`
                          : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                        Type
                      </p>
                      {m.typeMandat ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex"
                          style={{
                            backgroundColor: m.typeMandat === 'FORFAITAIRE' ? '#FDEDEC' : '#EBF5FB',
                            color: m.typeMandat === 'FORFAITAIRE' ? '#C0392B' : '#2980B9',
                          }}
                        >
                          {m.typeMandat === 'FORFAITAIRE' ? '📅 Forfaitaire' : '🔄 Annuel'}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                        Heures
                      </p>
                      {m.heuresBudgetees > 0 ? (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="text-xs font-bold"
                              style={{ color: m.budgetPct > 90 ? '#C0392B' : m.budgetPct > 70 ? '#F39C12' : '#27AE60' }}
                            >
                              {m.heuresReelles.toFixed(0)}h
                            </span>
                            <span className="text-xs" style={{ color: '#ADB5BD' }}>
                              / {m.heuresBudgetees}h
                            </span>
                          </div>
                          <div className="w-full max-w-24 h-1.5 rounded-full" style={{ backgroundColor: '#E9ECEF' }}>
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(m.budgetPct, 100)}%`,
                                backgroundColor: m.budgetPct > 90 ? '#C0392B' : m.budgetPct > 70 ? '#F39C12' : '#27AE60',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#ADB5BD' }}>
                        Délai
                      </p>
                      {d && m.dateLimite ? (
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0">{d.icon}</span>
                          <div>
                            <p className="text-xs font-bold whitespace-nowrap" style={{ color: d.color }}>
                              {m.diffDays < 0
                                ? `Dépassé de ${Math.abs(m.diffDays)}j`
                                : m.diffDays === 0
                                ? "Aujourd'hui"
                                : `${m.diffDays}j restants`}
                            </p>
                            <p className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                              {new Date(m.dateLimite).toLocaleDateString('fr-CA', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex justify-end" style={{ borderTop: '1px solid #F1F3F5' }}>
                    <span className="text-xs font-medium" style={{ color: '#C0392B' }}>
                      Voir le mandat →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLETTE + DESKTOP — tableau */}
          <div
            className="hidden md:block rounded-md overflow-x-auto"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
          >
            <table className="w-full min-w-[1100px] text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  {['Projet', 'Client', 'Conseiller', 'Type', 'Statut', 'Heures', 'Délai livraison', ''].map(col => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: '#ADB5BD', borderBottom: '1px solid #E9ECEF' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((m, idx) => {
                  const s = statusConfig[m.projectStatus] || statusConfig['DRAFT'];
                  const d = m.delaiLevel ? delaiConfig[m.delaiLevel] : null;

                  return (
                    <tr
                      key={m.mandateId}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F8F9FA' : 'none' }}
                      onClick={() => router.push(`/projects/${m.projectId}/mandate`)}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded text-white whitespace-nowrap"
                            style={{ backgroundColor: '#C0392B', flexShrink: 0 }}
                          >
                            {m.documentType}
                          </span>
                          <span className="font-medium" style={{ color: '#2C3E50' }}>
                            {m.projectName}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: '#2C3E50' }}>{m.clientName}</p>
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>{m.buildingName}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.conseiller ? (
                          <span className="text-xs font-medium" style={{ color: '#495057' }}>
                            {m.conseiller.firstName} {m.conseiller.lastName}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.typeMandat ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex"
                            style={{
                              backgroundColor: m.typeMandat === 'FORFAITAIRE' ? '#FDEDEC' : '#EBF5FB',
                              color: m.typeMandat === 'FORFAITAIRE' ? '#C0392B' : '#2980B9',
                            }}
                          >
                            {m.typeMandat === 'FORFAITAIRE' ? '📅 Forfaitaire' : '🔄 Annuel'}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex"
                          style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                        >
                          {s.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.heuresBudgetees > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-xs font-bold"
                                style={{ color: m.budgetPct > 90 ? '#C0392B' : m.budgetPct > 70 ? '#F39C12' : '#27AE60' }}
                              >
                                {m.heuresReelles.toFixed(0)}h
                              </span>
                              <span className="text-xs" style={{ color: '#ADB5BD' }}>
                                / {m.heuresBudgetees}h
                              </span>
                            </div>
                            <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: '#E9ECEF' }}>
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(m.budgetPct, 100)}%`,
                                  backgroundColor: m.budgetPct > 90 ? '#C0392B' : m.budgetPct > 70 ? '#F39C12' : '#27AE60',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {d && m.dateLimite ? (
                          <div className="flex items-center gap-2">
                            <span>{d.icon}</span>
                            <div>
                              <p className="text-xs font-bold whitespace-nowrap" style={{ color: d.color }}>
                                {m.diffDays < 0
                                  ? `Dépassé de ${Math.abs(m.diffDays)}j`
                                  : m.diffDays === 0
                                  ? "Aujourd'hui"
                                  : `${m.diffDays}j restants`}
                              </p>
                              <p className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                                {new Date(m.dateLimite).toLocaleDateString('fr-CA', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium" style={{ color: '#C0392B' }}>
                          Voir →
                        </span>
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