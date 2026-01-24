import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapLocation } from '../lib/types';

interface MapLocationWithId extends MapLocation {
  id: string;
}

interface SeverityFilter {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
}

const defaultFilters: SeverityFilter[] = [
  { id: 'highest', label: 'Highest', color: '#dc2626', enabled: true },
  { id: 'high', label: 'High', color: '#f97316', enabled: true },
  { id: 'medium', label: 'Medium', color: '#eab308', enabled: true },
  { id: 'low', label: 'Low', color: '#22c55e', enabled: true },
];

interface LiveMapProps {
  fullHeight?: boolean;
}

export function LiveMap({ fullHeight = false }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const addedIdsRef = useRef<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [incidentCount, setIncidentCount] = useState(0);
  const [filters, setFilters] = useState<SeverityFilter[]>(defaultFilters);

  const toggleFilter = (id: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const addLocation = useCallback((loc: MapLocationWithId) => {
    if (!mapInstanceRef.current || !leafletRef.current) return;

    // Skip if already added
    if (addedIdsRef.current.has(loc.id)) return;
    addedIdsRef.current.add(loc.id);

    const L = leafletRef.current;
    const icon = loc.icon || '📍';

    const recordIcon = L.divIcon({
      html: `<div style="font-size: 24px; text-align: center; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${icon}</div>`,
      className: 'emoji-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let marker: any;

    if (loc.type === 'segment' && loc.path) {
      const coords = loc.path.map((p) => [p.lat, p.lon] as [number, number]);

      const polyline = L.polyline(coords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapInstanceRef.current);

      const midIndex = Math.floor(coords.length / 2);
      const midPoint = coords[midIndex];

      marker = L.marker(midPoint, { icon: recordIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(createPopupContent(loc));

      markersRef.current.set(loc.id, { marker, polyline });
    } else if (loc.type === 'point' && loc.point) {
      marker = L.marker([loc.point.lat, loc.point.lon], { icon: recordIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(createPopupContent(loc));

      markersRef.current.set(loc.id, { marker });
    }

    setIncidentCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let eventSource: EventSource | null = null;

    const initMap = async () => {
      const L = await import('leaflet');
      leafletRef.current = L.default;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current!, {
          center: [40.0, -3.5],
          zoom: 6,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        // Add scale control
        L.control.scale({ position: 'bottomright', imperial: false }).addTo(mapInstanceRef.current);
      }

      // Fetch existing incidents first
      try {
        const response = await fetch('/api/map/incidents');
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((loc: MapLocationWithId) => addLocation(loc));
        }
        setLoaded(true);
      } catch (e) {
        console.error('Failed to fetch initial incidents:', e);
        setLoaded(true);
      }

      // Connect to SSE for live updates
      eventSource = new EventSource('/sse');

      eventSource.onmessage = (event) => {
        try {
          const loc = JSON.parse(event.data) as MapLocationWithId;
          addLocation(loc);
        } catch (e) {
          console.error('Failed to parse SSE location:', e);
        }
      };
    };

    initMap();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [addLocation]);

  const cardClass = fullHeight ? 'card livemap-card' : 'card livemap-card';
  const cardStyle = fullHeight ? { height: 'calc(100vh - 140px)', minHeight: '500px' } : {};

  return (
    <div className={cardClass} style={cardStyle}>
      <div className="livemap-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Live Incident Map</span>
          <span className={`live-indicator ${loaded ? 'connected' : ''}`}>
            <span className="dot" />
            {loaded ? `${incidentCount} incidents` : 'Loading...'}
          </span>
        </div>
        <div className="map-controls">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`map-filter-btn ${filter.enabled ? 'active' : ''}`}
              onClick={() => toggleFilter(filter.id)}
              aria-pressed={filter.enabled}
              aria-label={`${filter.enabled ? 'Hide' : 'Show'} ${filter.label} severity incidents`}
            >
              <span
                className="map-filter-dot"
                style={{ backgroundColor: filter.color }}
                aria-hidden="true"
              />
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="livemap-container" ref={mapRef} role="application" aria-label="Traffic incidents map" />
    </div>
  );
}

function createPopupContent(loc: MapLocationWithId): string {
  const icon = loc.icon || '📍';
  return `
    <div style="font-size: 14px; min-width: 180px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 20px;">${icon}</span>
        <strong>Incident</strong>
      </div>
      <div style="color: #666; font-size: 12px;">
        <div>Type: ${loc.type}</div>
        <div>ID: ${loc.id.slice(0, 8)}...</div>
      </div>
    </div>
  `;
}
