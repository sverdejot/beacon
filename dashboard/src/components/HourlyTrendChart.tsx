import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import type { HourlyDataPoint } from '../lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  data: HourlyDataPoint[];
}

export function HourlyTrendChart({ data }: Props) {
  const { t } = useTranslation();
  const labels = data.map((d) => {
    const date = new Date(d.hour);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: t('charts.incidents'),
        data: data.map((d) => d.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
      },
    },
    scales: {
      x: {
        grid: {
          color: '#334155',
        },
        ticks: {
          color: '#94a3b8',
          maxRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#334155',
        },
        ticks: {
          color: '#94a3b8',
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="card chart-card">
      <div className="card-title">{t('charts.hourlyTrend')}</div>
      <div className="chart-container">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
