'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import {
  FileText, CheckCircle, Clock,
  List, Search, Shield,
  ChevronLeft, ChevronRight,
  Building2, MapPin, Users,
} from 'lucide-react';

const READINESS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  READY:    { label: 'Opérationnel',     color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '🟢' },
  REDUCED:  { label: 'Capacité réduite', color: '#E67E22', bg: '#FEF9E7', border: '#FAD7A0', icon: '🟠' },
  CRITICAL: { label: 'Critique',         color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '🔴' },
  NO_TEAM:  { label: 'Non configuré',    color: '#ADB5BD', bg: '#F8F9FA', border: '#DEE2E6', icon: '⚪' },
};

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]               = useState<any>(null);
  const [stats, setStats]             = useState<any>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [buildings, setBuildings]     = useState<any[]>([]);   // données riches (avec photo)
  const [readiness, setReadiness]     = useState<Record<string, any>>({});
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingR, setLoadingR]       = useState(false);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    setUser(u);
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      // 2 appels en parallèle : stats/activités + bâtiments riches
      const [dashRes, buildingsRes] = await Promise.all([
        apiGet('/client-portal/dashboard'),
        apiGet('/client-portal/buildings'),
      ]);
      setStats(dashRes?.stats);
      setUpcomingActivities(dashRes?.upcomingActivities || []);
      setBuildings(buildingsRes || []);
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
    const q = search.toLowerCase();
    return buildings.filter((b: any) =>
      b.name.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q)
    );
  }, [buildings, search]);

  const totalPages     = Math.ceil(filteredBuildings.length / PAGE_SIZE);
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

  return (
    <PortalLayout>

      {/* ── En-tête ── */}
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Tableau de bord
        </p>
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
          <div key={s.label} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, border: '1px solid #E9ECEF' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
            Mes bâtiments
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: '#ADB5BD' }}>
              {filteredBuildings.length}
            </span>
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#ADB5BD" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Rechercher..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, color: '#2C3E50', outline: 'none', width: 180, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* ── Grille de cartes enrichies ── */}
        {buildings.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: 48, textAlign: 'center' }}>
            <Building2 size={40} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 15 }}>Aucun bâtiment associé à votre compte.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
            {pagedBuildings.map((b: any) => {
              const r    = readiness[b.id];
              const rcfg = r ? READINESS_CONFIG[r.status as keyof typeof READINESS_CONFIG] : null;

              return (
                <div key={b.id} style={{
                  backgroundColor: '#FFFFFF', borderRadius: 12,
                  border: '1px solid #E9ECEF', overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column',
                }}>

                  {/* ── Photo ── */}
                  <div style={{ position: 'relative' }}>
                    {b.photoBase64 ? (
                      <img
                        src={b.photoBase64} alt={b.name}
                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: 120, backgroundColor: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={40} color="#AED6F1" />
                      </div>
                    )}

                    {/* Badge résilience superposé sur la photo */}
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      {loadingR && !r ? (
                        <div style={{ width: 80, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.8)' }} />
                      ) : rcfg ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: rcfg.color,
                          backgroundColor: 'rgba(255,255,255,0.92)',
                          border: `1px solid ${rcfg.border}`,
                          padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap',
                          backdropFilter: 'blur(4px)',
                        }}>
                          {rcfg.icon} {r.readinessIndex !== null ? `${r.readinessIndex}%` : rcfg.label}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* ── Contenu ── */}
                  <div style={{ padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>

                    {/* Nom */}
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
                      {b.name}
                    </h3>

                    {/* Adresse */}
                    {(b.address || b.city) && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 14 }}>
                        <MapPin size={12} color="#ADB5BD" style={{ marginTop: 2, flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 12, color: '#6C757D', lineHeight: 1.4 }}>
                          {b.address}{b.city ? `, ${b.city}` : ''}{b.province ? `, ${b.province}` : ''}
                        </p>
                      </div>
                    )}

                    {/* Métriques */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid #F1F3F5' }}>
                      {[
                        { label: 'document' + ((b.projectCount || 0) !== 1 ? 's' : ''), value: b.projectCount  || 0, color: '#2C3E50' },
                        { label: 'validé'   + ((b.validatedCount || 0) !== 1 ? 's' : ''), value: b.validatedCount || 0, color: '#27AE60' },
                        { label: 'en cours',                                                value: b.activeCount   || 0, color: '#2980B9' },
                      ].map((m, i) => (
                        <div key={m.label} style={{
                          flex: 1, textAlign: 'center', padding: '10px 4px',
                          borderLeft: i > 0 ? '1px solid #F1F3F5' : 'none',
                          backgroundColor: '#F8F9FA',
                        }}>
                          <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
                          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#ADB5BD' }}>{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Responsable */}
                    {(b.responsableFirstName || b.responsableLastName) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                        <Users size={12} color="#ADB5BD" style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 12, color: '#6C757D' }}>
                          {b.responsableFirstName} {b.responsableLastName}
                          {b.responsableTitre && (
                            <span style={{ color: '#ADB5BD' }}> — {b.responsableTitre}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 'auto' }}>
                      <button type="button" onClick={() => router.push(`/documents?building=${b.id}`)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          padding: '9px 6px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D6EAF8'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}>
                        <FileText size={13} /> Documents
                      </button>
                      <button type="button" onClick={() => router.push(`/sentinelle/${b.id}/resilience`)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          padding: '9px 6px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FADBD8'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}>
                        <Shield size={13} /> Résilience
                      </button>
                      <button type="button" onClick={() => router.push(`/sentinelle/${b.id}`)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          padding: '9px 6px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E9ECEF'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}>
                        🚨 Sentinelle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
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
      {upcomingActivities.length > 0 && (
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