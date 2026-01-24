import type { Anomaly } from '../lib/types';

interface Props {
  data: Anomaly[];
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'high':
      return 'anomaly-high';
    case 'medium':
      return 'anomaly-medium';
    default:
      return 'anomaly-low';
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'high':
      return '🔴';
    case 'medium':
      return '🟠';
    default:
      return '🟡';
  }
}

function getDimensionIcon(dimension: string): string {
  switch (dimension) {
    case 'province':
      return '📍';
    case 'cause_type':
      return '⚡';
    case 'hour':
      return '🕐';
    default:
      return '📊';
  }
}

function formatValue(dimension: string, value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AnomaliesPanel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card anomalies-panel">
        <div className="anomalies-header">
          <h3 className="card-title">Anomaly Detection</h3>
          <span className="anomalies-status normal">
            ✓ All Normal
          </span>
        </div>
        <p className="card-subtitle">No unusual patterns detected today</p>
        <div className="anomalies-empty">
          <span className="anomalies-empty-icon">✨</span>
          <span>Traffic patterns are within expected ranges</span>
        </div>
      </div>
    );
  }

  const highSeverity = data.filter((a) => a.severity === 'high');
  const mediumSeverity = data.filter((a) => a.severity === 'medium');
  const lowSeverity = data.filter((a) => a.severity === 'low');

  return (
    <div className="card anomalies-panel">
      <div className="anomalies-header">
        <h3 className="card-title">Anomaly Detection</h3>
        <span className={`anomalies-status ${highSeverity.length > 0 ? 'alert' : 'warning'}`}>
          {highSeverity.length > 0 ? '⚠️ Alert' : '⚡ Anomalies'}
        </span>
      </div>
      <p className="card-subtitle">
        {data.length} unusual pattern{data.length !== 1 ? 's' : ''} detected (vs 7-day baseline)
      </p>

      <div className="anomalies-summary">
        {highSeverity.length > 0 && (
          <span className="anomaly-count high">{highSeverity.length} high</span>
        )}
        {mediumSeverity.length > 0 && (
          <span className="anomaly-count medium">{mediumSeverity.length} medium</span>
        )}
        {lowSeverity.length > 0 && (
          <span className="anomaly-count low">{lowSeverity.length} low</span>
        )}
      </div>

      <div className="anomalies-list">
        {data.slice(0, 8).map((anomaly, index) => (
          <div 
            key={`${anomaly.dimension}-${anomaly.value}-${index}`} 
            className={`anomaly-item ${getSeverityClass(anomaly.severity)}`}
          >
            <div className="anomaly-icon">
              {getSeverityIcon(anomaly.severity)}
            </div>
            <div className="anomaly-content">
              <div className="anomaly-title">
                <span className="dimension-icon">{getDimensionIcon(anomaly.dimension)}</span>
                <span className="anomaly-value">{formatValue(anomaly.dimension, anomaly.value)}</span>
              </div>
              <div className="anomaly-stats">
                <span className="anomaly-current">{anomaly.current_count} today</span>
                <span className="anomaly-vs">vs</span>
                <span className="anomaly-baseline">{anomaly.baseline_count.toFixed(1)} avg</span>
              </div>
            </div>
            <div className={`anomaly-deviation ${anomaly.deviation > 0 ? 'up' : 'down'}`}>
              {anomaly.deviation > 0 ? '↑' : '↓'} {Math.abs(anomaly.deviation).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {data.length > 8 && (
        <div className="anomalies-more">
          +{data.length - 8} more anomalies
        </div>
      )}
    </div>
  );
}
