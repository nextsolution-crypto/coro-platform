'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!user) return null;

  const kpis = [
    { label: 'Projets actifs',         value: '0', color: '#C0392B' },
    { label: 'Documents générés',      value: '0', color: '#2980B9' },
    { label: 'Validations en attente', value: '0', color: '#8E44AD' },
    { label: 'Exports PDF',            value: '0', color: '#27AE60' },
  ];

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
        <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
          Projets récents
        </h3>
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#ADB5BD' }}>
            Aucun projet pour l'instant
          </p>
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
      </div>
    </AppLayout>
  );
}