import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Chart, registerables } from 'chart.js';
import type { RushHourStats } from '../lib/types';

Chart.register(...registerables);

interface Props {
  data: RushHourStats[];
}

const PERIOD_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  morning_rush: {
    label: 'Morning Rush',
    color: 'rgba(249, 115, 22, 0.8)',
    icon: '🌅',
  },
  evening_rush: {
    label: 'Evening Rush',
    color: 'rgba(139, 92, 246, 0.8)',
    icon: '🌆',
  },
  off_peak: {
    label: 'Off-Peak',
    color: 'rgba(34, 197, 94, 0.8)',
    icon: '🌙',
  },
};

export function RushHourComparison({ data }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const periodLabels: Record<string, string> = {
    morning_rush: t('rushHour.morningRush'),
    evening_rush: t('rushHour.eveningRush'),
    off_peak: t('rushHour.offPeak'),
  };

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const sortedData = [...data].sort((a, b) => {
      const order = ['morning_rush', 'evening_rush', 'off_peak'];
      return order.indexOf(a.period) - order.indexOf(b.period);
    });

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedData.map((d) => periodLabels[d.period] || d.period),
        datasets: [
          {
            label: 'Incidents',
            data: sortedData.map((d) => d.incident_count),
            backgroundColor: sortedData.map((d) => PERIOD_CONFIG[d.period]?.color || 'rgba(107, 114, 128, 0.8)'),
            borderRadius: 4,
            yAxisID: 'y',
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
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const item = sortedData[context.dataIndex];
                return [
                  `Avg Severity: ${item.avg_severity.toFixed(1)}/5`,
                  `Avg Duration: ${Math.round(item.avg_duration_mins)} min`,
                ];
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
        <h3 className="card-title">{t('charts.rushHourAnalysis')}</h3>
        <div className="chart-empty">{t('empty.noRushHourData')}</div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    const order = ['morning_rush', 'evening_rush', 'off_peak'];
    return order.indexOf(a.period) - order.indexOf(b.period);
  });

  return (
    <div className="card">
      <h3 className="card-title">{t('charts.rushHourAnalysis')}</h3>
      <p className="card-subtitle">{t('charts.rushHourSubtitle')}</p>
      
      <div className="rush-hour-summary">
        {sortedData.map((item) => {
          const config = PERIOD_CONFIG[item.period];
          return (
            <div key={item.period} className="rush-hour-card">
              <span className="rush-hour-icon">{config?.icon || '📊'}</span>
              <span className="rush-hour-label">{periodLabels[item.period] || item.period}</span>
              <span className="rush-hour-count">{item.incident_count}</span>
              <span className="rush-hour-meta">
                {t('charts.avgMin', { count: Math.round(item.avg_duration_mins) })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="chart-container" style={{ height: '200px' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
