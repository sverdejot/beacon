import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapLocation } from '../lib/types';

export function LiveMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  const addLocation = useCallback((loc: MapLocation) => {
    if (!mapInstanceRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    const icon = loc.icon || '\ud83d\udccd';

    const recordIcon = L.divIcon({
      html: `<div style="font-size: 24px; text-align: center;">${icon}</div>`,
      className: 'emoji-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    if (loc.type === 'segment' && loc.path) {
      const coords = loc.path.map((p) => [p.lat, p.lon] as [number, number]);

      L.polyline(coords, {
        color: '#3b82f6',
        weight: 3,
        opacity: 1,
      }).addTo(mapInstanceRef.current);

      const midIndex = Math.floor(coords.length / 2);
      const midPoint = coords[midIndex];

      L.marker(midPoint, { icon: recordIcon }).addTo(mapInstanceRef.current);
    } else if (loc.type === 'point' && loc.point) {
      L.marker([loc.point.lat, loc.point.lon], { icon: recordIcon }).addTo(
        mapInstanceRef.current
      );
    }

    setEventCount((c) => c + 1);
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
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      // Connect to SSE
      eventSource = new EventSource('/sse');

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const loc = JSON.parse(event.data) as MapLocation;
          addLocation(loc);
        } catch (e) {
          console.error('Failed to parse SSE location:', e);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
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

  return (
    <div className="card livemap-card">
      <div className="card-title">
        Live Incident Map
        <span className={`live-indicator ${connected ? 'connected' : ''}`}>
          <span className="dot" />
          {connected ? `Live (${eventCount})` : 'Connecting...'}
        </span>
      </div>
      <div className="livemap-container" ref={mapRef} />
    </div>
  );
}
