import type { Summary } from '../lib/types';

interface Props {
  summary: Summary | null;
}

export function SummaryCards({ summary }: Props) {
  if (!summary) {
    return null;
  }

  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${Math.round(mins)} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="grid grid-cols-4">
      <div className="card summary-card active">
        <div className="card-title">Active Incidents</div>
        <div className="card-value">{summary.active_incidents}</div>
        <div className="card-subtitle">Currently ongoing</div>
      </div>

      <div className="card summary-card severe">
        <div className="card-title">Severe Incidents</div>
        <div className="card-value">{summary.severe_incidents}</div>
        <div className="card-subtitle">High or highest severity</div>
      </div>

      <div className="card summary-card today">
        <div className="card-title">Today's Total</div>
        <div className="card-value">{summary.todays_total}</div>
        <div className="card-subtitle">Incidents reported today</div>
      </div>

      <div className="card summary-card duration">
        <div className="card-title">Avg Duration</div>
        <div className="card-value">{formatDuration(summary.avg_duration_mins)}</div>
        <div className="card-subtitle">Last 7 days</div>
      </div>
    </div>
  );
}
