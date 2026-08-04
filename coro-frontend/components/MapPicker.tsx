'use client';

import { useEffect, useRef, useState } from 'react';

interface MapPickerProps {
  label: string;
  value: string;
  coords: { lat: number; lng: number } | null;
  buildingAddress?: string;
  onValueChange: (value: string) => void;
  onCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  onMapSnapshot: (snapshot: string | null) => void;
}

export default function MapPicker({ label, value, coords, buildingAddress, onValueChange, onCoordsChange, onMapSnapshot }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!showMap || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    // Import dynamique de Leaflet (SSR safe)
    import('leaflet').then(L => {
      // Fix icône Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const defaultLat = coords?.lat || 45.5017;
      const defaultLng = coords?.lng || -73.5673;

      const map = L.map(mapRef.current!).setView([defaultLat, defaultLng], 16);
      mapInstanceRef.current = map;

      // Géocodage de l'adresse du bâtiment
      if (!coords && buildingAddress) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(buildingAddress)}&limit=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              map.setView([lat, lng], 17);
            }
          })
          .catch(() => {});
      }
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Marker existant si coords
      if (coords) {
        markerRef.current = L.marker([coords.lat, coords.lng]).addTo(map);
      }

      // Clic sur la carte
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;

        // Supprimer ancien marker
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([lat, lng]).addTo(map);

        onCoordsChange({ lat, lng });

        // Capture screenshot
        setCapturing(true);
        try {
          await new Promise(r => setTimeout(r, 500));
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(mapRef.current!, {
            useCORS: true,
            allowTaint: true,
            scale: 1,
          });
          onMapSnapshot(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error('Erreur capture carte:', err);
        } finally {
          setCapturing(false);
        }
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap]);

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder="Description du lieu..."
          className="flex-1 rounded px-3 py-2.5 text-sm focus:outline-none"
          style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
        />
        <button
          onClick={() => setShowMap(!showMap)}
          className="px-3 py-2 rounded text-sm font-medium transition-colors flex-shrink-0"
          style={{
            border: `1px solid ${coords ? '#A9DFBF' : '#AED6F1'}`,
            color: coords ? '#27AE60' : '#2980B9',
            backgroundColor: coords ? '#EAFAF1' : '#EBF5FB',
          }}
        >
          {coords ? '✓ 📍 Localisé' : '📍 Localiser'}
        </button>
      </div>

      {showMap && (
        <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #DEE2E6', marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#F8F9FA', padding: '8px 12px', fontSize: '12px', color: '#6C757D', borderBottom: '1px solid #DEE2E6' }}>
            {capturing ? '⏳ Capture en cours...' : '🖱️ Cliquez sur la carte pour épingler le point de rassemblement'}
          </div>
          <div ref={mapRef} style={{ height: '300px', width: '100%' }} />
        </div>
      )}

      {coords && (
        <p className="text-xs" style={{ color: '#27AE60' }}>
          📍 {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}