'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, apiPut, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { CheckCircle, AlertTriangle, Users, UserX, Clock } from 'lucide-react';

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  EMPLOYE:     { label: 'Employé',     color: '#2980B9', bg: '#EBF5FB' },
  VISITEUR:    { label: 'Visiteur',    color: '#8E44AD', bg: '#F5EEF8' },
  CONTRACTEUR: { label: 'Contracteur', color: '#E67E22', bg: '#FEF5E7' },
};

export default function EvacuationPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [evacuation, setEvacuation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'missing' | 'accounted'>('all');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchEvacuation();
  }, [buildingId]);

  // Rafraîchissement toutes les 15 secondes
  useEffect(() => {
    const interval = setInterval(fetchEvacuation, 15000);
    return () => clearInterval(interval);
  }, [buildingId]);

  const fetchEvacuation = async () => {
    try {
      const res = await apiGet(`/occupancy/buildings/${buildingId}/evacuation/active`);
      setEvacuation(res);
    } catch {
      setEvacuation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountFor = async (occupantRecordId: string) => {
    if (!evacuation) return;
    try {
      await apiPost('/occupancy/evacuation/account', {
        evacuationEventId: evacuation.id,
        occupantRecordId,
        checkedBy: `${user?.firstName} ${user?.lastName}`,
      });
      // Optimistic update
      setEvacuation((prev: any) => ({
        ...prev,
        accounted: prev.accounted + 1,
        missing: prev.missing - 1,
        checkins: prev.checkins.map((c: any) =>
          c.occupantRecordId === occupantRecordId
            ? { ...c, isAccountedFor: true, checkedAt: new Date().toISOString() }
            : c
        ),
      }));
    } catch {
      alert('Erreur lors de la mise à jour.');
    }
  };

  const handleResolve = async () => {
    if (!evacuation) return;
    if (!confirm(`Clore l'évacuation ?\n\n${evacuation.missing} personne(s) non comptabilisée(s).\n\nCette action est irréversible.`)) return;
    setResolving(true);
    try {
      await apiPut(`/occupancy/evacuation/${evacuation.id}/resolve`, {});
      router.push(`/sentinelle/${buildingId}`);
    } catch {
      alert('Erreur lors de la clôture.');
      setResolving(false);
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

  if (!evacuation) {
    return (
      <PortalLayout>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>✅</p>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#2C3E50' }}>
            Aucune évacuation active
          </h2>
          <p style={{ margin: '0 0 24px', color: '#6C757D', fontSize: 14 }}>
            Il n&apos;y a pas d&apos;évacuation en cours pour ce bâtiment.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/sentinelle/${buildingId}`)}
            style={{
              padding: '12px 24px', borderRadius: 8,
              border: 'none', backgroundColor: '#2C3E50',
              color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← Retour au registre
          </button>
        </div>
      </PortalLayout>
    );
  }

  const checkins = evacuation.checkins || [];
  const filtered = checkins.filter((c: any) => {
    if (filter === 'missing')   return !c.isAccountedFor;
    if (filter === 'accounted') return c.isAccountedFor;
    return true;
  });
  const pct = evacuation.totalPresent > 0
    ? Math.round((evacuation.accounted / evacuation.totalPresent) * 100)
    : 0;

  return (
    <PortalLayout>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}
        >
          ← Retour au registre
        </button>
        <div style={{
          padding: '16px 20px', borderRadius: 12,
          backgroundColor: '#FDEDEC', border: '2px solid #C0392B',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={22} color="#C0392B" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#C0392B' }}>
              🚨 ÉVACUATION EN COURS
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>
              Déclenchée à {new Date(evacuation.triggeredAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
              {evacuation.triggeredBy ? ` par ${evacuation.triggeredBy}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResolve}
            disabled={resolving}
            style={{
              padding: '10px 16px', borderRadius: 8,
              border: 'none', backgroundColor: '#2C3E50',
              color: '#FFFFFF', fontSize: 12, fontWeight: 700,
              cursor: resolving ? 'not-allowed' : 'pointer',
              opacity: resolving ? 0.7 : 1, flexShrink: 0,
            }}
          >
            {resolving ? 'Clôture...' : 'Clore ✓'}
          </button>
        </div>
      </header>

      {/* ── Barre de progression ── */}
      <div style={{
        marginBottom: 20, padding: '20px 24px',
        backgroundColor: '#FFFFFF', borderRadius: 12,
        border: '1px solid #E9ECEF',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6C757D', fontWeight: 600 }}>Dénombrement</p>
            <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>
              {evacuation.accounted} <span style={{ fontSize: 16, color: '#ADB5BD', fontWeight: 500 }}>/ {evacuation.totalPresent}</span>
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: pct === 100 ? '#27AE60' : '#C0392B' }}>
            {pct}%
          </p>
        </div>
        {/* Barre */}
        <div style={{ height: 12, backgroundColor: '#F1F3F5', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            backgroundColor: pct === 100 ? '#27AE60' : '#C0392B',
            width: `${pct}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
        {/* Stats rapides */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} color="#27AE60" />
            <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 700 }}>{evacuation.accounted} comptabilisés</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserX size={14} color="#C0392B" />
            <span style={{ fontSize: 13, color: '#C0392B', fontWeight: 700 }}>{evacuation.missing} manquants</span>
          </div>
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#EAFAF1', borderRadius: 8, border: '1px solid #A9DFBF' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#27AE60', fontWeight: 700 }}>
              ✅ Tous les occupants sont comptabilisés. Vous pouvez clore l&apos;évacuation.
            </p>
          </div>
        )}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'all',       label: `Tous (${checkins.length})` },
          { key: 'missing',   label: `⚠️ Manquants (${evacuation.missing})` },
          { key: 'accounted', label: `✅ Comptabilisés (${evacuation.accounted})` },
        ].map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key as any)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: '1px solid',
              borderColor: filter === f.key ? '#2C3E50' : '#E9ECEF',
              backgroundColor: filter === f.key ? '#2C3E50' : '#FFFFFF',
              color: filter === f.key ? '#FFFFFF' : '#6C757D',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste dénombrement ── */}
      <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Users size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucun occupant dans cette catégorie.</p>
          </div>
        ) : (
          filtered.map((c: any, i: number) => {
            const r = c.occupantRecord;
            if (!r) return null;
            const cfg = TYPE_LABELS[r.type] || TYPE_LABELS.VISITEUR;
            const isOk = c.isAccountedFor;
            return (
              <div
                key={c.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #F1F3F5' : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                  backgroundColor: isOk ? '#FAFFFE' : '#FFFBFB',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  backgroundColor: isOk ? '#EAFAF1' : cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 16, fontWeight: 800,
                  color: isOk ? '#27AE60' : cfg.color,
                }}>
                  {isOk ? '✓' : r.firstName.charAt(0).toUpperCase()}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isOk ? '#27AE60' : '#2C3E50' }}>
                    {r.firstName} {r.lastName}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg.label}{r.company ? ` · ${r.company}` : ''}{r.floor ? ` · Étage ${r.floor}` : ''}
                  </p>
                  {isOk && c.checkedBy && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#27AE60' }}>
                      Comptabilisé par {c.checkedBy} à {new Date(c.checkedAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Action */}
                {!isOk ? (
                  <button
                    type="button"
                    onClick={() => handleAccountFor(r.id)}
                    style={{
                      padding: '10px 16px', borderRadius: 8,
                      border: 'none', backgroundColor: '#27AE60',
                      color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
                    }}
                  >
                    ✓ Présent
                  </button>
                ) : (
                  <CheckCircle size={22} color="#27AE60" style={{ flexShrink: 0 }} />
                )}
              </div>
            );
          })
        )}
      </section>
    </PortalLayout>
  );
}