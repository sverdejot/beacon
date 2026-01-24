import { useEffect, useRef } from 'react';
import type { HeatmapPoint } from '../lib/types';

interface Props {
  data: HeatmapPoint[];
}

export function IncidentHeatmap({ data }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamic import for Leaflet (client-side only)
    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet.heat');

      // Only create map if it doesn't exist
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current!, {
          center: [40.4, -3.7], // Center of Spain
          zoom: 6,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      // Update heat layer
      if (heatLayerRef.current) {
        mapInstanceRef.current!.removeLayer(heatLayerRef.current);
      }

      if (data.length > 0) {
        const heatData: [number, number, number][] = data.map((point) => [
          point.lat,
          point.lon,
          point.weight,
        ]);

        heatLayerRef.current = L.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          max: Math.max(...data.map((d) => d.weight)),
          gradient: {
            0.0: '#3b82f6',
            0.5: '#eab308',
            0.7: '#f97316',
            1.0: '#dc2626',
          },
        }).addTo(mapInstanceRef.current!);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="card heatmap-card">
      <div className="card-title">Incident Heatmap (Last 7 Days)</div>
      <div className="heatmap-container" ref={mapRef} />
    </div>
  );
}
