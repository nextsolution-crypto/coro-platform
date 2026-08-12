'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { Search, FileText, CheckCircle } from 'lucide-react';

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

export default function DocumentsPage() {
  const router = useRouter();
  const user = getUser();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await apiGet('/client-portal/projects');
      setProjects(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterType && p.documentType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) &&
          !p.building?.name?.toLowerCase().includes(q) &&
          !p.client?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Chargement...</p>
      </div>
    </PortalLayout>
  );

  return (
    <PortalLayout>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Documents
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50' }}>
          Vos documents de conformité
        </h1>
      </div>

      {/* Filtres */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#ADB5BD' }} />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
              borderRadius: 6, border: '1px solid #DEE2E6', fontSize: 14, color: '#2C3E50',
              backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 12px', borderRadius: 6, border: '1px solid #DEE2E6',
            fontSize: 14, color: '#2C3E50', backgroundColor: '#FFFFFF', outline: 'none',
          }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{
            padding: '10px 12px', borderRadius: 6, border: '1px solid #DEE2E6',
            fontSize: 14, color: '#2C3E50', backgroundColor: '#FFFFFF', outline: 'none',
          }}>
          <option value="">Tous les types</option>
          {['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Liste documents */}
      {filtered.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
          padding: 64, textAlign: 'center',
        }}>
          <FileText size={48} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#ADB5BD', fontSize: 15 }}>Aucun document trouvé.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;
            const dc = DOC_COLORS[p.documentType] || '#6C757D';
            const isSigned = p.signatures?.length > 0;
            return (
              <div key={p.id}
                onClick={() => router.push(`/documents/${p.id}`)}
                style={{
                  backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
                  padding: '20px 24px', cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                {/* Badge type */}
                <div style={{
                  width: 48, height: 48, borderRadius: 10, backgroundColor: dc,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#FFFFFF' }}>{p.documentType}</span>
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#2C3E50', marginBottom: 4 }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 13, color: '#ADB5BD' }}>
                    {p.building?.name} · {p.year}
                  </p>
                </div>

                {/* Droite */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isSigned && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8E44AD' }}>
                      <CheckCircle size={14} />
                      Signé
                    </span>
                  )}
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
                    backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                  }}>
                    {sc.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#ADB5BD' }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}