import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="card anomalies-panel">
        <div className="anomalies-header">
          <h3 className="card-title">{t('anomalies.title')}</h3>
          <span className="anomalies-status normal">
            {`✓ ${t('anomalies.allNormal')}`}
          </span>
        </div>
        <p className="card-subtitle">{t('anomalies.noPatterns')}</p>
        <div className="anomalies-empty">
          <span className="anomalies-empty-icon">✨</span>
          <span>{t('anomalies.patternsNormal')}</span>
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
        <h3 className="card-title">{t('anomalies.title')}</h3>
        <span className={`anomalies-status ${highSeverity.length > 0 ? 'alert' : 'warning'}`}>
          {highSeverity.length > 0 ? `⚠️ ${t('anomalies.alert')}` : `⚡ ${t('anomalies.anomalies')}`}
        </span>
      </div>
      <p className="card-subtitle">
        {t('anomalies.patternsDetected', { count: data.length })}
      </p>

      <div className="anomalies-summary">
        {highSeverity.length > 0 && (
          <span className="anomaly-count high">{t('anomalies.high', { count: highSeverity.length })}</span>
        )}
        {mediumSeverity.length > 0 && (
          <span className="anomaly-count medium">{t('anomalies.medium', { count: mediumSeverity.length })}</span>
        )}
        {lowSeverity.length > 0 && (
          <span className="anomaly-count low">{t('anomalies.low', { count: lowSeverity.length })}</span>
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
                <span className="anomaly-current">{t('anomalies.today', { count: anomaly.current_count })}</span>
                <span className="anomaly-vs">vs</span>
                <span className="anomaly-baseline">{t('anomalies.avg', { value: anomaly.baseline_count.toFixed(1) })}</span>
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
          {t('anomalies.moreAnomalies', { count: data.length - 8 })}
        </div>
      )}
    </div>
  );
}
