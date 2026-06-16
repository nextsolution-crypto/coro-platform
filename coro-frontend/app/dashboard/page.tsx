'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';

interface Stats {
  projetsActifs: number;
  documentsGeneres: number;
  validationsEnAttente: number;
  exportsPDF: number;
  projetsRecents: {
    id: string;
    name: string;
    documentType: string;
    status: string;
    updatedAt: string;
    client: { name: string };
    building: { name: string };
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    projetsActifs: 0,
    documentsGeneres: 0,
    validationsEnAttente: 0,
    exportsPDF: 0,
    projetsRecents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStats = async () => {
      try {
        const res = await api.get('/projects');
        const projets = res.data || [];

        const actifs = projets.filter((p: any) =>
          p.status === 'IN_PROGRESS' || p.status === 'DRAFT'
        ).length;

        const avecDoc = projets.filter((p: any) =>
          p.status === 'IN_PROGRESS' || p.status === 'COMPLETED'
        ).length;

        // Trie par date de modification, prend les 5 plus récents
        const recents = [...projets]
          .sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 5);

        setStats({
          projetsActifs: actifs,
          documentsGeneres: avecDoc,
          validationsEnAttente: 0,
          exportsPDF: 0,
          projetsRecents: recents,
        });
      } catch (err) {
        console.error('Erreur chargement stats dashboard :', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAuthenticated]);

  if (!user) return null;

  const kpis = [
    { label: 'Projets actifs',         value: loading ? '…' : String(stats.projetsActifs),    color: '#C0392B' },
    { label: 'Documents générés',      value: loading ? '…' : String(stats.documentsGeneres), color: '#2980B9' },
    { label: 'Validations en attente', value: loading ? '…' : String(stats.validationsEnAttente), color: '#8E44AD' },
    { label: 'Exports PDF',            value: loading ? '…' : String(stats.exportsPDF),       color: '#27AE60' },
  ];

  const statusLabel: Record<string, { label: string; color: string }> = {
    DRAFT:       { label: 'Brouillon',   color: '#6C757D' },
    IN_PROGRESS: { label: 'En cours',    color: '#2980B9' },
    COMPLETED:   { label: 'Complété',    color: '#27AE60' },
    ARCHIVED:    { label: 'Archivé',     color: '#ADB5BD' },
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
          Bonjour, {user.firstName} 👋
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#6C757D' }}>
          Bienvenue sur la plateforme CORO
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-md p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <p className="text-sm" style={{ color: '#6C757D' }}>{kpi.label}</p>
            <p className="text-3xl font-bold mt-2" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Projets récents */}
      <div className="rounded-md p-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Projets récents</h3>
          <button
            onClick={() => router.push('/projects')}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Voir tous les projets →
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-center py-8 animate-pulse" style={{ color: '#ADB5BD' }}>
            Chargement...
          </p>
        ) : stats.projetsRecents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun projet pour l'instant</p>
            <button
              onClick={() => router.push('/projects')}
              className="mt-4 text-white text-sm font-medium px-4 py-2 rounded"
              style={{ backgroundColor: '#C0392B' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
            >
              + Nouveau projet
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid #E9ECEF' }}>
                {['Projet', 'Client', 'Bâtiment', 'Type', 'Statut', 'Modifié'].map(col => (
                  <th key={col} className="text-left pb-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#ADB5BD' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.projetsRecents.map(projet => {
                const s = statusLabel[projet.status] || { label: projet.status, color: '#6C757D' };
                return (
                  <tr
                    key={projet.id}
                    onClick={() => router.push(`/projects/${projet.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid #F8F9FA' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="py-3 font-medium" style={{ color: '#2C3E50' }}>{projet.name}</td>
                    <td className="py-3" style={{ color: '#495057' }}>{projet.client?.name || '—'}</td>
                    <td className="py-3" style={{ color: '#495057' }}>{projet.building?.name || '—'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: '#FDEDEC', color: '#C0392B' }}>
                        {projet.documentType}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-medium" style={{ color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="py-3 text-xs" style={{ color: '#ADB5BD' }}>
                      {new Date(projet.updatedAt).toLocaleDateString('fr-CA')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}