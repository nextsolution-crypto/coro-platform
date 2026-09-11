'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import {
  FileText, CheckCircle, Clock,
  LayoutGrid, List, Search, Shield,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT:       { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6', label: 'Brouillon' },
  IN_PROGRESS: { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1', label: 'En cours' },
  REVIEW:      { bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0', label: 'En révision' },
  VALIDATED:   { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF', label: 'Validé' },
  ARCHIVED:    { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A', label: 'Archivé' },
};

const READINESS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  READY:    { label: 'Opérationnel',    color: '#27AE60', bg: '#EAFAF1', icon: '🟢' },
  REDUCED:  { label: 'Capacité réduite', color: '#E67E22', bg: '#FEF9E7', icon: '🟠' },
  CRITICAL: { label: 'Critique',         color: '#C0392B', bg: '#FDEDEC', icon: '🔴' },
  NO_TEAM:  { label: 'Non configuré',    color: '#ADB5BD', bg: '#F8F9FA', icon: '⚪' },
};

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]                   = useState<any>(null);
  const [data, setData]                   = useState<any>(null);
  const [readiness, setReadiness]         = useState<Record<string, any>>({});
  const [loadingDash, setLoadingDash]     = useState(true);
  const [loadingR, setLoadingR]           = useState(false);
  const [view, setView]                   = useState<'grid' | 'list'>('grid');
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    setUser(u);
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await apiGet('/client-portal/dashboard');
      setData(res);
      fetchReadiness();
    } catch (err) { console.error(err); }
    finally { setLoadingDash(false); }
  };

  const fetchReadiness = async () => {
    setLoadingR(true);
    try {
      const res = await apiGet('/client-portal/buildings-readiness');
      const map: Record<string, any> = {};
      for (const r of res) map[r.buildingId] = r;
      setReadiness(map);
    } catch (err) { console.error(err); }
    finally { setLoadingR(false); }
  };

  const filteredBuildings = useMemo(() => {
    if (!data?.buildings) return [];
    const q = search.toLowerCase();
    return data.buildings.filter((b: any) =>
      b.name.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q)
    );
  }, [data?.buildings, search]);

  const totalPages    = Math.ceil(filteredBuildings.length / PAGE_SIZE);
  const pagedBuildings = filteredBuildings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search]);

  if (loadingDash || !user) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

  const { stats, upcomingActivities } = data || {};

  return (
    <PortalLayout>

      {/* ── En-tête ── */}
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tableau de bord</p>
        <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: '#2C3E50' }}>
          Bonjour, {user.firstName} 👋
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#6C757D' }}>
          {user.clientName} — Voici l'état de vos documents de conformité.
        </p>
      </header>

      {/* ── Stats ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total documents', value: stats?.total      || 0, color: '#2C3E50', Icon: FileText    },
          { label: 'Validés',         value: stats?.validated  || 0, color: '#27AE60', Icon: CheckCircle },
          { label: 'En cours',        value: stats?.inProgress || 0, color: '#2980B9', Icon: Clock       },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '16px', border: '1px solid #E9ECEF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6C757D', fontWeight: 500, lineHeight: 1.3 }}>{s.label}</p>
              <s.Icon size={15} color={s.color} />
            </div>
            <p style={{ margin: 0, fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* ── Mes bâtiments ── */}
      <section style={{ marginBottom: 28 }}>

        {/* En-tête section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
            Mes bâtiments
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: '#ADB5BD' }}>
              {filteredBuildings.length}
            </span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#ADB5BD" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, color: '#2C3E50', outline: 'none', width: 160, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
              {(['grid', 'list'] as const).map(v => (
                <button key={v} type="button" onClick={() => setView(v)}
                  style={{ padding: '7px 11px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    backgroundColor: view === v ? '#2C3E50' : '#FFFFFF',
                    color: view === v ? '#FFFFFF' : '#6C757D' }}>
                  {v === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Vue Grille ── */}
        {view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14 }}>
            {pagedBuildings.map((b: any) => {
              const r = readiness[b.id];
              const rcfg = r ? READINESS_CONFIG[r.status as keyof typeof READINESS_CONFIG] : null;
              return (
                <div key={b.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: '18px 18px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Nom + badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD' }}>{b.city}{b.province ? `, ${b.province}` : ''}</p>
                    </div>
                    {loadingR && !r
                      ? <div style={{ width: 70, height: 22, borderRadius: 4, backgroundColor: '#F1F3F5', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
                      : rcfg
                        ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: rcfg.color, backgroundColor: rcfg.bg, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                            {rcfg.icon} {r.readinessIndex !== null ? `${r.readinessIndex}%` : rcfg.label}
                          </span>
                        : null
                    }
                  </div>
                  {/* Métriques */}
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #F1F3F5' }}>
                    {[
                      { label: 'docs',    value: b.projectCount,   color: '#2C3E50' },
                      { label: 'validés', value: b.validatedCount, color: '#27AE60' },
                      { label: 'en cours',value: b.activeCount,    color: '#2980B9' },
                    ].map((m, i) => (
                      <div key={m.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderLeft: i > 0 ? '1px solid #F1F3F5' : 'none', backgroundColor: '#F8F9FA' }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#ADB5BD' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => router.push(`/sentinelle/${b.id}/resilience`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid #FADBD8', backgroundColor: '#FDEDEC', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#C0392B' }}>
                      <Shield size={11} /> Résilience
                    </button>
                    <button type="button" onClick={() => router.push(`/sentinelle/${b.id}`)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#6C757D' }}>
                      🚨 Sentinelle
                    </button>
                    <button type="button" onClick={() => router.push(`/documents?building=${b.id}`)}
                      style={{ marginLeft: 'auto', padding: '6px 0', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#C0392B' }}>
                      Documents →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Vue Liste ── */}
        {view === 'list' && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            {pagedBuildings.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucun bâtiment trouvé.</p>
              </div>
            ) : pagedBuildings.map((b: any, i: number) => {
              const r    = readiness[b.id];
              const rcfg = r ? READINESS_CONFIG[r.status as keyof typeof READINESS_CONFIG] : null;
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < pagedBuildings.length - 1 ? '1px solid #F1F3F5' : 'none', flexWrap: 'wrap' }}>
                  {/* Badge résilience */}
                  <div style={{ width: 90, flexShrink: 0 }}>
                    {loadingR && !r
                      ? <div style={{ width: 80, height: 20, borderRadius: 4, backgroundColor: '#F1F3F5' }} />
                      : rcfg
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: rcfg.color, backgroundColor: rcfg.bg, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                            {rcfg.icon} {r.readinessIndex !== null ? `${r.readinessIndex}%` : rcfg.label}
                          </span>
                        : <span style={{ fontSize: 11, color: '#DEE2E6' }}>—</span>
                    }
                  </div>
                  {/* Nom */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>{b.city}{b.province ? `, ${b.province}` : ''}</p>
                  </div>
                  {/* Compteurs */}
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: '#2C3E50' }}><strong>{b.projectCount}</strong> <span style={{ color: '#ADB5BD' }}>docs</span></span>
                    <span style={{ fontSize: 12, color: '#27AE60' }}><strong>{b.validatedCount}</strong> <span style={{ color: '#ADB5BD' }}>validés</span></span>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => router.push(`/sentinelle/${b.id}/resilience`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1px solid #FADBD8', backgroundColor: '#FDEDEC', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#C0392B' }}>
                      <Shield size={11} /> Résilience
                    </button>
                    <button type="button" onClick={() => router.push(`/sentinelle/${b.id}`)}
                      style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#6C757D' }}>
                      Sentinelle
                    </button>
                    <button type="button" onClick={() => router.push(`/documents?building=${b.id}`)}
                      style={{ padding: '5px 9px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#C0392B' }}>
                      Docs →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex' }}>
              <ChevronLeft size={14} color="#6C757D" />
            </button>
            <span style={{ fontSize: 13, color: '#6C757D' }}>Page {page} / {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex' }}>
              <ChevronRight size={14} color="#6C757D" />
            </button>
          </div>
        )}
      </section>

      {/* ── Activités à venir ── */}
      {upcomingActivities && upcomingActivities.length > 0 && (
        <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Activités à venir</h2>
            <button type="button" onClick={() => router.push('/activities')}
              style={{ fontSize: 13, color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Voir tout →
            </button>
          </div>
          {upcomingActivities.map((a: any, i: number) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < upcomingActivities.length - 1 ? '1px solid #F1F3F5' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#EBF5FB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#2980B9', lineHeight: 1 }}>
                  {a.scheduledDate ? new Date(a.scheduledDate).getDate() : '—'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 9, color: '#2980B9', textTransform: 'uppercase' as const }}>
                  {a.scheduledDate ? new Date(a.scheduledDate).toLocaleDateString('fr-CA', { month: 'short' }) : ''}
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#2C3E50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.customLabel || a.label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.project?.building?.name || a.project?.name || '—'}
                </p>
              </div>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{a.mode === 'teams' ? '💻' : '📍'}</span>
            </div>
          ))}
        </section>
      )}

    </PortalLayout>
  );
}