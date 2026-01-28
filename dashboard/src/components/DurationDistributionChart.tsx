import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Chart, registerables } from 'chart.js';
import type { DurationBucket } from '../lib/types';

Chart.register(...registerables);

interface Props {
  data: DurationBucket[];
}

const BUCKET_LABELS: Record<string, string> = {
  '0-15': '0-15 min',
  '15-30': '15-30 min',
  '30-60': '30-60 min',
  '60-120': '1-2 hours',
  '120-240': '2-4 hours',
  '240+': '4+ hours',
};

export function DurationDistributionChart({ data }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const bucketLabels: Record<string, string> = {
    '0-15': t('duration.0-15'),
    '15-30': t('duration.15-30'),
    '30-60': t('duration.30-60'),
    '60-120': t('duration.60-120'),
    '120-240': t('duration.120-240'),
    '240+': t('duration.240+'),
  };

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d) => bucketLabels[d.bucket] || d.bucket),
        datasets: [
          {
            label: t('charts.incidents'),
            data: data.map((d) => d.count),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const bucket = data[context.dataIndex];
                return `Avg: ${Math.round(bucket.avg_mins)} min`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#9ca3af',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#9ca3af',
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
        <h3 className="card-title">{t('charts.durationDistribution')}</h3>
        <div className="chart-empty">{t('empty.noDurationData')}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">{t('charts.durationDistribution')}</h3>
      <p className="card-subtitle">{t('charts.durationSubtitle')}</p>
      <div className="chart-container" style={{ height: '250px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
