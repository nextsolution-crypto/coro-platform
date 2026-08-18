'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface HealthScore {
  id: string;
  name: string;
  licenseType: string;
  score: number;
  level: 'ACTIF' | 'MODERE' | 'A_RISQUE';
  metrics: {
    recentProjects: number;
    totalProjects: number;
    signedProjects: number;
    members: number;
    clients: number;
    buildings: number;
  };
  users: { firstName: string; lastName: string; email: string; role: string }[];
}

const levelConfig = {
  ACTIF:    { label: 'Actif',    color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '🟢' },
  MODERE:   { label: 'Modéré',  color: '#F39C12', bg: '#FEF9E7', border: '#FAD7A0', icon: '🟡' },
  A_RISQUE: { label: 'À risque', color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '🔴' },
};

const licenseLabels: Record<string, string> = {
  ESSAI_GRATUIT: 'Essai gratuit',
  STANDARD: 'Standard',
  ENTREPRISE: 'Entreprise',
};

export default function HealthScorePage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [scores, setScores] = useState<HealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIF' | 'MODERE' | 'A_RISQUE'>('ALL');

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/organizations/admin/health-scores');
      setScores(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'ALL' ? scores : scores.filter(s => s.level === filter);
  const atRisk = scores.filter(s => s.level === 'A_RISQUE').length;
  const moderate = scores.filter(s => s.level === 'MODERE').length;
  const active = scores.filter(s => s.level === 'ACTIF').length;

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>🏥 Health Score</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>Santé du portefeuille — {scores.length} organisations</p>
        </div>
        <button onClick={fetchData} className="text-sm px-4 py-2 rounded transition-colors"
          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          ↻ Actualiser
        </button>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
        { label: 'À risque', value: atRisk, color: levelConfig.A_RISQUE.color, bg: levelConfig.A_RISQUE.bg, border: levelConfig.A_RISQUE.border, icon: levelConfig.A_RISQUE.icon },
        { label: 'Modéré', value: moderate, color: levelConfig.MODERE.color, bg: levelConfig.MODERE.bg, border: levelConfig.MODERE.border, icon: levelConfig.MODERE.icon },
        { label: 'Actif', value: active, color: levelConfig.ACTIF.color, bg: levelConfig.ACTIF.bg, border: levelConfig.ACTIF.border, icon: levelConfig.ACTIF.icon },
        ].map(kpi => (
          <div key={kpi.label} onClick={() => setFilter(kpi.label === 'À risque' ? 'A_RISQUE' : kpi.label === 'Modéré' ? 'MODERE' : 'ACTIF')}
            className="rounded-md p-5 cursor-pointer transition-all"
            style={{ backgroundColor: kpi.bg, border: `1px solid ${kpi.border}` }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <p className="text-xs font-medium mb-1" style={{ color: kpi.color }}>{kpi.icon} {kpi.label}</p>
            <p className="text-3xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-xs mt-1" style={{ color: kpi.color }}>organisation{kpi.value > 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'A_RISQUE', 'MODERE', 'ACTIF'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-sm px-4 py-1.5 rounded-full font-medium transition-colors"
            style={{
              backgroundColor: filter === f ? '#2C3E50' : '#F8F9FA',
              color: filter === f ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${filter === f ? '#2C3E50' : '#E9ECEF'}`,
            }}>
            {f === 'ALL' ? 'Toutes' : f === 'A_RISQUE' ? '🔴 À risque' : f === 'MODERE' ? '🟡 Modéré' : '🟢 Actif'}
          </button>
        ))}
      </div>

      {/* Liste organisations */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: '#ADB5BD' }}>Aucune organisation dans cette catégorie.</p>
        )}
        {filtered.map(org => {
          const lc = levelConfig[org.level];
          const admin = org.users.find(u => u.role === 'ADMIN');
          return (
            <div key={org.id} className="rounded-md p-5"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${lc.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold" style={{ color: '#2C3E50' }}>{org.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: lc.bg, color: lc.color, border: `1px solid ${lc.border}` }}>
                      {lc.icon} {lc.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF' }}>
                      {licenseLabels[org.licenseType]}
                    </span>
                  </div>
                  {admin && (
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>
                      Admin : {admin.firstName} {admin.lastName} — {admin.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-black" style={{ color: lc.color }}>{org.score}</p>
                    <p className="text-xs" style={{ color: '#ADB5BD' }}>/100</p>
                  </div>
                  <button onClick={() => router.push(`/admin/organizations`)}
                    className="text-xs px-3 py-1.5 rounded transition-colors"
                    style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    Voir →
                  </button>
                </div>
              </div>

              {/* Barre de score */}
              <div className="w-full rounded-full h-2 mb-4" style={{ backgroundColor: '#E9ECEF' }}>
                <div className="h-2 rounded-full transition-all"
                  style={{ width: `${org.score}%`, backgroundColor: lc.color }} />
              </div>

              {/* Métriques */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Projets (30j)', value: org.metrics.recentProjects, alert: org.metrics.recentProjects === 0 },
                  { label: 'Total projets', value: org.metrics.totalProjects, alert: false },
                  { label: 'Docs signés', value: org.metrics.signedProjects, alert: false },
                  { label: 'Membres', value: org.metrics.members, alert: org.metrics.members <= 1 },
                  { label: 'Clients', value: org.metrics.clients, alert: org.metrics.clients === 0 },
                  { label: 'Bâtiments', value: org.metrics.buildings, alert: org.metrics.buildings === 0 },
                ].map(metric => (
                  <div key={metric.label} className="rounded px-3 py-2 text-center"
                    style={{ backgroundColor: metric.alert ? '#FDEDEC' : '#F8F9FA', border: `1px solid ${metric.alert ? '#F1948A' : '#E9ECEF'}` }}>
                    <p className="text-lg font-bold" style={{ color: metric.alert ? '#C0392B' : '#2C3E50' }}>{metric.value}</p>
                    <p className="text-xs" style={{ color: metric.alert ? '#C0392B' : '#ADB5BD' }}>{metric.label}</p>
                  </div>
                ))}
              </div>

              {org.level === 'A_RISQUE' && (
                <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                  <p className="text-xs" style={{ color: '#C0392B' }}>
                    ⚠️ Cette organisation est peu active. Considérez une prise de contact proactive pour assurer la rétention.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}