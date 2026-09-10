'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { X, Maximize2, Minimize2, Users, Building2, FileText } from 'lucide-react';

const LICENSE_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  ESSAI_GRATUIT: { color: '#F39C12', glow: 'rgba(243,156,18,0.5)',  label: 'Essai gratuit' },
  STANDARD:      { color: '#2980B9', glow: 'rgba(41,128,185,0.5)',  label: 'Standard' },
  ENTREPRISE:    { color: '#27AE60', glow: 'rgba(39,174,96,0.5)',   label: 'Entreprise' },
};

export default function AdminMapPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { user, isAuthenticated } = useAuthStore();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [licenseFilter, setLicenseFilter] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return; }
    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/organizations/map/overview');
      setOrgs(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredOrgs = licenseFilter ? orgs.filter(o => o.licenseType === licenseFilter) : orgs;
  const withCoords = filteredOrgs.filter(o => o.latitude && o.longitude);

  useEffect(() => {
    if (loading || !mapRef.current || orgs.length === 0) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    initMap(filteredOrgs);
  }, [loading, filteredOrgs]);

  const initMap = (organizations: any[]) => {
    const L = (window as any).L;
    if (!L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap(organizations);
      document.head.appendChild(script);
      return;
    }
    if (!mapRef.current) return;

    const withC = organizations.filter(o => o.latitude && o.longitude);
    const center: [number, number] = withC.length > 0
      ? [withC.reduce((s, o) => s + o.latitude, 0) / withC.length,
         withC.reduce((s, o) => s + o.longitude, 0) / withC.length]
      : [46.5, -72.5];

    const map = L.map(mapRef.current, { center, zoom: 7, zoomControl: false, attributionControl: false });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);

    if (!document.getElementById('coro-admin-map-dark')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'coro-admin-map-dark';
      styleEl.textContent = `.leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.8) saturate(0.6) contrast(0.8) !important; }`;
      document.head.appendChild(styleEl);
    }

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    withC.forEach(org => {
      const lic = LICENSE_CONFIG[org.licenseType] || LICENSE_CONFIG.ESSAI_GRATUIT;
      const isInternal = org.isInternal;

      // Couleur = santé documentaire
      const allProjects = org.metrics.projects;
      const validated = org.metrics.validated;
      const inProgress = org.metrics.inProgress;
      let healthColor = '#4A5568';
      let healthGlow = 'rgba(74,85,104,0.4)';
      if (allProjects === 0) {
        healthColor = '#4A5568'; healthGlow = 'rgba(74,85,104,0.4)';
      } else if (validated === allProjects) {
        healthColor = '#27AE60'; healthGlow = 'rgba(39,174,96,0.5)';
      } else if (inProgress > 0) {
        healthColor = '#F39C12'; healthGlow = 'rgba(243,156,18,0.5)';
      } else {
        healthColor = '#E74C3C'; healthGlow = 'rgba(231,76,60,0.5)';
      }
      if (isInternal) { healthColor = '#C0392B'; healthGlow = 'rgba(192,57,43,0.6)'; }

      // Taille = nombre de bâtiments (min 36, max 60)
      const size = Math.min(Math.max(36 + org.metrics.buildings * 3, 36), 60);
      const innerSize = Math.round(size * 0.38);
      const pulse1 = size;
      const pulse2 = Math.round(size * 0.68);

      // Badge licence
      const licColor = lic.color;
      const licLabel = org.isInternal ? 'INT' : org.licenseType === 'ENTREPRISE' ? 'ENT' : org.licenseType === 'STANDARD' ? 'STD' : 'ESS';

      const markerHtml = `
        <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:${pulse1}px;height:${pulse1}px;border-radius:50%;background:${healthColor};opacity:0.15;animation:pulse 2.5s ease-out infinite;"></div>
          <div style="position:absolute;width:${pulse2}px;height:${pulse2}px;border-radius:50%;background:${healthColor};opacity:0.25;animation:pulse 2.5s ease-out infinite;animation-delay:0.4s;"></div>
          <div style="position:relative;width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:${healthColor};border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 0 14px ${healthGlow},0 0 28px ${healthGlow};z-index:10;display:flex;align-items:center;justify-content:center;">
          </div>
          <div style="position:absolute;top:-4px;right:-4px;background:${licColor};color:#FFFFFF;font-size:8px;font-weight:800;padding:2px 4px;border-radius:4px;border:1.5px solid #0F1923;letter-spacing:0.04em;z-index:20;">
            ${licLabel}
          </div>
        </div>`;

      const iconSize: [number, number] = [size, size];
      const icon = L.divIcon({ html: markerHtml, className: '', iconSize, iconAnchor: [size/2, size/2] });
      const marker = L.marker([org.latitude, org.longitude], { icon });

      marker.on('click', () => {
        setSelected(org);
        map.panTo([org.latitude, org.longitude], { animate: true, duration: 0.5 });
      });

      marker.bindTooltip(`
        <div style="font-size:12px;font-weight:700;color:#E2E8F0;">${org.name}</div>
        <div style="font-size:10px;color:${healthColor};margin-top:2px;">${isInternal ? 'CORO Internal' : lic.label}</div>
        ${org.mainCity ? `<div style="font-size:10px;color:#8899AA;margin-top:1px;">${org.mainCity}</div>` : ''}
      `, { permanent: false, direction: 'top', offset: [0, -26], className: 'coro-dark-tooltip' });

      marker.addTo(map);
    });

    if (withC.length > 1) {
      const bounds = L.latLngBounds(withC.map((o: any) => [o.latitude, o.longitude]));
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  };

  const stats = {
    total: filteredOrgs.length,
    essai: filteredOrgs.filter(o => o.licenseType === 'ESSAI_GRATUIT').length,
    standard: filteredOrgs.filter(o => o.licenseType === 'STANDARD').length,
    entreprise: filteredOrgs.filter(o => o.licenseType === 'ENTREPRISE').length,
    totalBatiments: filteredOrgs.reduce((s, o) => s + o.metrics.buildings, 0),
    totalProjets: filteredOrgs.reduce((s, o) => s + o.metrics.projects, 0),
  };

  const selectedLic = selected ? (LICENSE_CONFIG[selected.licenseType] || LICENSE_CONFIG.ESSAI_GRATUIT) : null;

  const mapContent = (
    <div style={{
      position: 'relative',
      height: fullscreen ? '100vh' : 'calc(100vh - 180px)',
      minHeight: 500,
      borderRadius: fullscreen ? 0 : 10,
      overflow: 'hidden',
      border: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.06)',
      backgroundColor: '#0F1923',
    }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Header overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(15,25,35,0.97) 0%, rgba(15,25,35,0) 100%)',
        padding: '18px 20px 48px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        pointerEvents: 'none', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>
              CO<span style={{ color: '#C0392B' }}>RO</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#C0392B', letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: 'rgba(192,57,43,0.2)', padding: '2px 6px', borderRadius: 4 }}>
              Super Admin
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
            Toutes les organisations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'all', flexWrap: 'wrap' }}>
          {[
            { value: stats.total,          label: 'Organisations', color: '#FFFFFF' },
            { value: stats.essai,          label: 'Essai',         color: '#F39C12' },
            { value: stats.standard,       label: 'Standard',      color: '#2980B9' },
            { value: stats.entreprise,     label: 'Entreprise',    color: '#27AE60' },
            { value: stats.totalBatiments, label: 'Bâtiments',     color: '#ADB5BD' },
            { value: stats.totalProjets,   label: 'Projets',       color: '#ADB5BD' },
          ].map(k => (
            <div key={k.label} style={{
              textAlign: 'center', minWidth: 56,
              backgroundColor: 'rgba(15,25,35,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '7px 10px',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ margin: '3px 0 0', fontSize: 9, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
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
        <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Santé documentaire</p>
        {[
          { color: '#27AE60', glow: 'rgba(39,174,96,0.5)',   label: 'Tout validé' },
          { color: '#F39C12', glow: 'rgba(243,156,18,0.5)',  label: 'En cours' },
          { color: '#E74C3C', glow: 'rgba(231,76,60,0.5)',   label: 'À renouveler' },
          { color: '#4A5568', glow: 'rgba(74,85,104,0.4)',   label: 'Aucun document' },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < arr.length - 1 ? 5 : 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, boxShadow: `0 0 6px ${item.glow}`, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#8899AA' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Taille du marqueur</p>
          <p style={{ margin: 0, fontSize: 11, color: '#8899AA' }}>∝ Nombre de bâtiments</p>
          <p style={{ margin: '4px 0 0', fontSize: 9, color: '#4A5568' }}>Badge = type de licence</p>
        </div>
      </div>

      {/* Plein écran */}
      <button type="button" onClick={() => setFullscreen(f => !f)} style={{
        position: 'absolute', bottom: 24, right: selected ? 396 : 16, zIndex: 1000,
        backgroundColor: 'rgba(15,25,35,0.9)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
        width: 36, height: 36, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)', transition: 'right 0.3s ease',
      }}>
        {fullscreen ? <Minimize2 size={15} color="#8899AA" /> : <Maximize2 size={15} color="#8899AA" />}
      </button>

      {/* Panneau latéral organisation */}
      {selected && selectedLic && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 1000,
          width: 'min(380px, 100%)',
          backgroundColor: 'rgba(13,20,30,0.97)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: selected.isInternal ? '#C0392B' : selectedLic.color, boxShadow: `0 0 8px ${selected.isInternal ? 'rgba(192,57,43,0.6)' : selectedLic.glow}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: selected.isInternal ? '#C0392B' : selectedLic.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {selected.isInternal ? 'CORO Internal' : selectedLic.label}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>{selected.name}</h2>
                {selected.mainCity && (
                  <p style={{ margin: 0, fontSize: 12, color: '#4A5568' }}>📍 {selected.mainCity}</p>
                )}
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <X size={16} color="#4A5568" />
              </button>
            </div>
          </div>

          {/* Métriques */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {[
              { value: selected.metrics.users,     label: 'Membres',    color: '#FFFFFF',  icon: '👤' },
              { value: selected.metrics.buildings,  label: 'Bâtiments',  color: '#5DADE2',  icon: '🏢' },
              { value: selected.metrics.projects,   label: 'Projets',    color: '#58D68D',  icon: '📄' },
            ].map((m, i) => (
              <div key={m.label} style={{ padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <p style={{ margin: '0 0 2px', fontSize: 10 }}>{m.icon}</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Stats documents */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Documents</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: selected.metrics.validated,  label: 'Validés',   color: '#27AE60', bg: 'rgba(39,174,96,0.1)',   border: 'rgba(39,174,96,0.3)' },
                { value: selected.metrics.inProgress, label: 'En cours',  color: '#F39C12', bg: 'rgba(243,156,18,0.1)',  border: 'rgba(243,156,18,0.3)' },
              ].map(d => (
                <div key={d.label} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, backgroundColor: d.bg, border: `1px solid ${d.border}`, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: d.color, lineHeight: 1 }}>{d.value}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 10, color: d.color }}>{d.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bâtiments de l'organisation */}
          {selected.buildings && selected.buildings.length > 0 && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Bâtiments géolocalisés
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.buildings.map((b: any) => (
                  <div key={b.id} style={{
                    padding: '10px 12px', borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Building2 size={14} color="#4A5568" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                      {b.city && <p style={{ margin: 0, fontSize: 10, color: '#4A5568' }}>{b.city}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lien vers la fiche organisation */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <button type="button"
              onClick={() => router.push(`/admin/organizations`)}
              style={{
                width: '100%', padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                backgroundColor: 'rgba(192,57,43,0.15)', color: '#EC7063',
                border: '1px solid rgba(192,57,43,0.3)', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(192,57,43,0.25)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(192,57,43,0.15)'}
            >
              → Gérer les organisations
            </button>
          </div>
        </div>
      )}

      {/* Bande organisations en bas */}
      {!selected && filteredOrgs.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 999,
          background: 'linear-gradient(to top, rgba(13,20,30,0.98) 0%, rgba(13,20,30,0) 100%)',
          padding: '40px 16px 16px', pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, pointerEvents: 'all' }} onClick={e => e.stopPropagation()}>
            {filteredOrgs.map(org => {
              const lic = LICENSE_CONFIG[org.licenseType] || LICENSE_CONFIG.ESSAI_GRATUIT;
              const color = org.isInternal ? '#C0392B' : lic.color;
              return (
                <button key={org.id} type="button"
                  onClick={() => {
                    setSelected(org);
                    if (org.latitude && org.longitude && mapInstanceRef.current) {
                      mapInstanceRef.current.panTo([org.latitude, org.longitude], { animate: true });
                    }
                  }}
                  style={{
                    flexShrink: 0, width: 180, padding: '10px 12px',
                    backgroundColor: 'rgba(13,20,30,0.9)',
                    border: `1px solid ${color}44`, borderRadius: 8,
                    cursor: 'pointer', textAlign: 'left', backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = color; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(13,20,30,0.9)'; e.currentTarget.style.borderColor = `${color}44`; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {org.isInternal ? 'Internal' : lic.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</p>
                  {org.mainCity && <p style={{ margin: '0 0 6px', fontSize: 10, color: '#4A5568' }}>{org.mainCity}</p>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#4A5568' }}>🏢 {org.metrics.buildings}</span>
                    <span style={{ fontSize: 10, color: '#4A5568' }}>📄 {org.metrics.projects}</span>
                    <span style={{ fontSize: 10, color: '#4A5568' }}>👤 {org.metrics.users}</span>
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
        .coro-dark-tooltip {
          background: rgba(13,20,30,0.95) !important;
          color: #E2E8F0 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
        }
        .leaflet-container { background: #0F1923 !important; }
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
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, backgroundColor: '#0F1923', borderRadius: 12 }}>
        <p className="animate-pulse" style={{ margin: 0, color: '#4A5568', fontSize: 14 }}>Chargement de la carte...</p>
      </div>
    </AppLayout>
  );

  return fullscreen ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: '#0F1923' }}>
      {mapContent}
    </div>
  ) : (
    <AppLayout>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Super Admin — Vue cartographique
            </p>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2C3E50' }}>
              Toutes les organisations
            </h1>
          </div>
          <select
            value={licenseFilter}
            onChange={e => setLicenseFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
          >
            <option value="">Toutes les licences ({orgs.length})</option>
            <option value="ESSAI_GRATUIT">Essai gratuit ({orgs.filter(o => o.licenseType === 'ESSAI_GRATUIT').length})</option>
            <option value="STANDARD">Standard ({orgs.filter(o => o.licenseType === 'STANDARD').length})</option>
            <option value="ENTREPRISE">Entreprise ({orgs.filter(o => o.licenseType === 'ENTREPRISE').length})</option>
          </select>
        </div>
      </div>
      {mapContent}
    </AppLayout>
  );
}