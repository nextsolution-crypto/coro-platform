'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser, type ClientUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { Building2, FileText, MapPin, Users } from 'lucide-react';

export default function BuildingsPage() {
  const router = useRouter();
  const [user] = useState<ClientUser | null>(() => getUser());
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/client-portal/buildings') as BuildingSummary[];
      setBuildings(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les bâtiments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    // The initial authenticated load is intentionally driven by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBuildings();
  }, [fetchBuildings, router, user]);

  if (loading || !user) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      {/* En-tête */}
      <header style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Mes bâtiments
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 28px)', lineHeight: 1.2, fontWeight: 800, color: '#2C3E50' }}>
          {buildings.length} bâtiment{buildings.length !== 1 ? 's' : ''}
        </h1>
      </header>

      {/* Liste */}
      {error ? (
        <div role="alert" style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #F1948A', padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#C0392B', margin: '0 0 16px' }}>{error}</p>
          <button type="button" onClick={fetchBuildings}>Réessayer</button>
        </div>
      ) : buildings.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', padding: 48, textAlign: 'center' }}>
          <Building2 size={40} color="#DEE2E6" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: 0, color: '#ADB5BD', fontSize: 15 }}>Aucun bâtiment associé à votre compte.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {buildings.map((b) => (
            <div key={b.id} style={{
              backgroundColor: '#FFFFFF', borderRadius: 12,
              border: '1px solid #E9ECEF', overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              flex: '1 1 340px', minWidth: 0, maxWidth: 445,
              width: '100%', boxSizing: 'border-box',
            }}>
              {/* Photo ou placeholder */}
              {b.photoBase64 ? (
                <img src={b.photoBase64} alt={b.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: 160, backgroundColor: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={40} color="#AED6F1" />
                </div>
              )}

              {/* Contenu */}
              <div style={{ padding: '20px 20px 16px' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
                  {b.name}
                </h2>
                {b.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 16 }}>
                    <MapPin size={13} color="#ADB5BD" style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 13, color: '#6C757D', lineHeight: 1.4 }}>
                      {b.address}{b.city ? `, ${b.city}` : ''}{b.province ? `, ${b.province}` : ''}
                    </p>
                  </div>
                )}

                {/* Métriques */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '12px 0', borderTop: '1px solid #F1F3F5', borderBottom: '1px solid #F1F3F5' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>{b.projectCount || 0}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD' }}>dossier{(b.projectCount || 0) !== 1 ? 's' : ''} de conformité</p>
                  </div>
                  <div style={{ width: 1, backgroundColor: '#F1F3F5' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#27AE60', lineHeight: 1 }}>{b.validatedCount || 0}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD' }}>validé{(b.validatedCount || 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ width: 1, backgroundColor: '#F1F3F5' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#2980B9', lineHeight: 1 }}>{b.activeCount || 0}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD' }}>en cours</p>
                  </div>
                </div>

                {/* Responsable */}
                {(b.responsableFirstName || b.responsableLastName) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Users size={13} color="#ADB5BD" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 13, color: '#6C757D' }}>
                      {b.responsableFirstName} {b.responsableLastName}
                      {b.responsableTitre && <span style={{ color: '#ADB5BD' }}> — {b.responsableTitre}</span>}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/buildings/${b.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                      backgroundColor: '#EBF5FB', color: '#2980B9',
                      border: '1px solid #AED6F1', cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D6EAF8'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                  >
                    <FileText size={14} />
                    Ouvrir le bâtiment
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/sentinelle/${b.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                      backgroundColor: '#FDEDEC', color: '#C0392B',
                      border: '1px solid #F1948A', cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FADBD8'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                  >
                    🚨 Sentinelle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}

interface BuildingSummary {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  photoBase64?: string | null;
  projectCount?: number;
  validatedCount?: number;
  activeCount?: number;
  responsableFirstName?: string | null;
  responsableLastName?: string | null;
  responsableTitre?: string | null;
}
