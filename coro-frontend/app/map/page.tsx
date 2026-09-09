'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { FileText, CheckCircle, Clock, X, Maximize2, Minimize2 } from 'lucide-react';

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

function getBuildingStatus(building: any): { color: string; label: string; priority: number } {
  const projects = building.projects || [];
  if (projects.length === 0) return { color: '#ADB5BD', label: 'Aucun document', priority: 3 };
  const hasExpired = projects.some((p: any) => {
    if (p.status !== 'VALIDATED') return false;
    const age = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return age > 1;
  });
  if (hasExpired) return { color: '#C0392B', label: 'À renouveler', priority: 0 };
  const hasInProgress = projects.some((p: any) => ['DRAFT', 'IN_PROGRESS', 'REVIEW'].includes(p.status));
  if (hasInProgress) return { color: '#F39C12', label: 'En cours', priority: 1 };
  const allValidated = projects.every((p: any) => p.status === 'VALIDATED');
  if (allValidated) return { color: '#27AE60', label: 'À jour', priority: 2 };
  return { color: '#ADB5BD', label: 'Partiel', priority: 3 };
}

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [user, setUser] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchBuildings();
  }, [router]);

  const fetchBuildings = async () => {
    try {
      const res = await apiGet('/client-portal/buildings');
      setBuildings(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !mapRef.current || buildings.length === 0) return;
    if (mapInstanceRef.current) return;

    // Charger Leaflet dynamiquement
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, buildings]);

  const initMap = () => {
    const L = (window as any).L;
    if (!mapRef.current || !L) return;

    // Filtrer les bâtiments avec coordonnées
    const withCoords = buildings.filter(b => b.latitude && b.longitude);

    // Centre par défaut : Québec
    const defaultCenter: [number, number] = [46.8139, -71.2082];
    const center: [number, number] = withCoords.length > 0
      ? [
          withCoords.reduce((s, b) => s + b.latitude, 0) / withCoords.length,
          withCoords.reduce((s, b) => s + b.longitude, 0) / withCoords.length,
        ]
      : defaultCenter;

    const map = L.map(mapRef.current, {
      center,
      zoom: withCoords.length === 1 ? 14 : 10,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Marqueurs
    withCoords.forEach(building => {
      const status = getBuildingStatus(building);

      const markerHtml = `
        <div style="
          width: 40px; height: 40px;
          background: ${status.color};
          border: 3px solid #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="transform: rotate(45deg); color: white; font-size: 16px;">🏢</div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      const marker = L.marker([building.latitude, building.longitude], { icon });

      marker.on('click', () => {
        setSelected(building);
        map.panTo([building.latitude, building.longitude]);
      });

      marker.bindTooltip(building.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -42],
        className: 'coro-tooltip',
      });

      marker.addTo(map);
    });

    // Adapter les bounds si plusieurs bâtiments
    if (withCoords.length > 1) {
      const bounds = L.latLngBounds(withCoords.map((b: any) => [b.latitude, b.longitude]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  };

  if (loading || !user) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <p className="animate-pulse" style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Chargement de la carte...</p>
        </div>
      </PortalLayout>
    );
  }

  const withCoords = buildings.filter(b => b.latitude && b.longitude);
  const withoutCoords = buildings.filter(b => !b.latitude || !b.longitude);
  const selectedStatus = selected ? getBuildingStatus(selected) : null;

  const mapContent = (
    <div style={{
      position: 'relative',
      height: fullscreen ? '100vh' : 'calc(100vh - 180px)',
      minHeight: 500,
      borderRadius: fullscreen ? 0 : 12,
      overflow: 'hidden',
      border: fullscreen ? 'none' : '1px solid #E9ECEF',
      boxShadow: fullscreen ? 'none' : '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      {/* Carte */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Légende */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 10, padding: '12px 16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        backdropFilter: 'blur(8px)',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          État des documents
        </p>
        {[
          { color: '#27AE60', label: 'À jour' },
          { color: '#F39C12', label: 'En cours' },
          { color: '#C0392B', label: 'À renouveler' },
          { color: '#ADB5BD', label: 'Aucun document' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#495057' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Compteur */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 10, padding: '10px 16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>{withCoords.length}</span>
        <span style={{ fontSize: 13, color: '#6C757D' }}>bâtiment{withCoords.length !== 1 ? 's' : ''} sur la carte</span>
      </div>

      {/* Bouton plein écran */}
      <button
        type="button"
        onClick={() => setFullscreen(f => !f)}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 1000,
          backgroundColor: 'rgba(255,255,255,0.95)',
          border: '1px solid #E9ECEF', borderRadius: 8,
          width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}
      >
        {fullscreen ? <Minimize2 size={16} color="#2C3E50" /> : <Maximize2 size={16} color="#2C3E50" />}
      </button>

      {/* Panneau latéral bâtiment sélectionné */}
      {selected && selectedStatus && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 1000,
          width: 'min(380px, 100%)',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header panneau */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E9ECEF', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    display: 'inline-block', width: 10, height: 10,
                    borderRadius: '50%', backgroundColor: selectedStatus.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedStatus.color }}>
                    {selectedStatus.label}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#2C3E50', lineHeight: 1.3 }}>
                  {selected.name}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#6C757D', lineHeight: 1.4 }}>
                  {selected.address}{selected.city ? `, ${selected.city}` : ''}{selected.province ? `, ${selected.province}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
              >
                <X size={18} color="#ADB5BD" />
              </button>
            </div>
          </div>

          {/* Métriques */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderBottom: '1px solid #E9ECEF', flexShrink: 0 }}>
            {[
              { value: selected.projectCount || 0, label: 'Documents', color: '#2C3E50' },
              { value: selected.validatedCount || 0, label: 'Validés', color: '#27AE60' },
              { value: selected.activeCount || 0, label: 'En cours', color: '#2980B9' },
            ].map((m, i) => (
              <div key={m.label} style={{
                padding: '14px 0', textAlign: 'center',
                borderRight: i < 2 ? '1px solid #E9ECEF' : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ADB5BD' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {selected.projects && selected.projects.length > 0 ? (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Documents
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.projects.map((p: any) => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;
                    const dc = DOC_COLORS[p.documentType] || '#6C757D';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push(`/documents/${p.id}`)}
                        style={{
                          width: '100%', textAlign: 'left', cursor: 'pointer',
                          padding: '12px 14px', borderRadius: 8,
                          backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4F8'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 7,
                          backgroundColor: dc, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#FFFFFF' }}>{p.documentType}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#2C3E50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: '#ADB5BD' }}>{p.year}</p>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px',
                          borderRadius: 8, backgroundColor: sc.bg,
                          color: sc.text, border: `1px solid ${sc.border}`,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {sc.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <FileText size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Aucun document</p>
              </div>
            )}

            {/* Boutons actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => router.push(`/documents?building=${selected.id}`)}
                style={{
                  padding: '10px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  backgroundColor: '#EBF5FB', color: '#2980B9',
                  border: '1px solid #AED6F1', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <FileText size={14} />
                Documents
              </button>
              <button
                type="button"
                onClick={() => router.push(`/sentinelle/${selected.id}`)}
                style={{
                  padding: '10px 12px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  backgroundColor: '#FDEDEC', color: '#C0392B',
                  border: '1px solid #F1948A', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                🚨 Sentinelle
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .coro-tooltip {
          background: #2C3E50 !important;
          color: #FFFFFF !important;
          border: none !important;
          border-radius: 6px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          padding: 5px 10px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }
        .coro-tooltip::before {
          border-top-color: #2C3E50 !important;
        }
        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
        }
      `}</style>
    </div>
  );

  return fullscreen ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#F8F9FA' }}>
      {mapContent}
    </div>
  ) : (
    <PortalLayout>
      {/* En-tête */}
      <header style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Vue cartographique
            </p>
            <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: '#2C3E50' }}>
              Mes bâtiments
            </h1>
          </div>
          {/* Résumé statuts */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { color: '#27AE60', label: 'À jour', count: buildings.filter(b => getBuildingStatus(b).label === 'À jour').length },
              { color: '#F39C12', label: 'En cours', count: buildings.filter(b => getBuildingStatus(b).label === 'En cours').length },
              { color: '#C0392B', label: 'À renouveler', count: buildings.filter(b => getBuildingStatus(b).label === 'À renouveler').length },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>{s.count}</span>
                <span style={{ fontSize: 12, color: '#6C757D' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        {withoutCoords.length > 0 && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0',
            fontSize: 13, color: '#F39C12',
          }}>
            ⚠️ {withoutCoords.length} bâtiment{withoutCoords.length > 1 ? 's' : ''} sans coordonnées GPS — modifiez-les pour les afficher sur la carte.
          </div>
        )}
      </header>

      {/* Carte */}
      {withCoords.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12,
          border: '1px solid #E9ECEF', padding: 64, textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#6C757D' }}>
            Aucun bâtiment géolocalisé
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>
            Les coordonnées GPS sont calculées automatiquement à la création ou modification d'un bâtiment.
          </p>
        </div>
      ) : mapContent}
    </PortalLayout>
  );
}