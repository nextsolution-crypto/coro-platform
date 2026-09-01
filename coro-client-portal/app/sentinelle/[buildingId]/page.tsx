'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../../store/auth';
import PortalLayout from '../../components/PortalLayout';
import {
  Users, UserCheck, UserX, Clock, AlertTriangle,
  RefreshCw, QrCode, Shield, ChevronRight, Copy
} from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeEvacuation, setActiveEvacuation] = useState<any>(null);
  const [triggeringEvac, setTriggeringEvac] = useState(false);

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
      const kioskRes = await apiGet(`/occupancy/buildings/${buildingId}/kiosk-token`);
      const token = kioskRes.token;
      setKioskToken(token);
      // 2. Ensuite fetcher avec le token
      await Promise.all([
        fetchOccupancyWithToken(token),
        fetchActiveEvacuation(),
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
      const res = await apiGet(`/occupancy/buildings/${buildingId}/evacuation/active`);
      setActiveEvacuation(res);
    } catch (err) { setActiveEvacuation(null); }
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
      await apiPost('/occupancy/evacuation/trigger', {
        buildingId,
        triggeredBy: `${user?.firstName} ${user?.lastName}`,
      });
      await fetchActiveEvacuation();
    } catch (err) {
      alert('Erreur lors du déclenchement.');
    } finally {
      setTriggeringEvac(false);
    }
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
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
          📋 Historique
        </button>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/rapports`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
          🚨 Rapports évacuation
        </button>
      </div>

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
    </PortalLayout>
  );
}