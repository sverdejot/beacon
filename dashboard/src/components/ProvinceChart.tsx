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

export function ProvinceChart({ data }: Props) {
  // top 15 provinces
  const topData = data.slice(0, 15);

  const chartData = {
    labels: topData.map((d) => d.label),
    datasets: [
      {
        label: 'Incidents',
        data: topData.map((d) => d.count),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 4,
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
      <div className="card-title">By Province (Last 7 Days)</div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
