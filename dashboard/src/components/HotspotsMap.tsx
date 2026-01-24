import { useEffect, useRef, useState } from 'react';
import type { Hotspot } from '../lib/types';

interface Props {
  data: Hotspot[];
}

function getSeverityColor(severity: number): string {
  if (severity >= 4) return '#ef4444';
  if (severity >= 3) return '#f97316';
  if (severity >= 2) return '#eab308';
  return '#22c55e';
}

export function HotspotsMap({ data }: Props) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      mapRef.current = L.map(containerRef.current!).setView([40.4168, -3.7038], 6);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(mapRef.current);

      if (data.length > 0) {
        const bounds: [number, number][] = [];

        data.forEach((hotspot) => {
          const color = getSeverityColor(hotspot.avg_severity);
          const size = Math.min(30, 10 + hotspot.incident_count * 2);

          const icon = L.divIcon({
            className: 'hotspot-marker',
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: ${size > 20 ? '10px' : '8px'};
                font-weight: bold;
              ">${hotspot.incident_count}</div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const marker = L.marker([hotspot.lat, hotspot.lon], { icon });

          marker.bindPopup(`
            <div class="hotspot-popup">
              <div class="hotspot-popup-title">Recurring Hotspot</div>
              <div class="hotspot-popup-stats">
                <div><strong>${hotspot.incident_count}</strong> incidents</div>
                <div><strong>${hotspot.recurrence}</strong> days with incidents</div>
                <div>Top cause: <strong>${hotspot.top_cause.replace(/_/g, ' ')}</strong></div>
                <div>Avg severity: <strong>${hotspot.avg_severity.toFixed(1)}/5</strong></div>
              </div>
            </div>
          `);

          marker.addTo(mapRef.current!);
          bounds.push([hotspot.lat, hotspot.lon]);
        });

        if (bounds.length > 0) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data, isClient]);

  if (!isClient) {
    return (
      <div className="card">
        <h3 className="card-title">Recurring Hotspots</h3>
        <div 
          className="hotspots-map-container"
          style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Loading map...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">Recurring Hotspots</h3>
        <div className="map-empty">No hotspot data available</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">Recurring Hotspots</h3>
      <p className="card-subtitle">
        Locations with repeated incidents (last 30 days) - {data.length} hotspots detected
      </p>
      <div 
        ref={containerRef} 
        className="hotspots-map-container"
        style={{ height: '400px', borderRadius: '8px', overflow: 'hidden' }}
      />
      <div className="hotspots-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#22c55e' }}></span>
          Low severity
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#eab308' }}></span>
          Medium
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#f97316' }}></span>
          High
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#ef4444' }}></span>
          Critical
        </span>
      </div>
    </div>
  );
}
