import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import type { DirectionStats } from '../lib/types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: DirectionStats[];
}

const DIRECTION_COLORS: Record<string, string> = {
  northBound: 'rgba(59, 130, 246, 0.8)',
  southBound: 'rgba(239, 68, 68, 0.8)',
  eastBound: 'rgba(34, 197, 94, 0.8)',
  westBound: 'rgba(249, 115, 22, 0.8)',
  northEastBound: 'rgba(99, 102, 241, 0.8)',
  northWestBound: 'rgba(45, 212, 191, 0.8)',
  southEastBound: 'rgba(244, 114, 182, 0.8)',
  southWestBound: 'rgba(251, 146, 60, 0.8)',
  both: 'rgba(168, 85, 247, 0.8)',
  inbound: 'rgba(14, 165, 233, 0.8)',
  outbound: 'rgba(236, 72, 153, 0.8)',
  unknown: 'rgba(107, 114, 128, 0.8)',
};

export function DirectionalFlowChart({ data }: Props) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="card chart-card">
        <div className="card-header">
          <span className="card-title">{t('charts.directionalFlow')}</span>
        </div>
        <div className="chart-empty">{t('empty.noDirectionalData')}</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => t(`direction.${d.direction}`, { defaultValue: d.direction })),
    datasets: [
      {
        data: data.map((d) => d.incident_count),
        backgroundColor: data.map((d) => DIRECTION_COLORS[d.direction] || 'rgba(107, 114, 128, 0.8)'),
        hoverBackgroundColor: data.map((d) => (DIRECTION_COLORS[d.direction] || 'rgba(107, 114, 128, 0.8)') + 'dd'),
        borderColor: '#1e293b',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#94a3b8',
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (context: { label: string; dataIndex: number }) => {
            const item = data[context.dataIndex];
            return `${context.label}: ${item.incident_count} (${item.percentage.toFixed(1)}%)`;
          },
        },
      },
    },
    cutout: '60%',
  };

  const total = data.reduce((sum, d) => sum + d.incident_count, 0);
  const totalLabel = t('charts.total');

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart: ChartJS) {
      const { ctx, chartArea } = chart;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 1.5rem sans-serif';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#f1f5f9';
      ctx.fillText(total.toLocaleString(), centerX, centerY - 8);

      ctx.font = '0.75rem sans-serif';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#94a3b8';
      ctx.fillText(totalLabel, centerX, centerY + 12);

      ctx.restore();
    },
  };

  return (
    <div className="card chart-card">
      <div className="card-header">
        <span className="card-title">{t('charts.directionalFlow')}</span>
      </div>
      <div className="chart-container">
        <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
      </div>
    </div>
  );
}
