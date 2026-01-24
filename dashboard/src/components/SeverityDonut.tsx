import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { DistributionItem } from '../lib/types';

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

export function SeverityDonut({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.count),
        backgroundColor: data.map((d) => severityColors[d.label] || '#6b7280'),
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
    cutout: '60%',
  };

  return (
    <div className="card chart-card">
      <div className="card-title">By Severity (Last 7 Days)</div>
      <div className="chart-container">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
