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
import type { DistributionItem } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: DistributionItem[];
}

export function CauseTypeChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.label.replace(/_/g, ' ')),
    datasets: [
      {
        label: 'Incidents',
        data: data.map((d) => d.count),
        backgroundColor: 'rgba(6, 182, 212, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
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
  };

  return (
    <div className="card chart-card">
      <div className="card-title">By Cause Type (Last 7 Days)</div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
