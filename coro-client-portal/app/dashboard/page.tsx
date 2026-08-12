'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { FileText, CheckCircle, Clock, Eye, Calendar, AlertCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT:       { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6', label: 'Brouillon' },
  IN_PROGRESS: { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1', label: 'En cours' },
  REVIEW:      { bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0', label: 'En révision' },
  VALIDATED:   { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF', label: 'Validé' },
  ARCHIVED:    { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A', label: 'Archivé' },
};

const DOC_COLORS: Record<string, string> = {
  PMU: '#2980B9', PSI: '#C0392B', PCA: '#27AE60',
  PGC: '#8E44AD', PRA: '#E67E22', PUE: '#16A085',
};

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await apiGet('/client-portal/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Chargement...</p>
      </div>
    </PortalLayout>
  );

  const { stats, projects, upcomingActivities } = data || {};

  return (
    <PortalLayout>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Tableau de bord
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50' }}>
          Bonjour, {user?.firstName} 👋
        </h1>
        <p style={{ fontSize: 15, color: '#6C757D', marginTop: 4 }}>
          {user?.clientName} — Voici l'état de vos documents de conformité.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
        gap: 16, marginBottom: 32,
      }}>
        {[
          { label: 'Total documents', value: stats?.total || 0, icon: FileText, color: '#2C3E50' },
          { label: 'Validés', value: stats?.validated || 0, icon: CheckCircle, color: '#27AE60' },
          { label: 'En cours', value: stats?.inProgress || 0, icon: Clock, color: '#2980B9' },
          { label: 'En révision', value: stats?.review || 0, icon: Eye, color: '#F39C12' },
          { label: 'Signés', value: stats?.signed || 0, icon: CheckCircle, color: '#8E44AD' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{
              backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20,
              border: '1px solid #E9ECEF',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: '#6C757D', fontWeight: 500 }}>{stat.label}</p>
                <Icon size={18} color={stat.color} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 900, color: stat.color }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 24 }}>

        {/* Projets récents */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Documents récents</h2>
            <button
              onClick={() => router.push('/documents')}
              style={{ fontSize: 13, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Voir tout →
            </button>
          </div>
          <div>
            {!projects || projects.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ color: '#ADB5BD', fontSize: 14 }}>Aucun document pour l'instant.</p>
              </div>
            ) : projects.map((p: any) => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;
              const dc = DOC_COLORS[p.documentType] || '#6C757D';
              return (
                <div key={p.id}
                  onClick={() => router.push(`/documents/${p.id}`)}
                  style={{
                    padding: '16px 24px', borderBottom: '1px solid #F8F9FA',
                    cursor: 'pointer', transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: '#FFFFFF',
                      backgroundColor: dc, padding: '2px 8px', borderRadius: 4,
                    }}>
                      {p.documentType}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#2C3E50' }} className="truncate">
                      {p.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: '#ADB5BD' }}>{p.building?.name}</p>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                      backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                    }}>
                      {sc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activités à venir */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Activités à venir</h2>
            <button
              onClick={() => router.push('/activities')}
              style={{ fontSize: 13, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Voir tout →
            </button>
          </div>
          <div>
            {!upcomingActivities || upcomingActivities.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Calendar size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#ADB5BD', fontSize: 14 }}>Aucune activité planifiée.</p>
              </div>
            ) : upcomingActivities.map((a: any) => (
              <div key={a.id} style={{ padding: '16px 24px', borderBottom: '1px solid #F8F9FA' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, backgroundColor: '#EBF5FB',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#2980B9', lineHeight: 1 }}>
                      {a.scheduledDate ? new Date(a.scheduledDate).getDate() : '—'}
                    </p>
                    <p style={{ fontSize: 9, color: '#2980B9', textTransform: 'uppercase' }}>
                      {a.scheduledDate ? new Date(a.scheduledDate).toLocaleDateString('fr-CA', { month: 'short' }) : ''}
                    </p>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#2C3E50' }} className="truncate">
                      {a.customLabel || a.label}
                    </p>
                    <p style={{ fontSize: 12, color: '#ADB5BD' }}>
                      {a.project?.building?.name || a.project?.name}
                    </p>
                  </div>
                  {a.mode && (
                    <span style={{ fontSize: 11, color: a.mode === 'teams' ? '#2980B9' : '#27AE60', flexShrink: 0 }}>
                      {a.mode === 'teams' ? '💻' : '📍'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}