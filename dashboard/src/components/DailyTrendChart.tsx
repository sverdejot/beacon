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
import type { DailyDataPoint } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: DailyDataPoint[];
}

export function DailyTrendChart({ data }: Props) {
  const labels = data.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Total',
        data: data.map((d) => d.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Severe',
        data: data.map((d) => d.severe_count),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          boxWidth: 12,
        },
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
          display: false,
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
      <div className="card-title">Daily Trend (Last 30 Days)</div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
