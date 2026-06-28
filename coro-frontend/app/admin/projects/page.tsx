'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface GlobalProject {
  id: string;
  name: string;
  documentType: string;
  status: string;
  year: number;
  progress: number;
  organization: { id: string; name: string; isInternal: boolean };
  client: { id: string; name: string };
  building: { id: string; name: string };
  user: { id: string; firstName: string; lastName: string; email: string };
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT:       { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6' },
  IN_PROGRESS: { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1' },
  REVIEW:      { bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0' },
  VALIDATED:   { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF' },
  EXPORTED:    { bg: '#F4ECF7', text: '#8E44AD', border: '#D2B4DE' },
  ARCHIVED:    { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A' },
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon', IN_PROGRESS: 'En cours', REVIEW: 'En révision',
  VALIDATED: 'Validé', EXPORTED: 'Exporté', ARCHIVED: 'Archivé',
};

export default function AllProjectsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [projects, setProjects] = useState<GlobalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState<string>('all');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/organizations/admin/all-projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const organizations = Array.from(
    new Map(projects.map(p => [p.organization.id, p.organization])).values()
  );

  const filteredProjects = orgFilter === 'all'
    ? projects
    : projects.filter(p => p.organization.id === orgFilter);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Tous les projets
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {filteredProjects.length} projet{filteredProjects.length !== 1 ? 's' : ''} — toutes organisations
          </p>
        </div>
        <select
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
          className="text-sm px-4 py-2.5 rounded focus:outline-none"
          style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
        >
          <option value="all">Toutes les organisations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name}{org.isInternal ? ' (CORO interne)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8F9FA' }}>
              {['Projet', 'Organisation', 'Client / Bâtiment', 'Responsable', 'Statut', 'Progression'].map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p, idx) => {
              const sc = statusColors[p.status] || statusColors.DRAFT;
              return (
                <tr key={p.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                  <td className="px-4 py-3" style={{ color: '#2C3E50', fontWeight: 600 }}>
                    {p.name}
                    <div className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{p.documentType} — {p.year}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#495057' }}>
                    {p.organization.name}
                    {p.organization.isInternal && (
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#2C3E50', color: '#FFFFFF' }}>
                        CORO
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#495057' }}>
                    {p.client?.name} — {p.building?.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#6C757D' }}>
                    {p.user?.firstName} {p.user?.lastName}
                    <div className="text-xs" style={{ color: '#ADB5BD' }}>{p.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                      {statusLabels[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#6C757D' }}>
                    {p.progress}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
