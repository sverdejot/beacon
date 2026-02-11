import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import type { DistributionItem } from '../lib/types';
import { useDashboard } from '../context/DashboardContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: DistributionItem[];
}

export function CauseTypeChart({ data }: Props) {
  const { t } = useTranslation();
  // Try to get filter context
  let addFilter: ((filter: { type: 'province' | 'severity' | 'cause' | 'road'; value: string; label: string }) => void) | undefined;
  let hasFilter: ((type: 'province' | 'severity' | 'cause' | 'road', value: string) => boolean) | undefined;
  
  try {
    const context = useDashboard();
    addFilter = context.addFilter;
    hasFilter = context.hasFilter;
  } catch {
    // Context not available
  }

  const chartData = {
    labels: data.map((d) => t(`causeType.${d.label}`, { defaultValue: d.label.replace(/_/g, ' ') })),
    datasets: [
      {
        label: t('charts.incidents'),
        data: data.map((d) => d.count),
        backgroundColor: data.map((d) => 
          hasFilter && hasFilter('cause', d.label) 
            ? 'rgba(59, 130, 246, 0.9)' 
            : 'rgba(6, 182, 212, 0.8)'
        ),
        hoverBackgroundColor: 'rgba(59, 130, 246, 1)',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0 && addFilter) {
        const index = elements[0].index;
        const item = data[index];
        addFilter({
          type: 'cause',
          value: item.label,
          label: t(`causeType.${item.label}`, { defaultValue: item.label.replace(/_/g, ' ') }),
        });
      }
    },
    plugins: {
      legend: {
        display: false,
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
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: '#334155',
        },
        ticks: {
          color: '#94a3b8',
          stepSize: 1,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
    onHover: (event: unknown, elements: unknown[]) => {
      const chartEvent = event as { native?: { target?: HTMLElement } };
      const target = chartEvent.native?.target;
      if (target?.style) {
        target.style.cursor = elements.length > 0 && addFilter ? 'pointer' : 'default';
      }
    },
  };

  return (
    <div className="card chart-card">
      <div className="card-header">
        <span className="card-title">{t('charts.byCauseType')}</span>
      </div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
