'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { Shield, AlertTriangle, CheckCircle, Zap, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const clientFetch = async (path: string) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
  });
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

const STATUS_CONFIG = {
  READY:    { label: 'Opérationnel',     color: '#27AE60', bg: '#EAFAF1', icon: '🟢' },
  REDUCED:  { label: 'Capacité réduite', color: '#E67E22', bg: '#FEF9E7', icon: '🟠' },
  CRITICAL: { label: 'Critique',         color: '#C0392B', bg: '#FDEDEC', icon: '🔴' },
};

const REC_CONFIG = {
  CRITICAL: { color: '#C0392B', bg: '#FDEDEC', icon: '🔴', label: 'CRITIQUE' },
  WARNING:  { color: '#E67E22', bg: '#FEF9E7', icon: '🟠', label: 'ATTENTION' },
  INFO:     { color: '#2980B9', bg: '#EBF5FB', icon: '🔵', label: 'INFO' },
};

const CAT_ICONS: Record<string, string> = {
  ROLES: '🛡️', QUALIFICATIONS: '🎓', PLANS: '📄', EXERCISES: '🔔', INCIDENTS: '📋',
};

export default function IntelligencePage() {
  const router = useRouter();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | 'CRITICAL' | 'WARNING' | 'INFO'>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await clientFetch('/client-portal/intelligence/overview');
      setData(res);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Analyse en cours...</p>
      </div>
    </PortalLayout>
  );

  if (!data) return null;

  const globalScfg = STATUS_CONFIG[data.globalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CRITICAL;

  const filteredRecs = (data.recommendations || []).filter((r: any) => {
    const typeOk     = filter === 'all' || r.type === filter;
    const buildingOk = buildingFilter === 'all' || r.buildingId === buildingFilter;
    return typeOk && buildingOk;
  });

  return (
    <PortalLayout>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 8 }}>
              💡 Intelligence organisationnelle
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdate && <span style={{ fontSize: 11, color: '#ADB5BD' }}>Analysé à {lastUpdate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button type="button" onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>
        </div>
      </header>

      {/* Score global */}
      <div style={{ marginBottom: 16, padding: '20px 24px', borderRadius: 12, border: `2px solid ${globalScfg.color}`, backgroundColor: globalScfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{globalScfg.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: globalScfg.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Indice CORO — Organisation</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: globalScfg.color }}>{globalScfg.label}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: globalScfg.color, lineHeight: 1 }}>{data.avgScore}%</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Score moyen</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>{data.totalBuildings}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Bâtiment{data.totalBuildings > 1 ? 's' : ''}</p>
          </div>
          {data.summary.criticalCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: '#C0392B', lineHeight: 1 }}>{data.summary.criticalCount}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Critique{data.summary.criticalCount > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Résumé par bâtiment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {(data.buildings || []).map((b: any) => {
          const scfg = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CRITICAL;
          const critCount = (b.recommendations || []).filter((r: any) => r.type === 'CRITICAL').length;
          return (
            <div key={b.buildingId} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: `1px solid ${scfg.color}40`, padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => router.push(`/sentinelle/${b.buildingId}/resilience`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50', lineHeight: 1.3, flex: 1 }}>{b.buildingName}</p>
                <span style={{ fontSize: 16, flexShrink: 0, marginLeft: 6 }}>{scfg.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: scfg.color }}>{b.score}%</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#ADB5BD' }}>{b.presentMembers}/{b.totalMembers} membres</span>
                </div>
              </div>
              <div style={{ height: 4, backgroundColor: '#F1F3F5', borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: '100%', width: `${b.score}%`, backgroundColor: scfg.color, borderRadius: 2 }} />
              </div>
              {critCount > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#C0392B', fontWeight: 600 }}>
                  {critCount} alerte{critCount > 1 ? 's' : ''} critique{critCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Filtres recommandations */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
          Recommandations prioritaires — {filteredRecs.length} résultat{filteredRecs.length > 1 ? 's' : ''}
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Filtre type */}
          {(['all', 'CRITICAL', 'WARNING', 'INFO'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                borderColor: filter === f ? '#2C3E50' : '#E9ECEF',
                backgroundColor: filter === f ? '#2C3E50' : '#FFFFFF',
                color: filter === f ? '#FFFFFF' : '#6C757D' }}>
              {f === 'all' ? `Tous (${data.summary.total})` : f === 'CRITICAL' ? `🔴 ${data.summary.criticalCount}` : f === 'WARNING' ? `🟠 ${data.summary.warningCount}` : `🔵 ${data.summary.infoCount}`}
            </button>
          ))}
          {/* Filtre bâtiment */}
          {data.totalBuildings > 1 && (
            <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 11, color: '#6C757D', backgroundColor: '#FFFFFF', cursor: 'pointer' }}>
              <option value="all">Tous les bâtiments</option>
              {(data.buildings || []).map((b: any) => (
                <option key={b.buildingId} value={b.buildingId}>{b.buildingName}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Liste recommandations */}
      {filteredRecs.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <CheckCircle size={36} color="#27AE60" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune recommandation</p>
          <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Tous vos bâtiments sont pleinement opérationnels.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredRecs.map((rec: any, i: number) => {
            const rcfg = REC_CONFIG[rec.type as keyof typeof REC_CONFIG] || REC_CONFIG.INFO;
            return (
              <div key={i} style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: rcfg.bg, border: `1px solid ${rcfg.color}30`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{rcfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: rcfg.color, backgroundColor: '#FFFFFF', padding: '2px 7px', borderRadius: 4, border: `1px solid ${rcfg.color}40` }}>
                      {rcfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#6C757D' }}>{CAT_ICONS[rec.category] || '•'} {rec.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2C3E50', backgroundColor: '#F8F9FA', padding: '2px 7px', borderRadius: 4 }}>
                      🏢 {rec.buildingName}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>{rec.message}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap size={11} color={rcfg.color} />
                    <p style={{ margin: 0, fontSize: 12, color: '#6C757D' }}>{rec.action}</p>
                  </div>
                </div>
                <button type="button" onClick={() => router.push(`/sentinelle/${rec.buildingId}/resilience`)}
                  style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#2C3E50', whiteSpace: 'nowrap' as const }}>
                  Voir →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Note conformité */}
      <p style={{ textAlign: 'center', fontSize: 11, color: '#ADB5BD', marginTop: 24 }}>
        Analyse basée sur les 4 composantes CORO · Conforme ISO 22301 · CNPI 2020 · CNESST
      </p>
    </PortalLayout>
  );
}