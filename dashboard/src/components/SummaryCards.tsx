import type { Summary } from '../lib/types';
import { useDashboard } from '../context/DashboardContext';

interface Props {
  summary: Summary | null;
  previousSummary?: Summary | null;
}

interface SparklineData {
  values: number[];
}

function Sparkline({ data }: { data: SparklineData }) {
  const { values } = data;
  if (!values || values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 24;
  const padding = 2;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

function calculateTrend(current: number, previous: number): { value: number; direction: 'positive' | 'negative' | 'neutral' } {
  if (previous === 0) {
    return { value: 0, direction: 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) {
    return { value: 0, direction: 'neutral' };
  }
  return {
    value: Math.round(Math.abs(change)),
    direction: change > 0 ? 'positive' : 'negative',
  };
}

// Mock sparkline data (in real implementation, this would come from API)
function generateMockSparkline(baseValue: number): SparklineData {
  const variance = baseValue * 0.3;
  const values = Array.from({ length: 7 }, () =>
    Math.max(0, baseValue + (Math.random() - 0.5) * variance)
  );
  return { values };
}

export function SummaryCards({ summary, previousSummary }: Props) {
  let addFilter: ((filter: { type: 'province' | 'severity' | 'cause' | 'road'; value: string; label: string }) => void) | undefined;
  try {
    const context = useDashboard();
    addFilter = context.addFilter;
  } catch {
  }

  if (!summary) {
    return null;
  }

  const formatHour = (hour: number): string => {
    if (hour < 0) return '--';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${period}`;
  };

  // Calculate trends (using previous data if available, otherwise mock)
  const activeTrend = previousSummary
    ? calculateTrend(summary.active_incidents, previousSummary.active_incidents)
    : { value: 12, direction: 'positive' as const };

  const severeTrend = previousSummary
    ? calculateTrend(summary.severe_incidents, previousSummary.severe_incidents)
    : { value: 5, direction: 'negative' as const };

  const todayTrend = previousSummary
    ? calculateTrend(summary.todays_total, previousSummary.todays_total)
    : { value: 8, direction: 'positive' as const };

  const handleSevereClick = () => {
    if (addFilter) {
      addFilter({ type: 'severity', value: 'high', label: 'High & Highest' });
    }
  };

  return (
    <div className="grid grid-cols-4">
      <div className="card summary-card active">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            📍
          </div>
          <TrendBadge trend={activeTrend} invertColor />
        </div>
        <div className="card-value">{summary.active_incidents.toLocaleString()}</div>
        <div className="card-title">Active Incidents</div>
        <div className="card-subtitle">Currently ongoing</div>
        <div className="sparkline-container">
          <Sparkline data={generateMockSparkline(summary.active_incidents)} />
        </div>
      </div>

      {/* Severe Incidents */}
      <button
        className="card summary-card severe"
        onClick={handleSevereClick}
        style={{ cursor: addFilter ? 'pointer' : 'default', textAlign: 'left' }}
        aria-label={`${summary.severe_incidents} severe incidents. Click to filter.`}
      >
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            ⚠️
          </div>
          <TrendBadge trend={severeTrend} invertColor />
        </div>
        <div className="card-value">{summary.severe_incidents.toLocaleString()}</div>
        <div className="card-title">Severe Incidents</div>
        <div className="card-subtitle">High or highest severity</div>
        <div className="sparkline-container">
          <Sparkline data={generateMockSparkline(summary.severe_incidents)} />
        </div>
      </button>

      {/* Today's Total */}
      <div className="card summary-card today">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            📅
          </div>
          <TrendBadge trend={todayTrend} invertColor />
        </div>
        <div className="card-value">{summary.todays_total.toLocaleString()}</div>
        <div className="card-title">Today's Total</div>
        <div className="card-subtitle">Incidents reported today</div>
        <div className="sparkline-container">
          <Sparkline data={generateMockSparkline(summary.todays_total)} />
        </div>
      </div>

      {/* Peak Hour */}
      <div className="card summary-card peak-hour">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            🕐
          </div>
        </div>
        <div className="card-value">{formatHour(summary.peak_hour)}</div>
        <div className="card-title">Peak Hour</div>
        <div className="card-subtitle">{summary.peak_hour_count} incidents at this hour</div>
        <div className="sparkline-container">
          <Sparkline data={generateMockSparkline(summary.peak_hour_count || 10)} />
        </div>
      </div>
    </div>
  );
}

interface TrendBadgeProps {
  trend: { value: number; direction: 'positive' | 'negative' | 'neutral' };
  invertColor?: boolean; // For metrics where "up" is bad (like incidents)
}

function TrendBadge({ trend, invertColor = false }: TrendBadgeProps) {
  if (trend.direction === 'neutral' || trend.value === 0) {
    return (
      <span className="summary-card-trend neutral">
        — 0%
      </span>
    );
  }

  const arrow = trend.direction === 'positive' ? '↑' : '↓';
  
  // For incident counts, positive (more incidents) is bad
  // For duration, positive (longer) is also bad
  let colorClass = trend.direction;
  if (invertColor) {
    colorClass = trend.direction === 'positive' ? 'negative' : 'positive';
  }

  return (
    <span className={`summary-card-trend ${colorClass}`}>
      {arrow} {trend.value}%
    </span>
  );
}
