'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { FileText, X, Maximize2, Minimize2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT:       { bg: 'rgba(108,117,125,0.15)', text: '#ADB5BD', border: 'rgba(108,117,125,0.3)', label: 'Brouillon' },
  IN_PROGRESS: { bg: 'rgba(41,128,185,0.15)',  text: '#5DADE2', border: 'rgba(41,128,185,0.3)', label: 'En cours' },
  REVIEW:      { bg: 'rgba(243,156,18,0.15)',  text: '#F8C471', border: 'rgba(243,156,18,0.3)', label: 'En révision' },
  VALIDATED:   { bg: 'rgba(39,174,96,0.15)',   text: '#58D68D', border: 'rgba(39,174,96,0.3)',  label: 'Validé' },
  ARCHIVED:    { bg: 'rgba(192,57,43,0.15)',   text: '#EC7063', border: 'rgba(192,57,43,0.3)',  label: 'Archivé' },
};

const DOC_COLORS: Record<string, string> = {
  PMU: '#5DADE2', PSI: '#EC7063', PCA: '#58D68D',
  PGC: '#C39BD3', PRA: '#F0B27A', PUE: '#48C9B0',
};

function getBuildingStatus(building: any): { color: string; glow: string; label: string; priority: number } {
  const projects = building.projects || [];
  if (projects.length === 0) return { color: '#4A5568', glow: 'rgba(74,85,104,0.4)', label: 'Aucun document', priority: 3 };
  const hasExpired = projects.some((p: any) => {
    if (p.status !== 'VALIDATED') return false;
    const age = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return age > 1;
  });
  if (hasExpired) return { color: '#E74C3C', glow: 'rgba(231,76,60,0.5)', label: 'À renouveler', priority: 0 };
  const hasInProgress = projects.some((p: any) => ['DRAFT', 'IN_PROGRESS', 'REVIEW'].includes(p.status));
  if (hasInProgress) return { color: '#F39C12', glow: 'rgba(243,156,18,0.5)', label: 'En cours', priority: 1 };
  const allValidated = projects.every((p: any) => p.status === 'VALIDATED');
  if (allValidated) return { color: '#27AE60', glow: 'rgba(39,174,96,0.5)', label: 'À jour', priority: 2 };
  return { color: '#7F8C8D', glow: 'rgba(127,140,141,0.4)', label: 'Partiel', priority: 3 };
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
  const [mapReady, setMapReady] = useState(false);

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
    if (loading || !mapRef.current || buildings.length === 0 || mapInstanceRef.current) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => { initMap(); setMapReady(true); };
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

    const withCoords = buildings.filter(b => b.latitude && b.longitude);
    const defaultCenter: [number, number] = [46.0, -73.5];
    const center: [number, number] = withCoords.length > 0
      ? [
          withCoords.reduce((s, b) => s + b.latitude, 0) / withCoords.length,
          withCoords.reduce((s, b) => s + b.longitude, 0) / withCoords.length,
        ]
      : defaultCenter;

    const map = L.map(mapRef.current, {
      center,
      zoom: withCoords.length === 1 ? 14 : 9,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Tuiles OSM avec filtre CSS sombre — 100% gratuit, aucune clé requise
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });
    tileLayer.addTo(map);

    // Appliquer le filtre sombre via CSS sur le canvas Leaflet
    const style = document.createElement('style');
    style.textContent = `.leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7) contrast(0.9) !important; }`;
    document.head.appendChild(style);

    // Contrôle zoom en bas à droite
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Attribution discrète
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    // Marqueurs pulsants
    withCoords.forEach(building => {
      const status = getBuildingStatus(building);

      const markerHtml = `
        <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
          <div style="
            position:absolute;
            width:36px; height:36px;
            border-radius:50%;
            background:${status.color};
            opacity:0.2;
            animation:pulse 2s ease-out infinite;
          "></div>
          <div style="
            position:absolute;
            width:24px; height:24px;
            border-radius:50%;
            background:${status.color};
            opacity:0.4;
            animation:pulse 2s ease-out infinite;
            animation-delay:0.3s;
          "></div>
          <div style="
            position:relative;
            width:14px; height:14px;
            border-radius:50%;
            background:${status.color};
            border:2px solid rgba(255,255,255,0.8);
            box-shadow:0 0 12px ${status.glow}, 0 0 24px ${status.glow};
            z-index:10;
          "></div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([building.latitude, building.longitude], { icon });

      marker.on('click', () => {
        setSelected(building);
        map.panTo([building.latitude, building.longitude], { animate: true, duration: 0.5 });
      });

      marker.bindTooltip(`<span style="font-size:12px;font-weight:700;">${building.name}</span>`, {
        permanent: false,
        direction: 'top',
        offset: [0, -22],
        className: 'coro-dark-tooltip',
      });

      marker.addTo(map);
    });

    if (withCoords.length > 1) {
      const bounds = L.latLngBounds(withCoords.map((b: any) => [b.latitude, b.longitude]));
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  };

  if (loading || !user) {
    return (
      <PortalLayout>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 400, backgroundColor: '#0F1923', borderRadius: 12,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #C0392B', borderTopColor: 'transparent', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, color: '#4A5568', fontSize: 14 }}>Chargement de la carte...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  const withCoords = buildings.filter(b => b.latitude && b.longitude);
  const withoutCoords = buildings.filter(b => !b.latitude || !b.longitude);
  const selectedStatus = selected ? getBuildingStatus(selected) : null;

  const stats = {
    total: buildings.length,
    aJour: buildings.filter(b => getBuildingStatus(b).label === 'À jour').length,
    enCours: buildings.filter(b => getBuildingStatus(b).label === 'En cours').length,
    aRenouveler: buildings.filter(b => getBuildingStatus(b).label === 'À renouveler').length,
  };

  const mapContent = (
    <div style={{
      position: 'relative',
      height: fullscreen ? '100vh' : 'calc(100vh - 220px)',
      minHeight: 500,
      borderRadius: fullscreen ? 0 : 12,
      overflow: 'hidden',
      border: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.06)',
      backgroundColor: '#0F1923',
    }}>
      {/* Carte */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Header overlay sombre */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(15,25,35,0.95) 0%, rgba(15,25,35,0) 100%)',
        padding: '20px 20px 40px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        {/* Logo + titre */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4A5568', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Vue cartographique
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            {user?.clientName || 'Mes bâtiments'}
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, pointerEvents: 'all' }}>
          {[
            { value: stats.total, label: 'Bâtiments', color: '#FFFFFF' },
            { value: stats.aJour, label: 'À jour', color: '#27AE60' },
            { value: stats.enCours, label: 'En cours', color: '#F39C12' },
            { value: stats.aRenouveler, label: 'À renouveler', color: '#E74C3C' },
          ].map(k => (
            <div key={k.label} style={{
              textAlign: 'center', minWidth: 60,
              backgroundColor: 'rgba(15,25,35,0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '8px 12px',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div style={{
        position: 'absolute', top: 120, left: 16, zIndex: 1000,
        backgroundColor: 'rgba(15,25,35,0.9)',
        borderRadius: 10, padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}>
        {[
          { color: '#27AE60', glow: 'rgba(39,174,96,0.5)', label: 'À jour' },
          { color: '#F39C12', glow: 'rgba(243,156,18,0.5)', label: 'En cours' },
          { color: '#E74C3C', glow: 'rgba(231,76,60,0.5)', label: 'À renouveler' },
          { color: '#4A5568', glow: 'rgba(74,85,104,0.4)', label: 'Aucun document' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: item.color,
              boxShadow: `0 0 6px ${item.glow}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: '#8899AA' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Bouton plein écran */}
      <button
        type="button"
        onClick={() => setFullscreen(f => !f)}
        style={{
          position: 'absolute', bottom: 24, right: selected ? 396 : 16, zIndex: 1000,
          backgroundColor: 'rgba(15,25,35,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          transition: 'right 0.3s ease',
        }}
      >
        {fullscreen ? <Minimize2 size={15} color="#8899AA" /> : <Maximize2 size={15} color="#8899AA" />}
      </button>

      {/* Panneau latéral sombre */}
      {selected && selectedStatus && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 1000,
          width: 'min(380px, 100%)',
          backgroundColor: 'rgba(13,20,30,0.97)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header panneau */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: selectedStatus.color,
                    boxShadow: `0 0 8px ${selectedStatus.glow}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: selectedStatus.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {selectedStatus.label}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3 }}>
                  {selected.name}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#4A5568', lineHeight: 1.5 }}>
                  {selected.address}{selected.city ? `, ${selected.city}` : ''}{selected.province ? `, ${selected.province}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
              >
                <X size={16} color="#4A5568" />
              </button>
            </div>
          </div>

          {/* Métriques */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {[
              { value: selected.projectCount || 0, label: 'Documents', color: '#FFFFFF' },
              { value: selected.validatedCount || 0, label: 'Validés', color: '#27AE60' },
              { value: selected.activeCount || 0, label: 'En cours', color: '#F39C12' },
            ].map((m, i) => (
              <div key={m.label} style={{
                padding: '14px 0', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {selected.projects && selected.projects.length > 0 ? (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Documents
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.projects.map((p: any) => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;
                    const dc = DOC_COLORS[p.documentType] || '#4A5568';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push(`/documents/${p.id}`)}
                        style={{
                          width: '100%', textAlign: 'left', cursor: 'pointer',
                          padding: '11px 13px', borderRadius: 8,
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: 6,
                          backgroundColor: `${dc}22`,
                          border: `1px solid ${dc}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: dc }}>{p.documentType}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: '#4A5568' }}>{p.year}</p>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 7px',
                          borderRadius: 6, backgroundColor: sc.bg,
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
                <FileText size={28} color="#1E2D3D" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 13, color: '#4A5568' }}>Aucun document</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => router.push(`/documents?building=${selected.id}`)}
                style={{
                  padding: '10px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  backgroundColor: 'rgba(41,128,185,0.15)', color: '#5DADE2',
                  border: '1px solid rgba(41,128,185,0.3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(41,128,185,0.25)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(41,128,185,0.15)'}
              >
                <FileText size={13} />
                Documents
              </button>
              <button
                type="button"
                onClick={() => router.push(`/sentinelle/${selected.id}`)}
                style={{
                  padding: '10px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  backgroundColor: 'rgba(192,57,43,0.15)', color: '#EC7063',
                  border: '1px solid rgba(192,57,43,0.3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(192,57,43,0.25)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(192,57,43,0.15)'}
              >
                🚨 Sentinelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bande bâtiments en bas */}
      {!selected && buildings.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999,
          background: 'linear-gradient(to top, rgba(13,20,30,0.98) 0%, rgba(13,20,30,0) 100%)',
          padding: '40px 16px 16px',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto',
            paddingBottom: 4, pointerEvents: 'all',
          }}>
            {buildings.map(b => {
              const st = getBuildingStatus(b);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelected(b);
                    if (b.latitude && b.longitude && mapInstanceRef.current) {
                      mapInstanceRef.current.panTo([b.latitude, b.longitude], { animate: true });
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    width: 160, padding: '10px 12px',
                    backgroundColor: 'rgba(13,20,30,0.9)',
                    border: `1px solid ${st.color}44`,
                    borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    backdropFilter: 'blur(12px)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = st.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(13,20,30,0.9)';
                    e.currentTarget.style.borderColor = `${st.color}44`;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      backgroundColor: st.color,
                      boxShadow: `0 0 5px ${st.glow}`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 10, color: st.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {st.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.city || b.address}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#4A5568' }}>📄 {b.projectCount || 0}</span>
                    <span style={{ fontSize: 10, color: '#27AE60' }}>✓ {b.validatedCount || 0}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.4; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .coro-dark-tooltip {
          background: rgba(13,20,30,0.95) !important;
          color: #E2E8F0 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          padding: 5px 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
          backdrop-filter: blur(8px) !important;
        }
        .coro-dark-tooltip::before {
          border-top-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-container {
          background: #0F1923 !important;
        }
        .leaflet-control-zoom a {
          background: rgba(13,20,30,0.9) !important;
          color: #8899AA !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #FFFFFF !important;
        }
        .leaflet-control-attribution {
          background: rgba(13,20,30,0.7) !important;
          color: #4A5568 !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #4A5568 !important;
        }
      `}</style>
    </div>
  );

  return fullscreen ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#0F1923' }}>
      {mapContent}
    </div>
  ) : (
    <PortalLayout>
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Vue cartographique
            </p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, color: '#2C3E50' }}>
              Mes bâtiments
            </h1>
          </div>
          {withoutCoords.length > 0 && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0',
              fontSize: 12, color: '#F39C12',
            }}>
              ⚠️ {withoutCoords.length} bâtiment{withoutCoords.length > 1 ? 's' : ''} sans coordonnées GPS
            </div>
          )}
        </div>
      </header>

      {withCoords.length === 0 ? (
        <div style={{
          backgroundColor: '#0F1923', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 64, textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#4A5568' }}>
            Aucun bâtiment géolocalisé
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#2D3748' }}>
            Les coordonnées GPS sont calculées automatiquement à la création ou modification d'un bâtiment.
          </p>
        </div>
      ) : mapContent}
    </PortalLayout>
  );
}