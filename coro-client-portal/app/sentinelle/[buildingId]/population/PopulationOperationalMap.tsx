'use client';

import { useEffect, useRef, useState } from 'react';

type PopulationMapBuilding = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
};

type PopulationMapZone = {
  id: string;
  code: string;
  nameFR: string;
  nameEN: string | null;
  geometry: unknown | null;
  maxDistanceKm: number | null;
  protectiveAction: string | null;
  instructionFR: string | null;
  instructionEN: string | null;
  targetCount: number;
  smsTargetCount: number;
  emailTargetCount: number;
};

type Props = {
  building: PopulationMapBuilding;
  zones: PopulationMapZone[];
};

type GeoJsonGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

const LEAFLET_CSS_ID = 'coro-population-leaflet-css';
const LEAFLET_SCRIPT_ID = 'coro-population-leaflet-script';
const LEAFLET_MAP_STYLE_ID = 'coro-population-leaflet-map-style';

function isValidCoordinate(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSupportedGeometry(value: unknown): value is GeoJsonGeometry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    type?: unknown;
    coordinates?: unknown;
  };

  return (
    (candidate.type === 'Polygon' ||
      candidate.type === 'MultiPolygon') &&
    Array.isArray(candidate.coordinates)
  );
}

function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet requires a browser.'));
  }

  const existingLeaflet = (window as any).L;

  if (existingLeaflet) {
    return Promise.resolve(existingLeaflet);
  }

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement('link');
    link.id = LEAFLET_CSS_ID;
    link.rel = 'stylesheet';
    link.href =
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  if (!document.getElementById(LEAFLET_MAP_STYLE_ID)) {
    const style = document.createElement('style');

    style.id = LEAFLET_MAP_STYLE_ID;
    style.textContent = `
      .coro-population-map .leaflet-tile {
        filter: invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.7) contrast(0.9);
      }

      .coro-population-map .leaflet-container {
        background: #1F2D3A;
        font-family: inherit;
      }

      .coro-population-map .leaflet-control-zoom a {
        color: #2C3E50;
      }

      .coro-population-map .leaflet-control-attribution {
        font-size: 8px;
      }

      .coro-population-site-marker {
        width: 18px;
        height: 18px;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        background: #C0392B;
        box-shadow: 0 0 0 5px rgba(192, 57, 43, 0.24);
      }
    `;

    document.head.appendChild(style);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      LEAFLET_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      const checkLeaflet = () => {
        const leaflet = (window as any).L;

        if (leaflet) {
          resolve(leaflet);
        } else {
          reject(new Error('Leaflet did not initialize.'));
        }
      };

      if ((window as any).L) {
        resolve((window as any).L);
        return;
      }

      existingScript.addEventListener('load', checkLeaflet, {
        once: true,
      });

      existingScript.addEventListener(
        'error',
        () => reject(new Error('Leaflet could not be loaded.')),
        { once: true },
      );

      return;
    }

    const script = document.createElement('script');

    script.id = LEAFLET_SCRIPT_ID;
    script.src =
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;

    script.onload = () => {
      const leaflet = (window as any).L;

      if (leaflet) {
        resolve(leaflet);
      } else {
        reject(new Error('Leaflet did not initialize.'));
      }
    };

    script.onerror = () => {
      reject(new Error('Leaflet could not be loaded.'));
    };

    document.body.appendChild(script);
  });
}

function formatProtectiveAction(action: string | null) {
  if (!action) {
    return 'Mesure à confirmer';
  }

  const labels: Record<string, string> = {
    SHELTER_IN_PLACE: 'Mise à l’abri',
    EVACUATE: 'Évacuation',
    AVOID_AREA: 'Éviter le secteur',
    MONITOR: 'Surveillance',
    OTHER: 'Autre mesure',
  };

  return labels[action] || action.replaceAll('_', ' ');
}

