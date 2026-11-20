'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, getUser, getToken } from '../../store/auth';
import { requestPanic, panicFailureCode, type PanicOutcome } from './panicOutcome';
import PortalLayout from '../../components/PortalLayout';
import {
  Users, UserCheck, UserX, Clock, AlertTriangle,
  RefreshCw, QrCode, Shield, ChevronRight, Copy, Radio,
  RadioTower
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  EMPLOYE:     { label: 'Employé',     color: '#2980B9', bg: '#EBF5FB' },
  VISITEUR:    { label: 'Visiteur',    color: '#8E44AD', bg: '#F5EEF8' },
  CONTRACTEUR: { label: 'Contracteur', color: '#E67E22', bg: '#FEF5E7' },
};

export default function SentinelleDashboard() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<any>(null);
  const [kioskToken, setKioskToken] = useState<string | null>(null);
  const [alarmToken, setAlarmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alarmCopied, setAlarmCopied] = useState(false);
  const [regeneratingAlarm, setRegeneratingAlarm] = useState(false);
  const [showAlarmToken, setShowAlarmToken] = useState(false);
  const [activeEvacuation, setActiveEvacuation] = useState<any>(null);
  const [triggeringEvac, setTriggeringEvac] = useState(false);
  const [panicMode, setPanicMode]           = useState(false);
  const [panicSending, setPanicSending]     = useState(false);
  const [panicResult, setPanicResult]       = useState<PanicOutcome | null>(null);
  const [panicConfirmOpen, setPanicConfirmOpen] = useState(false);
  const [populationStatus, setPopulationStatus] = useState<any>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchAll();
  }, [buildingId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. D'abord récupérer le token kiosque
      const kioskRes = await apiGet(`/client-portal/buildings/${buildingId}/sentinelle/kiosk-token`);
      const token = kioskRes.token;
      setKioskToken(token);
      // 2. Ensuite fetcher avec le token
      await Promise.all([
        fetchOccupancyWithToken(token),
        fetchActiveEvacuation(),
        fetchAlarmToken(),
        fetchPopulationStatus(),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupancyWithToken = async (token: string) => {
    try {
      const res = await apiGet(`/occupancy/buildings/${buildingId}/current-public?token=${token}`);
      setOccupancy(res);
    } catch (err) { console.error(err); }
  };

  const fetchOccupancy = async () => {
    if (!kioskToken) return;
    await fetchOccupancyWithToken(kioskToken);
  };

  const fetchActiveEvacuation = async () => {
    try {
      const res = await apiGet(`/client-portal/buildings/${buildingId}/sentinelle/evacuation/active`);
      setActiveEvacuation(res);
    } catch (err) { setActiveEvacuation(null); }
  };

  const fetchAlarmToken = async () => {
    try {
      const res = await apiGet(`/client-portal/buildings/${buildingId}/sentinelle/alarm-token`);
      setAlarmToken(res.token);
    } catch (err) { console.error(err); }
  };

  const fetchPopulationStatus = async () => {
    try {
      const res = await apiGet(`/client-portal/buildings/${buildingId}/population/status`);
      setPopulationStatus(res);
    } catch {
      setPopulationStatus(null);
    }
  };

  const handleCopyAlarmUrl = () => {
    if (!alarmToken) return;
    navigator.clipboard.writeText(`${API_URL}/occupancy/alarm-trigger/${alarmToken}`);
    setAlarmCopied(true);
    setTimeout(() => setAlarmCopied(false), 2000);
  };

  const handleRegenerateAlarmToken = async () => {
    if (!confirm("Régénérer le jeton du pont panneau d'alarme ?\n\nL'ancienne adresse cessera de fonctionner immédiatement — le dispositif installé devra être reconfiguré avec la nouvelle.")) return;
    setRegeneratingAlarm(true);
    try {
      const res = await apiPost(`/client-portal/buildings/${buildingId}/sentinelle/alarm-token/regenerate`, {});
      setAlarmToken(res.token);
    } catch { alert('Erreur lors de la régénération.'); }
    finally { setRegeneratingAlarm(false); }
  };

  // Rafraîchissement automatique toutes les 30 secondes
  useEffect(() => {
    if (!kioskToken) return;
    const interval = setInterval(() => {
      fetchOccupancy();
      fetchActiveEvacuation();
    }, 30000);
    return () => clearInterval(interval);
  }, [kioskToken]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOccupancy();
    await fetchActiveEvacuation();
    setRefreshing(false);
  };

  const handleCopyKioskUrl = () => {
    if (!kioskToken) return;
    const url = `${window.location.origin}/kiosk/${kioskToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerEvacuation = async () => {
    if (!confirm('⚠️ Déclencher le mode évacuation pour ce bâtiment ?\n\nUn snapshot de tous les occupants présents sera figé immédiatement.')) return;
    setTriggeringEvac(true);
    try {
      await apiPost(`/client-portal/buildings/${buildingId}/sentinelle/evacuation/trigger`, {
        triggeredBy: `${user?.firstName} ${user?.lastName}`,
      });
      await fetchActiveEvacuation();
    } catch (err) {
      alert('Erreur lors du déclenchement.');
    } finally {
      setTriggeringEvac(false);
    }
  };

  // Bouton panique : l'écran n'affiche un succès que si le serveur confirme
  // au moins un contact. Tout autre cas renvoie immédiatement vers le 911.
  const handlePanic = async () => {
    setPanicConfirmOpen(false);
    setPanicSending(true);
    const outcome = await requestPanic({
      fetchImpl: (input, init) => fetch(input, init),
      apiUrl: API_URL,
      buildingId,
      token: getToken(),
      payload: { triggeredBy: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(), emergencyType: 'URGENCE — ASSISTANCE REQUISE' },
    });
    setPanicResult(outcome);
    setPanicMode(true);
    setPanicSending(false);
  };

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

  const { total = 0, byType = {}, records = [] } = occupancy || {};
  const kioskUrl = kioskToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/kiosk/${kioskToken}` : '';

  return (
    <PortalLayout>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}
        >
          ← Retour au tableau de bord
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CORO Sentinelle
            </p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50' }}>
              Registre d&apos;occupation
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF',
                cursor: 'pointer', fontSize: 13, color: '#6C757D', fontWeight: 600,
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            {!activeEvacuation && (
              <button
                type="button"
                onClick={handleTriggerEvacuation}
                disabled={triggeringEvac}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: 'none', backgroundColor: '#C0392B',
                  cursor: triggeringEvac ? 'not-allowed' : 'pointer',
                  fontSize: 13, color: '#FFFFFF', fontWeight: 700,
                  opacity: triggeringEvac ? 0.7 : 1,
                }}
              >
                <AlertTriangle size={14} />
                {triggeringEvac ? 'Déclenchement...' : '🚨 Évacuation'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Bannière évacuation active ── */}
      {activeEvacuation && (
        <div style={{
          marginBottom: 20, padding: '16px 20px',
          backgroundColor: '#FDEDEC', border: '2px solid #C0392B',
          borderRadius: 12, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={24} color="#C0392B" />
            <div>
              <p style={{ margin: 0, fontWeight: 800, color: '#C0392B', fontSize: 15 }}>
                🚨 ÉVACUATION EN COURS
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6C757D' }}>
                {activeEvacuation.accounted} / {activeEvacuation.totalPresent} comptabilisés
                — {activeEvacuation.missing} manquant{activeEvacuation.missing !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/sentinelle/${buildingId}/evacuation`)}
            style={{
              padding: '10px 18px', borderRadius: 8,
              border: 'none', backgroundColor: '#C0392B',
              color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Mode dénombrement →
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        {/* Total */}
        <div style={{ backgroundColor: '#2C3E50', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
          <Users size={20} color="#FFFFFF" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{total}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ADB5BD' }}>présents</p>
        </div>
        {/* Par type */}
        {Object.entries(TYPE_LABELS).map(([type, cfg]) => (
          <div key={type} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '20px 16px', textAlign: 'center', border: '1px solid #E9ECEF' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {cfg.label}s
            </p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
              {byType[type] || 0}
            </p>
          </div>
        ))}
      </section>

      {/* ── Navigation ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/employes`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
          👤 Employés & QR codes
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/invitations`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
          📧 Invitations visiteurs
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/historique`)}
          style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
          📋 Historique des présences
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/rapports`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
          🚨 Rapports évacuation
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/resilience`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '2px solid #C0392B', backgroundColor: '#FDEDEC', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#C0392B' }}>
          🛡️ Résilience opérationnelle
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/incident`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '2px solid #E67E22', backgroundColor: '#FEF9E7', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#E67E22' }}>
          🚨 Déclencher un incident
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/incidents`)}
          style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6C757D' }}>
          📋 Historique des incidents
        </button>
      </div>

      {/* ── Sentinelle Population ── */}
      {populationStatus?.eligible && (
        <section
          style={{
            marginBottom: 20,
            borderRadius: 14,
            overflow: 'hidden',
            border: populationStatus.populationEnabled
              ? '1px solid #B8D8D0'
              : '1px solid #E9ECEF',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 6,
                backgroundColor: populationStatus.populationEnabled
                  ? '#167D6A'
                  : '#ADB5BD',
                flexShrink: 0,
              }}
            />

            <div
              style={{
                flex: 1,
                minWidth: 260,
                padding: '20px 22px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: populationStatus.populationEnabled
                      ? '#E8F5F1'
                      : '#F1F3F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <RadioTower
                    size={21}
                    color={
                      populationStatus.populationEnabled
                        ? '#167D6A'
                        : '#6C757D'
                    }
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: '#2C3E50',
                      }}
                    >
                      Sentinelle Population
                    </h2>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        backgroundColor: '#FDEDEC',
                        color: '#C0392B',
                      }}
                    >
                      RUE / E2
                    </span>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        backgroundColor: populationStatus.populationEnabled
                          ? '#E8F5F1'
                          : '#F1F3F5',
                        color: populationStatus.populationEnabled
                          ? '#167D6A'
                          : '#6C757D',
                      }}
                    >
                      {populationStatus.programStatus || 'À CONFIGURER'}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: 720,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: '#6C757D',
                    }}
                  >
                    Préparer, cibler et diffuser les communications d&apos;urgence
                    destinées à la population potentiellement touchée autour du site.
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(`/sentinelle/${buildingId}/population`)
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#167D6A',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                Ouvrir le module
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── URL Borne kiosque ── */}
      {kioskToken && (
        <div style={{
          marginBottom: 20, padding: '14px 18px',
          backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF',
          borderRadius: 12, display: 'flex',
          alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <QrCode size={18} color="#6C757D" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase' }}>
              URL de la borne kiosque
            </p>
            <p style={{
              margin: '2px 0 0', fontSize: 12, color: '#6C757D',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {kioskUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyKioskUrl}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 6,
              border: '1px solid #E9ECEF', backgroundColor: copied ? '#EAFAF1' : '#F8F9FA',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: copied ? '#27AE60' : '#6C757D', flexShrink: 0,
            }}
          >
            <Copy size={12} />
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      )}

      {/* ── Pont panneau d'alarme incendie ── */}
      <div style={{
        marginBottom: 20, padding: '14px 18px',
        backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF',
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Radio size={18} color="#6C757D" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase' }}>
              Pont panneau d&apos;alarme incendie
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>
              Adresse à configurer dans le dispositif IoT relié au panneau — un signal déclenche une pré-alerte automatique.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAlarmToken(!showAlarmToken)}
            style={{
              padding: '7px 12px', borderRadius: 6,
              border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6C757D', flexShrink: 0,
            }}
          >
            {showAlarmToken ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {showAlarmToken && alarmToken && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F3F5' }}>
            <p style={{
              margin: '0 0 10px', fontSize: 12, color: '#2C3E50',
              fontFamily: 'monospace', backgroundColor: '#F8F9FA',
              padding: '10px 12px', borderRadius: 6, wordBreak: 'break-all',
            }}>
              POST {API_URL}/occupancy/alarm-trigger/{alarmToken}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopyAlarmUrl}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 6,
                  border: '1px solid #E9ECEF', backgroundColor: alarmCopied ? '#EAFAF1' : '#F8F9FA',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: alarmCopied ? '#27AE60' : '#6C757D',
                }}
              >
                <Copy size={12} />
                {alarmCopied ? 'Copié !' : 'Copier'}
              </button>
              <button
                type="button"
                onClick={handleRegenerateAlarmToken}
                disabled={regeneratingAlarm}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 6,
                  border: '1px solid #F1948A', backgroundColor: '#FDEDEC',
                  cursor: regeneratingAlarm ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                  color: '#C0392B', opacity: regeneratingAlarm ? 0.6 : 1,
                }}
              >
                <RefreshCw size={12} className={regeneratingAlarm ? 'animate-spin' : ''} />
                {regeneratingAlarm ? 'Régénération...' : 'Régénérer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Liste des occupants ── */}
      <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E9ECEF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
            Occupants présents
          </h2>
          <span style={{ fontSize: 12, color: '#ADB5BD' }}>
            Mis à jour automatiquement
          </span>
        </div>

        {records.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <UserCheck size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>
              Aucun occupant enregistré pour l&apos;instant.
            </p>
          </div>
        ) : (
          records.map((r: any, i: number) => {
            const cfg = TYPE_LABELS[r.type] || TYPE_LABELS.VISITEUR;
            const heureArrivee = new Date(r.checkedInAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={r.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: i < records.length - 1 ? '1px solid #F1F3F5' : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: cfg.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 16, fontWeight: 800, color: cfg.color,
                }}>
                  {r.firstName.charAt(0).toUpperCase()}
                </div>
                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>
                    {r.firstName} {r.lastName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.company ? `${r.company} · ` : ''}{r.reason || '—'}
                  </p>
                </div>
                {/* Type + heure */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 10,
                    backgroundColor: cfg.bg, color: cfg.color,
                    marginBottom: 4,
                  }}>
                    {cfg.label}
                  </span>
                  <p style={{ margin: 0, fontSize: 11, color: '#ADB5BD', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                    <Clock size={10} /> {heureArrivee}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </section>
    {/* ── Bouton panique flottant ── */}
      {!panicMode && (
        <button type="button" onClick={() => setPanicConfirmOpen(true)} disabled={panicSending} aria-label="Bouton panique — alerte d'urgence / Panic button — emergency alert"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 999,
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: panicSending ? '#E74C3C' : '#C0392B',
            color: '#FFFFFF', border: '3px solid #FFFFFF',
            boxShadow: '0 4px 20px rgba(192,57,43,0.5)',
            cursor: panicSending ? 'not-allowed' : 'pointer',
            fontSize: panicSending ? 22 : 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: panicSending ? 'none' : 'pulse 2s infinite',
          }}
          title="Bouton panique — Alerte d'urgence immédiate">
          {panicSending ? '⏳' : '🚨'}
        </button>
      )}

      {/* ── Confirmation panique (sans boîte native du navigateur) ── */}
      {panicConfirmOpen && !panicMode && (
        <div data-cg-emergency="" role="dialog" aria-modal="true" aria-labelledby="panic-confirm-title" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, maxWidth: 440, width: '100%', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
            <div style={{ backgroundColor: '#C0392B', padding: '20px 24px', textAlign: 'center' }}>
              <p id="panic-confirm-title" style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>BOUTON PANIQUE · PANIC BUTTON</p>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ margin: '0 0 8px', fontSize: 15, color: '#2C3E50', fontWeight: 600 }}>Envoyer une alerte d'urgence immédiate aux contacts d'urgence de ce bâtiment ?</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6C757D' }}>Send an immediate emergency alert to this building's emergency contacts?</p>
              <button type="button" onClick={handlePanic} autoFocus
                style={{ width: '100%', padding: 16, borderRadius: 10, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 18, fontWeight: 900, cursor: 'pointer', marginBottom: 10 }}>
                ENVOYER L'ALERTE · SEND ALERT
              </button>
              <button type="button" onClick={() => setPanicConfirmOpen(false)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Annuler · Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Résultat panique : succès seulement si le serveur le confirme ── */}
      {panicMode && panicResult && (
        <div data-cg-emergency="" role="alertdialog" aria-modal="true" aria-labelledby="panic-result-title" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, maxWidth: 440, width: '100%', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
            {panicResult.kind === 'CONFIRMED' ? (
              <>
                <div style={{ backgroundColor: '#C0392B', padding: '24px 28px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 48 }}>🚨</p>
                  <p id="panic-result-title" style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>ALERTE TRANSMISE · ALERT SENT</p>
                </div>
                <div style={{ padding: '28px 28px 24px' }}>
                  <div style={{ backgroundColor: '#FDEDEC', borderRadius: 10, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: '#C0392B' }}>{panicResult.notifiedCount}</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
                      personne{panicResult.notifiedCount > 1 ? 's' : ''} contactée{panicResult.notifiedCount > 1 ? 's' : ''} par le serveur · {panicResult.notifiedCount > 1 ? 'people' : 'person'} contacted by the server
                    </p>
                  </div>
                  {panicResult.address && <p style={{ margin: '0 0 6px', fontSize: 14, color: '#2C3E50', fontWeight: 600 }}>📍 {panicResult.address}</p>}
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6C757D' }}>Si personne ne répond, composez le 911. · If no one responds, call 911.</p>
                  <a href="tel:911"
                    style={{ display: 'block', textAlign: 'center', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '16px', borderRadius: 10, textDecoration: 'none', fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
                    📞 APPELER LE 911 · CALL 911
                  </a>
                  <button type="button" onClick={() => { setPanicMode(false); setPanicResult(null); }}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Fermer · Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ backgroundColor: '#7B1D14', padding: '24px 28px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 48 }}>⚠️</p>
                  <p id="panic-result-title" style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.25 }}>
                    ALERTE NON CONFIRMÉE<br />COMPOSEZ LE 911
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 700, color: '#F5B7B1' }}>ALERT NOT CONFIRMED — CALL 911</p>
                </div>
                <div style={{ padding: '24px 28px' }}>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: '#2C3E50' }}>
                    CORO n'a pas pu confirmer l'envoi de l'alerte. Ne comptez pas sur elle : appelez les secours vous-même.
                  </p>
                  <a href="tel:911"
                    style={{ display: 'block', textAlign: 'center', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '18px', borderRadius: 10, textDecoration: 'none', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>
                    📞 APPELER LE 911 · CALL 911
                  </a>
                  <button type="button" onClick={handlePanic} disabled={panicSending}
                    style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px solid #C0392B', backgroundColor: '#FFFFFF', color: '#C0392B', fontSize: 15, fontWeight: 800, cursor: panicSending ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
                    {panicSending ? 'Nouvel essai… · Retrying…' : 'Réessayer l\'alerte · Retry alert'}
                  </button>
                  <button type="button" onClick={() => { setPanicMode(false); setPanicResult(null); }}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Fermer · Close
                  </button>
                  <p style={{ margin: '12px 0 0', fontSize: 11, color: '#ADB5BD', textAlign: 'center' }}>Code : {panicFailureCode(panicResult)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(192,57,43,0.5); transform: scale(1); }
          50% { box-shadow: 0 4px 32px rgba(192,57,43,0.8); transform: scale(1.05); }
        }
      `}</style>
    </PortalLayout>
  );
}
