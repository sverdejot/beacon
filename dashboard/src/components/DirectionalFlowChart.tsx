import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Chart, registerables } from 'chart.js';
import type { DirectionStats } from '../lib/types';

Chart.register(...registerables);

interface Props {
  data: DirectionStats[];
}

const DIRECTION_LABELS: Record<string, string> = {
  northbound: 'Northbound',
  southbound: 'Southbound',
  eastbound: 'Eastbound',
  westbound: 'Westbound',
  both: 'Both Directions',
  unknown: 'Unknown',
  inbound: 'Inbound',
  outbound: 'Outbound',
};

const DIRECTION_COLORS: Record<string, string> = {
  northbound: 'rgba(59, 130, 246, 0.8)',
  southbound: 'rgba(239, 68, 68, 0.8)',
  eastbound: 'rgba(34, 197, 94, 0.8)',
  westbound: 'rgba(249, 115, 22, 0.8)',
  both: 'rgba(168, 85, 247, 0.8)',
  inbound: 'rgba(14, 165, 233, 0.8)',
  outbound: 'rgba(236, 72, 153, 0.8)',
  unknown: 'rgba(107, 114, 128, 0.8)',
};

export function DirectionalFlowChart({ data }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const directionLabels: Record<string, string> = {
    northbound: t('direction.northbound'),
    southbound: t('direction.southbound'),
    eastbound: t('direction.eastbound'),
    westbound: t('direction.westbound'),
    both: t('direction.both'),
    unknown: t('direction.unknown'),
    inbound: t('direction.inbound'),
    outbound: t('direction.outbound'),
  };

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.map((d) => directionLabels[d.direction.toLowerCase()] || d.direction);
    const colors = data.map((d) => DIRECTION_COLORS[d.direction.toLowerCase()] || 'rgba(107, 114, 128, 0.8)');

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: data.map((d) => d.incident_count),
            backgroundColor: colors,
            borderColor: 'rgba(17, 24, 39, 1)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#9ca3af',
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = data[context.dataIndex];
                return `${context.label}: ${item.incident_count} (${item.percentage.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">{t('charts.directionalFlow')}</h3>
        <div className="chart-empty">{t('empty.noDirectionalData')}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">{t('charts.directionalFlow')}</h3>
      <p className="card-subtitle">{t('charts.directionSubtitle')}</p>
      <div className="chart-container" style={{ height: '250px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
