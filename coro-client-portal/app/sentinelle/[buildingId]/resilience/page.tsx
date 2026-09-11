'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Users, FileText, Zap } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const STATUS_CONFIG = {
  READY:    { label: 'OPÉRATIONNEL',    color: '#27AE60', bg: '#EAFAF1', border: '#A9DFBF', icon: '🟢' },
  REDUCED:  { label: 'CAPACITÉ RÉDUITE', color: '#E67E22', bg: '#FEF9E7', border: '#F9E79F', icon: '🟠' },
  CRITICAL: { label: 'CRITIQUE',         color: '#C0392B', bg: '#FDEDEC', border: '#F1948A', icon: '🔴' },
};

const ROLE_LABELS: Record<string, string> = {
  COORDINATOR: 'Coordonnateur', EPI: 'Équipe première intervention',
  ASSEMBLY_WARDEN: 'Resp. rassemblement', SEARCHER: 'Chercheur',
  EXIT_WARDEN: 'Surveillant sortie', PNA_ESCORT: 'Accompagnateur PNA', FIRST_AIDER: 'Secouriste',
};

const REC_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  CRITICAL: { color: '#C0392B', bg: '#FDEDEC', icon: '🔴' },
  WARNING:  { color: '#E67E22', bg: '#FEF9E7', icon: '🟠' },
  INFO:     { color: '#2980B9', bg: '#EBF5FB', icon: '🔵' },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ height: 6, backgroundColor: '#F1F3F5', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${score}%`, backgroundColor: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function ComponentCard({ label, score, weight, icon }: { label: string; score: number; weight: number; icon: string }) {
  const color = score >= 85 ? '#27AE60' : score >= 60 ? '#E67E22' : '#C0392B';
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: '1px solid #E9ECEF', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>{icon} {label}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color }}>{score}%</span>
      </div>
      <ScoreBar score={score} color={color} />
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#ADB5BD' }}>Poids : {weight}%</p>
    </div>
  );
}

export default function ResiliencePage() {
  const router  = useRouter();
  const params  = useParams();
  const buildingId = params.buildingId as string;

  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [kioskToken, setKioskToken] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'intel'>('overview');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    init();
  }, [buildingId]);

  const init = async () => {
    try {
      const kiosk = await apiGet(`/occupancy/buildings/${buildingId}/kiosk-token`);
      setKioskToken(kiosk.token);
      await fetchData(kiosk.token);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchData = useCallback(async (token?: string) => {
    const t = token || kioskToken;
    if (!t) return;
    try {
      const res = await fetch(`${API}/occupancy/buildings/${buildingId}/readiness-enriched?token=${t}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }, [buildingId, kioskToken]);

  useEffect(() => {
    if (!kioskToken) return;
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [kioskToken, fetchData]);

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Analyse en cours...</p>
      </div>
    </PortalLayout>
  );

  if (!data || data.totalMembers === 0) return (
    <PortalLayout>
      <header style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0 }}>
          ← Retour au registre
        </button>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 800, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={22} color="#C0392B" /> Résilience opérationnelle
        </h1>
      </header>
      <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
        <Users size={36} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune équipe d'urgence configurée</p>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#ADB5BD' }}>Assignez des rôles d'urgence aux employés pour activer l'analyse de résilience.</p>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/employes`)}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Configurer les employés →
        </button>
      </div>
    </PortalLayout>
  );

  const enriched  = data.enriched || {};
  const enrichedStatus = enriched.status || data.status;
  const scfg = STATUS_CONFIG[enrichedStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.READY;
  const criticalCount = (data.recommendations || []).filter((r: any) => r.type === 'CRITICAL').length;
  const components = enriched.components || {};

  return (
    <PortalLayout>
      {/* En-tête */}
      <header style={{ marginBottom: 20 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdate && <span style={{ fontSize: 11, color: '#ADB5BD' }}>Mis à jour {lastUpdate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
            <button type="button" onClick={() => fetchData()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>
        </div>
      </header>

      {/* Indice CORO enrichi */}
      <div style={{ marginBottom: 16, padding: '20px 24px', borderRadius: 12, border: `2px solid ${scfg.border}`, backgroundColor: scfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{scfg.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: scfg.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Indice CORO de résilience</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: scfg.color }}>{scfg.label}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: scfg.color, lineHeight: 1 }}>{enriched.score ?? data.readinessIndex}%</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Score global pondéré</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>
              {data.presentMembers}<span style={{ fontSize: 18, color: '#ADB5BD' }}>/{data.totalMembers}</span>
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Membres présents</p>
          </div>
          {criticalCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#C0392B', lineHeight: 1 }}>{criticalCount}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Alerte(s) critique(s)</p>
            </div>
          )}
        </div>
      </div>

      {/* 4 composantes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <ComponentCard label="Couverture des rôles"  score={components.roles?.score ?? data.readinessIndex} weight={40} icon="🛡️" />
        <ComponentCard label="Qualifications"        score={components.qualifications?.score ?? 0}           weight={20} icon="🎓" />
        <ComponentCard label="Plans approuvés"       score={components.plans?.score ?? 0}                    weight={25} icon="📄" />
        <ComponentCard label="Exercices (CNPI)"      score={components.exercises?.score ?? 0}                weight={15} icon="🔔" />
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #E9ECEF', paddingBottom: 1 }}>
        {([
          { key: 'overview', label: '📊 Vue générale' },
          { key: 'roles',    label: '🛡️ Couverture rôles' },
          { key: 'intel',    label: `💡 Intelligence${(data.recommendations || []).length > 0 ? ` (${data.recommendations.length})` : ''}` },
        ] as const).map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            style={{ padding: '8px 16px', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent', backgroundColor: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? '#C0392B' : '#6C757D', marginBottom: -1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Vue générale ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
          {/* Plans */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} color="#6C757D" />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Plans de mesures d'urgence</h2>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {data.plansAnalysis?.hasPlan ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#2C3E50' }}>{data.plansAnalysis.planType}</span>
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: data.plansAnalysis.isPlanValid ? '#27AE60' : '#C0392B',
                      backgroundColor: data.plansAnalysis.isPlanValid ? '#EAFAF1' : '#FDEDEC',
                      padding: '2px 8px', borderRadius: 4 }}>
                      {data.plansAnalysis.planStatus}
                    </span>
                  </div>
                  {data.plansAnalysis.daysSincePlan !== null && (
                    <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>
                      Mis à jour il y a {Math.floor(data.plansAnalysis.daysSincePlan / 30)} mois
                      {data.plansAnalysis.daysSincePlan > 365 ? ' ⚠️' : ' ✓'}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>❌ Aucun plan actif</p>
              )}
            </div>
          </div>

          {/* Exercices */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>🔔</span>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Exercices d'évacuation</h2>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {data.exercisesAnalysis?.lastExerciseDate ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#2C3E50' }}>
                      {new Date(data.exercisesAnalysis.lastExerciseDate).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: data.exercisesAnalysis.isExerciseCurrent ? '#27AE60' : '#C0392B',
                      backgroundColor: data.exercisesAnalysis.isExerciseCurrent ? '#EAFAF1' : '#FDEDEC',
                      padding: '2px 8px', borderRadius: 4 }}>
                      {data.exercisesAnalysis.isExerciseCurrent ? 'Conforme CNPI' : 'Expiré'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>
                    {data.exercisesAnalysis.daysSinceExercise} jours écoulés · {data.exercisesAnalysis.totalExercises} exercice(s) au total
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>❌ Aucun exercice enregistré</p>
              )}
            </div>
          </div>

          {/* Qualifications */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>🎓</span>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Qualifications présentes</h2>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Premiers soins / RCR', ok: data.qualificationsAnalysis?.hasFirstAid },
                { label: 'Défibrillateur (DEA)',  ok: data.qualificationsAnalysis?.hasAed },
              ].map(q => (
                <div key={q.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#2C3E50' }}>{q.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: q.ok ? '#27AE60' : '#C0392B' }}>
                    {q.ok ? '✅ Présent' : '❌ Absent'}
                  </span>
                </div>
              ))}
              {data.qualificationsAnalysis && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD', borderTop: '1px solid #F1F3F5', paddingTop: 8 }}>
                  {data.qualificationsAnalysis.membersWithCriticalQuals} / {data.qualificationsAnalysis.totalPresentEmergencyMembers} membres présents avec qualifications critiques
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Couverture rôles ── */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Lacunes */}
          {data.gaps?.length > 0 && (
            <div style={{ padding: '14px 20px', borderRadius: 10, backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <XCircle size={15} color="#C0392B" />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#C0392B' }}>Lacunes critiques — Aucun membre présent</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.gaps.map((g: any) => (
                  <span key={g.role} style={{ fontSize: 12, fontWeight: 700, color: '#C0392B', backgroundColor: '#FFFFFF', border: '1px solid #F1948A', padding: '3px 10px', borderRadius: 6 }}>
                    {ROLE_LABELS[g.role] || g.role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Substitutions */}
          {data.substitutions?.length > 0 && (
            <div style={{ padding: '14px 20px', borderRadius: 10, backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Shield size={15} color="#2980B9" />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2980B9' }}>Substitutions automatiques actives</p>
              </div>
              {data.substitutions.map((r: any) => (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2C3E50' }}>{ROLE_LABELS[r.role] || r.role}</span>
                  <span style={{ fontSize: 12, color: '#ADB5BD' }}>→</span>
                  <span style={{ fontSize: 12, color: '#ADB5BD', textDecoration: 'line-through' }}>{r.primaryMember?.firstName} {r.primaryMember?.lastName} (absent)</span>
                  <span style={{ fontSize: 12, color: '#ADB5BD' }}>→</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2980B9' }}>{r.effectiveMember?.firstName} {r.effectiveMember?.lastName}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2980B9', backgroundColor: '#FFFFFF', border: '1px solid #AED6F1', padding: '2px 7px', borderRadius: 4 }}>Substitut actif</span>
                </div>
              ))}
            </div>
          )}

          {/* Tableau rôles */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E9ECEF' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Détail par rôle</h2>
            </div>
            {(data.roleCoverage || []).map((role: any, i: number) => {
              const pct   = role.total > 0 ? Math.round((role.present / role.total) * 100) : 0;
              const color = role.present === 0 ? '#C0392B' : pct < 100 ? '#E67E22' : '#27AE60';
              return (
                <div key={role.role} style={{ padding: '14px 20px', borderBottom: i < data.roleCoverage.length - 1 ? '1px solid #F1F3F5' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{ROLE_LABELS[role.role] || role.role}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>{role.present}/{role.total}</span>
                  </div>
                  <div style={{ height: 5, backgroundColor: '#F1F3F5', borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {role.members.map((m: any) => {
                      const isEff = role.effectiveMember?.id === m.id;
                      const isSub = isEff && role.substitutionActive;
                      return (
                        <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          backgroundColor: isSub ? '#EBF5FB' : m.isPresent ? '#EAFAF1' : '#F8F9FA',
                          border: `1px solid ${isSub ? '#AED6F1' : m.isPresent ? '#A9DFBF' : '#E9ECEF'}`,
                          color: isSub ? '#2980B9' : m.isPresent ? '#27AE60' : '#ADB5BD' }}>
                          {m.isPresent ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {m.firstName} {m.lastName}
                          {isSub && <span style={{ fontSize: 9, fontWeight: 700 }}>★</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Intelligence organisationnelle ── */}
      {activeTab === 'intel' && (
        <div>
          {(data.recommendations || []).length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
              <CheckCircle size={36} color="#27AE60" style={{ margin: '0 auto 16px' }} />
              <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune recommandation</p>
              <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Ce bâtiment est pleinement opérationnel selon tous les critères CORO.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#ADB5BD' }}>
                {(data.recommendations || []).filter((r: any) => r.type === 'CRITICAL').length} critique(s) ·{' '}
                {(data.recommendations || []).filter((r: any) => r.type === 'WARNING').length} avertissement(s) ·{' '}
                {(data.recommendations || []).filter((r: any) => r.type === 'INFO').length} info(s)
              </p>
              {(data.recommendations || []).map((rec: any, i: number) => {
                const rcfg = REC_CONFIG[rec.type] || REC_CONFIG.INFO;
                const catIcons: Record<string, string> = {
                  ROLES: '🛡️', QUALIFICATIONS: '🎓', PLANS: '📄', EXERCISES: '🔔', INCIDENTS: '📋',
                };
                return (
                  <div key={i} style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: rcfg.bg, border: `1px solid ${rcfg.color}30` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{rcfg.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: rcfg.color, textTransform: 'uppercase' }}>
                            {catIcons[rec.category] || '•'} {rec.category}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>{rec.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={11} color={rcfg.color} />
                          <p style={{ margin: 0, fontSize: 12, color: '#6C757D' }}>{rec.action}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: '#ADB5BD', marginTop: 20 }}>
        Auto-actualisation 30 s · Score pondéré : rôles 40% + qualifications 20% + plans 25% + exercices 15%
      </p>
    </PortalLayout>
  );
}