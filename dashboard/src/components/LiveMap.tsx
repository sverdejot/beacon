import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapLocation } from '../lib/types';

interface MapLocationWithId extends MapLocation {
  id: string;
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterGroupRef = useRef<any>(null);
  const addedIdsRef = useRef<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [incidentCount, setIncidentCount] = useState(0);

  const addLocation = useCallback((loc: MapLocationWithId) => {
    if (!mapInstanceRef.current || !leafletRef.current || !clusterGroupRef.current) return;

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
        color: '#FFCC00',
        weight: 5,
        dashArray: '10, 10',
        dashOffset: '0'
      }).addTo(mapInstanceRef.current);

      const midIndex = Math.floor(coords.length / 2);
      const midPoint = coords[midIndex];

      marker = L.marker(midPoint, { icon: recordIcon })
        .bindPopup(createPopupContent(loc));

      clusterGroupRef.current.addLayer(marker);
      markersRef.current.set(loc.id, { marker, polyline });
    } else if (loc.type === 'point' && loc.point) {
      marker = L.marker([loc.point.lat, loc.point.lon], { icon: recordIcon })
        .bindPopup(createPopupContent(loc));

      clusterGroupRef.current.addLayer(marker);
      markersRef.current.set(loc.id, { marker });
    }

    setIncidentCount((c) => c + 1);
  }, []);

  const removeLocation = useCallback((id: string) => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;

    const markerData = markersRef.current.get(id);
    if (markerData) {
      if (markerData.marker) {
        clusterGroupRef.current.removeLayer(markerData.marker);
      }
      if (markerData.polyline) {
        mapInstanceRef.current.removeLayer(markerData.polyline);
      }
      markersRef.current.delete(id);
      addedIdsRef.current.delete(id);
      setIncidentCount((c) => Math.max(0, c - 1));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let eventSource: EventSource | null = null;

    const initMap = async () => {
      const L = await import('leaflet');
      // @ts-expect-error - markercluster doesn't have type definitions
      await import('leaflet.markercluster');
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

        L.control.scale({ position: 'bottomright', imperial: false }).addTo(mapInstanceRef.current);

        // Initialize marker cluster group
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clusterGroupRef.current = (L.default as any).markerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster: { getChildCount: () => number }) => {
            const count = cluster.getChildCount();
            let bg = 'rgba(255, 204, 0, 0.7)';
            let diameter = 36;
            if (count > 50) { bg = 'rgba(255, 77, 77, 0.8)'; diameter = 48; }
            else if (count > 10) { bg = 'rgba(255, 153, 0, 0.75)'; diameter = 42; }

            return L.default.divIcon({
              html: `<div style="
                background: ${bg};
                width: ${diameter}px;
                height: ${diameter}px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-weight: 700;
                font-size: 13px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                border: 2px solid rgba(255,255,255,0.5);
              ">${count}</div>`,
              className: 'marker-cluster',
              iconSize: L.default.point(diameter, diameter),
            });
          },
        });
        mapInstanceRef.current.addLayer(clusterGroupRef.current);
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

      eventSource.addEventListener('update', (event) => {
        try {
          const loc = JSON.parse(event.data) as MapLocationWithId;
          addLocation(loc);
        } catch (e) {
          console.error('Failed to parse SSE update:', e);
        }
      });

      eventSource.addEventListener('delete', (event) => {
        try {
          const { id } = JSON.parse(event.data) as { id: string };
          removeLocation(id);
        } catch (e) {
          console.error('Failed to parse SSE delete:', e);
        }
      });

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
        clusterGroupRef.current = null;
      }
    };
  }, [addLocation, removeLocation]);

  const cardStyle = fullHeight ? { height: 'calc(100vh - 140px)', minHeight: '500px' } : {};

  return (
    <div className="card livemap-card" style={cardStyle}>
      <div className="livemap-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="card-title" style={{ margin: 0 }}>Live Incident Map</span>
          <span className={`live-indicator ${loaded ? 'connected' : ''}`}>
            <span className="dot" />
            {loaded ? `${incidentCount} incidents` : 'Loading...'}
          </span>
        </div>
      </div>
      <div className="livemap-container" ref={mapRef} role="application" aria-label="Traffic incidents map" />
    </div>
  );
}

function createPopupContent(loc: MapLocationWithId): string {
  const icon = loc.icon || '📍';
  const severity = loc.severity || 'Unknown';
  const eventType = loc.eventType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';

  return `
    <div style="font-size: 14px; min-width: 200px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 20px;">${icon}</span>
        <strong>${eventType}</strong>
      </div>
      <div style="color: #666; font-size: 12px;">
        <div><strong>Severity:</strong> ${severity.charAt(0).toUpperCase() + severity.slice(1)}</div>
        <div><strong>Type:</strong> ${loc.type}</div>
        <div><strong>ID:</strong> ${loc.id.slice(0, 8)}...</div>
      </div>
    </div>
  `;
}
