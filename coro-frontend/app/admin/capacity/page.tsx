'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

const NIVEAU_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  SURCHARGE:  { label: 'Surchargé',   color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '🔴' },
  CHARGE:     { label: 'Chargé',      color: '#E67E22', bg: '#FEF9E7', border: '#FAD7A0', icon: '🟠' },
  NORMAL:     { label: 'Normal',      color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0', icon: '🟡' },
  DISPONIBLE: { label: 'Disponible',  color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '🟢' },
};

export default function CapacityPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role === 'OPERATOR') { router.push('/dashboard'); return; }
    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/capacity');
      setData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // KPIs globaux
  const surcharges = data.filter(d => d.niveau === 'SURCHARGE').length;
  const disponibles = data.filter(d => d.niveau === 'DISPONIBLE').length;
  const totalHeuresFutures = data.reduce((s, d) => s + d.chargeFutureTotale, 0);
  const totalHeuresSaisies = data.reduce((s, d) => s + d.heuresTotalSaisies, 0);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Administration
          </p>
          <h2 className="text-2xl font-black" style={{ color: '#2C3E50' }}>
            Capacity Planning
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            Taux d'occupation et horizon de disponibilité par conseiller
          </p>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        <button onClick={fetchData}
          className="w-full sm:w-auto text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Conseillers surchargés', value: surcharges,                          color: '#C0392B', bg: '#FDEDEC' },
          { label: 'Disponibles bientôt',    value: disponibles,                         color: '#27AE60', bg: '#EAFAF1' },
          { label: 'Heures futures totales', value: `${totalHeuresFutures.toFixed(0)}h`, color: '#2980B9', bg: '#EBF5FB' },
          { label: 'Heures saisies totales', value: `${totalHeuresSaisies.toFixed(0)}h`, color: '#8E44AD', bg: '#F4ECF7' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-md p-5"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>{kpi.label}</p>
            <p className="text-3xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Note méthodologie */}
      <div className="rounded-md p-3 mb-6 flex items-start gap-2"
        style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
        <span style={{ fontSize: '14px', flexShrink: 0 }}>ℹ️</span>
        <p className="text-xs" style={{ color: '#2980B9' }}>
          Le taux d'occupation est calculé sur un horizon de 12 semaines. Plus le conseiller saisit ses heures réelles, plus les données sont précises. Les activités sans durée saisie utilisent une valeur par défaut selon leur type.
        </p>
      </div>

      {/* Liste conseillers */}
      {loading ? (
        <p className="text-sm text-center py-12 animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      ) : data.length === 0 ? (
        <div className="rounded-md p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun conseiller trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(conseiller => {
            const cfg = NIVEAU_CONFIG[conseiller.niveau] || NIVEAU_CONFIG.NORMAL;
            const isExpanded = expanded === conseiller.userId;
            const dateDisp = new Date(conseiller.dateDisponibilite);

            return (
              <div key={conseiller.userId} className="rounded-md overflow-hidden"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

                {/* Ligne principale */}
                <div
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : conseiller.userId)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >

                  {/* Identité */}
                  <div className="flex items-center gap-3 w-full lg:w-auto min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: '#C0392B' }}
                    >
                      {conseiller.firstName[0]}{conseiller.lastName[0]}
                    </div>

                    <div className="min-w-0 lg:w-40">
                      <p className="font-semibold text-sm break-words" style={{ color: '#2C3E50' }}>
                        {conseiller.firstName} {conseiller.lastName}
                      </p>
                      <p className="text-xs" style={{ color: '#ADB5BD' }}>
                        {conseiller.horaireBase}h/sem
                      </p>
                    </div>
                  </div>

                  {/* Jauge occupation */}
                  <div className="w-full lg:flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium" style={{ color: '#6C757D' }}>
                        Taux d'occupation (12 sem.)
                      </span>
                      <span className="text-sm font-black" style={{ color: cfg.color }}>
                        {conseiller.tauxOccupation}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full" style={{ backgroundColor: '#E9ECEF' }}>
                      <div className="h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.min(conseiller.tauxOccupation, 100)}%`,
                          backgroundColor: cfg.color,
                        }} />
                    </div>
                  </div>

                  {/* Niveau + disponibilité */}
                  <div className="grid grid-cols-2 gap-3 w-full lg:w-auto lg:flex lg:items-center lg:gap-6">
                    <div className="min-w-0 lg:w-28 lg:text-center">
                      <p className="text-xs font-medium mb-1 lg:hidden" style={{ color: '#6C757D' }}>
                        Niveau
                      </p>
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap inline-flex items-center"
                        style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div className="min-w-0 lg:w-36 lg:text-right">
                      <p className="text-xs font-medium" style={{ color: '#6C757D' }}>Disponible</p>
                      <p
                        className="text-sm font-bold break-words"
                        style={{ color: conseiller.niveau === 'DISPONIBLE' ? '#27AE60' : '#2C3E50' }}
                      >
                        {conseiller.niveau === 'DISPONIBLE'
                          ? 'Maintenant'
                          : dateDisp.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs" style={{ color: '#ADB5BD' }}>
                        {conseiller.semainesChargees} sem. chargées
                      </p>
                    </div>
                  </div>

                  {/* Expand */}
                  <div className="w-full lg:w-auto flex justify-end">
                    <span className="text-xs flex-shrink-0" style={{ color: '#ADB5BD' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Détail expandé */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5" style={{ borderTop: '1px solid #E9ECEF' }}>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 mb-4">
                      {[
                        { label: 'Heures saisies (tâches)',   value: `${conseiller.heuresTaskTotal.toFixed(1)}h`,    color: '#8E44AD' },
                        { label: 'Heures saisies (timelog)',  value: `${conseiller.heuresTimelogTotal.toFixed(1)}h`, color: '#8E44AD' },
                        { label: 'Heures restantes mandats',  value: `${conseiller.heuresRestantesMandats.toFixed(1)}h`, color: '#2980B9' },
                        { label: 'Heures activités futures',  value: `${conseiller.heuresActivitesFutures.toFixed(1)}h`, color: '#2980B9' },
                        { label: 'Charge future totale',      value: `${conseiller.chargeFutureTotale.toFixed(1)}h`, color: '#C0392B' },
                        { label: 'Activités planifiées',      value: `${conseiller.activitesFuturesCount}`,          color: '#F39C12' },
                      ].map(stat => (
                        <div key={stat.label} className="rounded p-3"
                          style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                          <p className="text-xs mb-1" style={{ color: '#ADB5BD' }}>{stat.label}</p>
                          <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mandats actifs */}
                    {conseiller.mandatsDetail.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#ADB5BD' }}>
                          Mandats actifs
                        </p>
                        <div className="space-y-1.5">
                          {conseiller.mandatsDetail.map((m: any) => (
                            <div key={m.projectId}
                              onClick={() => router.push(`/projects/${m.projectId}/mandate`)}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded cursor-pointer transition-colors"
                              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                                  style={{ backgroundColor: '#C0392B' }}>
                                  {m.documentType}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium break-words" style={{ color: '#2C3E50' }}>{m.projectName}</p>
                                  <p className="text-xs break-words" style={{ color: '#ADB5BD' }}>{m.clientName}</p>
                                </div>
                              </div>
                              <div className="text-left sm:text-right w-full sm:w-auto">
                                <p className="text-xs font-bold" style={{ color: '#2980B9' }}>
                                  {m.heuresRestantes.toFixed(0)}h restantes
                                </p>
                                <p className="text-xs" style={{ color: '#ADB5BD' }}>
                                  {m.heuresReelles.toFixed(0)}h / {m.heuresBudgetees}h
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}