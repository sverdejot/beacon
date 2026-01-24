import { useRef, useEffect } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

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
        labels: data.map((d) => BUCKET_LABELS[d.bucket] || d.bucket),
        datasets: [
          {
            label: 'Incidents',
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
        <h3 className="card-title">Duration Distribution</h3>
        <div className="chart-empty">No duration data available</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">Duration Distribution</h3>
      <p className="card-subtitle">Incident duration breakdown (last 7 days)</p>
      <div className="chart-container" style={{ height: '250px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
