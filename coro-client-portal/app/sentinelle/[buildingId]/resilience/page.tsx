'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Users } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const ROLE_LABELS: Record<string, string> = {
  COORDINATOR:     'Coordonnateur',
  EPI:             'Équipe de première intervention',
  ASSEMBLY_WARDEN: 'Responsable rassemblement',
  SEARCHER:        'Chercheur',
  EXIT_WARDEN:     'Surveillant de sortie',
  PNA_ESCORT:      'Accompagnateur PNA',
  FIRST_AIDER:     'Secouriste',
};

const STATUS_CONFIG = {
  READY:    { label: 'OPÉRATIONNEL',    color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '🟢' },
  REDUCED:  { label: 'CAPACITÉ RÉDUITE', color: '#E67E22', bg: '#FEF9E7', border: '#F9E79F', icon: '🟠' },
  CRITICAL: { label: 'CRITIQUE',         color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '🔴' },
};

export default function ResiliencePage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [kioskToken, setKioskToken] = useState('');
  const [noTeam, setNoTeam]     = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    init();
  }, [buildingId]);

  const init = async () => {
    try {
      const kiosk = await apiGet(`/occupancy/buildings/${buildingId}/kiosk-token`);
      setKioskToken(kiosk.token);
      await fetchReadiness(kiosk.token);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchReadiness = useCallback(async (token?: string) => {
    const t = token || kioskToken;
    if (!t) return;
    try {
      const res = await fetch(`${API}/occupancy/buildings/${buildingId}/readiness?token=${t}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.totalMembers === 0) setNoTeam(true);
      setData(json);
      setLastUpdate(new Date());
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }, [buildingId, kioskToken]);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    if (!kioskToken) return;
    const interval = setInterval(() => fetchReadiness(), 30000);
    return () => clearInterval(interval);
  }, [kioskToken, fetchReadiness]);

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Calcul de l'état de préparation...</p>
      </div>
    </PortalLayout>
  );

  const statusCfg = data ? STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] : STATUS_CONFIG.READY;

  return (
    <PortalLayout>
      {/* En-tête */}
      <header style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}>
          ← Retour au registre
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={22} color="#C0392B" /> Résilience opérationnelle
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdate && (
              <span style={{ fontSize: 12, color: '#ADB5BD' }}>
                Mise à jour {lastUpdate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button type="button" onClick={() => fetchReadiness()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>
        </div>
      </header>

      {/* Cas : aucun membre configuré */}
      {noTeam || !data || data.totalMembers === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <Users size={36} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune équipe d'urgence configurée</p>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#ADB5BD' }}>Assignez des rôles d'urgence aux employés pour activer le tableau de résilience.</p>
          <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/employes`)}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Configurer les employés →
          </button>
        </div>
      ) : (
        <>
          {/* Bandeau état global */}
          <div style={{ marginBottom: 20, padding: '20px 24px', borderRadius: 12, border: `2px solid ${statusCfg.border}`, backgroundColor: statusCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28 }}>{statusCfg.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: statusCfg.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>État de préparation</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: statusCfg.color }}>{statusCfg.label}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: statusCfg.color }}>{data.readinessIndex}%</p>
                <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Indice de préparation</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#2C3E50' }}>{data.presentMembers}<span style={{ fontSize: 18, color: '#ADB5BD' }}>/{data.totalMembers}</span></p>
                <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Membres présents</p>
              </div>
            </div>
          </div>

          {/* Lacunes critiques */}
          {data.gaps.length > 0 && (
            <div style={{ marginBottom: 20, padding: '16px 20px', borderRadius: 10, backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <XCircle size={16} color="#C0392B" />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#C0392B' }}>Lacunes critiques — Aucun membre présent</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.gaps.map((g: any) => (
                  <span key={g.role} style={{ fontSize: 12, fontWeight: 700, color: '#C0392B', backgroundColor: '#FFFFFF', border: '1px solid #F1948A', padding: '4px 10px', borderRadius: 6 }}>
                    {ROLE_LABELS[g.role] || g.role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capacité réduite */}
          {data.reduced.length > 0 && (
            <div style={{ marginBottom: 20, padding: '16px 20px', borderRadius: 10, backgroundColor: '#FEF9E7', border: '1px solid #F9E79F' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlertTriangle size={16} color="#E67E22" />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#E67E22' }}>Capacité réduite</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.reduced.map((r: any) => (
                  <span key={r.role} style={{ fontSize: 12, fontWeight: 700, color: '#E67E22', backgroundColor: '#FFFFFF', border: '1px solid #F9E79F', padding: '4px 10px', borderRadius: 6 }}>
                    {ROLE_LABELS[r.role] || r.role} — {r.present}/{r.total}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tableau par rôle */}
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Couverture par rôle</h2>
            </div>
            {data.roleCoverage.map((role: any, i: number) => {
              const pct = role.total > 0 ? Math.round((role.present / role.total) * 100) : 0;
              const color = role.present === 0 ? '#C0392B' : pct < 100 ? '#E67E22' : '#27AE60';
              return (
                <div key={role.role} style={{ padding: '16px 20px', borderBottom: i < data.roleCoverage.length - 1 ? '1px solid #F1F3F5' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{ROLE_LABELS[role.role] || role.role}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>
                      {role.present} / {role.total} présent{role.present !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Barre de progression */}
                  <div style={{ height: 6, backgroundColor: '#F1F3F5', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  {/* Membres */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {role.members.map((m: any) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        backgroundColor: m.isPresent ? '#EAFAF1' : '#F8F9FA',
                        border: `1px solid ${m.isPresent ? '#A9DFBF' : '#E9ECEF'}`,
                        color: m.isPresent ? '#27AE60' : '#ADB5BD' }}>
                        {m.isPresent
                          ? <CheckCircle size={12} color="#27AE60" />
                          : <XCircle size={12} color="#DEE2E6" />}
                        {m.firstName} {m.lastName}
                        {m.assignType === 'ALTERNATE' && <span style={{ fontSize: 10, color: '#ADB5BD' }}>(sub.)</span>}
                        {m.zone && <span style={{ fontSize: 10, color: '#ADB5BD' }}>— {m.zone}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Note refresh */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#ADB5BD' }}>
            Données actualisées automatiquement toutes les 30 secondes · Basé sur les pointages Sentinelle du jour
          </p>
        </>
      )}

      {/* Lien gestion employés */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/employes`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
          Gérer l'équipe d'urgence →
        </button>
      </div>
    </PortalLayout>
  );
}