export default function PopulationOperationalMap({
  building,
  zones,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!mapContainerRef.current) {
        return;
      }

      if (
        !isValidCoordinate(building.latitude) ||
        !isValidCoordinate(building.longitude)
      ) {
        setMapError(
          'Les coordonnées du site sont requises pour afficher la carte opérationnelle.',
        );
        return;
      }

      try {
        setMapError(null);

        const L = await loadLeaflet();

        if (cancelled || !mapContainerRef.current) {
          return;
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const sitePosition: [number, number] = [
          building.latitude,
          building.longitude,
        ];

        const map = L.map(mapContainerRef.current, {
          center: sitePosition,
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        });

        mapInstanceRef.current = map;

        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
          },
        ).addTo(map);

        L.control
          .zoom({
            position: 'bottomright',
          })
          .addTo(map);

        L.control
          .attribution({
            position: 'bottomleft',
            prefix: false,
          })
          .addAttribution('© OpenStreetMap contributors')
          .addTo(map);

        const siteIcon = L.divIcon({
          className: '',
          html: '<div class="coro-population-site-marker"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const siteMarker = L.marker(sitePosition, {
          icon: siteIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        const siteDetails = document.createElement('div');

        const siteTitle = document.createElement('strong');
        siteTitle.textContent = building.name;
        siteDetails.appendChild(siteTitle);

        const addressParts = [
          building.address,
          building.city,
          building.province,
        ].filter(Boolean);

        if (addressParts.length > 0) {
          const address = document.createElement('div');
          address.textContent = addressParts.join(', ');
          address.style.marginTop = '3px';
          siteDetails.appendChild(address);
        }

        siteMarker.bindPopup(siteDetails);

        const displayLayers: any[] = [siteMarker];

        zones.forEach((zone, index) => {
          const zoneStyle = {
            color:
              index % 3 === 0
                ? '#C0392B'
                : index % 3 === 1
                  ? '#E67E22'
                  : '#2980B9',
            weight: 2,
            opacity: 0.95,
            fillOpacity: 0.18,
          };

          let layer: any = null;

          if (isSupportedGeometry(zone.geometry)) {
            try {
              layer = L.geoJSON(
                {
                  type: 'Feature',
                  properties: {},
                  geometry: zone.geometry,
                },
                {
                  style: zoneStyle,
                },
              ).addTo(map);
            } catch {
              layer = null;
            }
          } else if (
            zone.geometry === null &&
            typeof zone.maxDistanceKm === 'number' &&
            Number.isFinite(zone.maxDistanceKm) &&
            zone.maxDistanceKm > 0
          ) {
            layer = L.circle(sitePosition, {
              radius: zone.maxDistanceKm * 1000,
              ...zoneStyle,
            }).addTo(map);
          }

          if (!layer) {
            return;
          }

          const tooltip = document.createElement('div');

          const title = document.createElement('strong');
          title.textContent = `Zone ${zone.code} · ${zone.nameFR}`;
          tooltip.appendChild(title);

          const population = document.createElement('div');
          population.textContent =
            `${zone.targetCount.toLocaleString('fr-CA')} personne${
              zone.targetCount > 1 ? 's' : ''
            } ciblée${zone.targetCount > 1 ? 's' : ''}`;
          population.style.marginTop = '4px';
          tooltip.appendChild(population);

          const channels = document.createElement('div');
          channels.textContent =
            `${zone.smsTargetCount.toLocaleString('fr-CA')} SMS · ` +
            `${zone.emailTargetCount.toLocaleString('fr-CA')} courriels`;
          channels.style.marginTop = '2px';
          tooltip.appendChild(channels);

          const action = document.createElement('div');
          action.textContent = formatProtectiveAction(
            zone.protectiveAction,
          );
          action.style.marginTop = '4px';
          action.style.fontWeight = '700';
          tooltip.appendChild(action);

          if (zone.instructionFR) {
            const instruction = document.createElement('div');
            instruction.textContent = zone.instructionFR;
            instruction.style.marginTop = '4px';
            tooltip.appendChild(instruction);
          }

          layer.bindPopup(tooltip);
          displayLayers.push(layer);
        });

        if (displayLayers.length > 1) {
          const featureGroup = L.featureGroup(displayLayers);
          const bounds = featureGroup.getBounds();

          if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.12), {
              maxZoom: 15,
            });
          }
        }

        window.setTimeout(() => {
          if (!cancelled && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 0);
      } catch {
        if (!cancelled) {
          setMapError(
            'La carte opérationnelle n’a pas pu être chargée.',
          );
        }
      }
    };

    initializeMap();

    return () => {
      cancelled = true;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [building, zones]);

  useEffect(() => {
    const container = mapContainerRef.current;

    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }

    let animationFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        mapInstanceRef.current?.invalidateSize({ pan: false });
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();

      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [mapError]);

  const mappedZoneCount = zones.filter(
    (zone) =>
      isSupportedGeometry(zone.geometry) ||
      (zone.geometry === null &&
        typeof zone.maxDistanceKm === 'number' &&
        Number.isFinite(zone.maxDistanceKm) &&
        zone.maxDistanceKm > 0),
  ).length;

  return (
    <div
      style={{
        overflow: 'hidden',
        border: '1px solid #DDE3E8',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 14,
          padding: '14px 16px',
          borderBottom: '1px solid #E9ECEF',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              margin: '0 0 3px',
              color: '#167D6A',
              fontSize: 8,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Territoire opérationnel
          </p>

          <strong
            style={{
              display: 'block',
              color: '#2C3E50',
              fontSize: 12,
            }}
          >
            {building.name}
          </strong>

          <span
            style={{
              display: 'block',
              marginTop: 3,
              color: '#ADB5BD',
              fontSize: 9,
            }}
          >
            Zones d’impact et population agrégée
          </span>
        </div>

        <div
          style={{
            padding: '5px 9px',
            borderRadius: 20,
            backgroundColor: '#F1F3F5',
            color: '#6C757D',
            fontSize: 8,
            fontWeight: 800,
          }}
        >
          {mappedZoneCount}/{zones.length} zone
          {zones.length > 1 ? 's' : ''} cartographiée
          {mappedZoneCount > 1 ? 's' : ''}
        </div>
      </div>

      {mapError ? (
        <div
          style={{
            padding: 18,
            backgroundColor: '#FDEDEC',
            color: '#922B21',
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          {mapError}
        </div>
      ) : (
        <div
          className="coro-population-map"
          style={{
            position: 'relative',
            height: 430,
            backgroundColor: '#1F2D3A',
          }}
        >
          <div
            ref={mapContainerRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          />

          <div
            style={{
              position: 'absolute',
              zIndex: 500,
              top: 12,
              right: 12,
              maxWidth: 210,
              padding: '9px 11px',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 9,
              backgroundColor: 'rgba(31,45,58,0.92)',
              color: '#FFFFFF',
              pointerEvents: 'none',
            }}
          >
            <strong
              style={{
                display: 'block',
                marginBottom: 3,
                fontSize: 9,
              }}
            >
              Vue agrégée
            </strong>

            <span
              style={{
                display: 'block',
                color: '#D5DDE3',
                fontSize: 8,
                lineHeight: 1.45,
              }}
            >
              Aucun citoyen ni emplacement individuel n’est affiché.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
