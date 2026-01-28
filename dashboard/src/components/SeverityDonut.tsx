import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import type { DistributionItem } from '../lib/types';
import { useDashboard } from '../context/DashboardContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: DistributionItem[];
}

const severityColors: Record<string, string> = {
  highest: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  unknown: '#6b7280',
};

const severityKeys = ['highest', 'high', 'medium', 'low', 'unknown'] as const;

export function SeverityDonut({ data }: Props) {
  const { t } = useTranslation();
  // Try to get filter context
  let addFilter: ((filter: { type: 'province' | 'severity' | 'cause' | 'road'; value: string; label: string }) => void) | undefined;
  
  try {
    const context = useDashboard();
    addFilter = context.addFilter;
  } catch {
    // Context not available
  }

  const chartData = {
    labels: data.map((d) => t(`severity.${d.label}`)),
    datasets: [
      {
        data: data.map((d) => d.count),
        backgroundColor: data.map((d) => severityColors[d.label] || '#6b7280'),
        hoverBackgroundColor: data.map((d) => {
          const color = severityColors[d.label] || '#6b7280';
          return color + 'dd'; // Add some transparency on hover
        }),
        borderColor: '#1e293b',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0 && addFilter) {
        const index = elements[0].index;
        const item = data[index];
        addFilter({
          type: 'severity',
          value: item.label,
          label: t(`severity.${item.label}`),
        });
      }
    },
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
          afterBody: () => addFilter ? ['', t('charts.clickToFilter')] : [],
        },
      },
    },
    cutout: '60%',
    onHover: (event: unknown, elements: unknown[]) => {
      const chartEvent = event as { native?: { target?: HTMLElement } };
      const target = chartEvent.native?.target;
      if (target?.style) {
        target.style.cursor = elements.length > 0 && addFilter ? 'pointer' : 'default';
      }
    },
  };

  // Calculate total for center display
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="card chart-card">
      <div className="card-header">
        <span className="card-title">{t('charts.bySeverity')}</span>
      </div>
      <div className="chart-container" style={{ position: 'relative' }}>
        <Doughnut data={chartData} options={options} />
        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 'calc(50% - 40px)',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {t('charts.total')}
          </div>
        </div>
      </div>
    </div>
  );
}
