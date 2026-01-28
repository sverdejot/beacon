import type { ImpactSummary } from '../lib/types';
import { useTranslation } from 'react-i18next';

interface Props {
  data: ImpactSummary | null;
}

export function ImpactMetricsCards({ data }: Props) {
  const { t } = useTranslation();
  if (!data) {
    return (
      <div className="grid grid-cols-4">
        <div className="card summary-card impact">
          <div className="summary-card-header">
            <div className="summary-card-icon" aria-hidden="true">🛣️</div>
          </div>
          <div className="card-value" style={{ color: 'var(--color-text-muted)' }}>--</div>
          <div className="card-title">{t('impact.totalAffected')}</div>
          <div className="card-subtitle">{t('impact.noData')}</div>
        </div>
        <div className="card summary-card province">
          <div className="summary-card-header">
            <div className="summary-card-icon" aria-hidden="true">📍</div>
          </div>
          <div className="card-value" style={{ color: 'var(--color-text-muted)' }}>--</div>
          <div className="card-title">{t('impact.topProvince')}</div>
          <div className="card-subtitle">{t('impact.noData')}</div>
        </div>
        <div className="card summary-card road">
          <div className="summary-card-header">
            <div className="summary-card-icon" aria-hidden="true">🛤️</div>
          </div>
          <div className="card-value" style={{ color: 'var(--color-text-muted)' }}>--</div>
          <div className="card-title">{t('impact.topRoad')}</div>
          <div className="card-subtitle">{t('impact.noData')}</div>
        </div>
        <div className="card summary-card weather">
          <div className="summary-card-header">
            <div className="summary-card-icon" aria-hidden="true">🌧️</div>
          </div>
          <div className="card-value" style={{ color: 'var(--color-text-muted)' }}>--</div>
          <div className="card-title">{t('impact.weatherImpact')}</div>
          <div className="card-subtitle">{t('impact.noData')}</div>
        </div>
      </div>
    );
  }

  const formatKm = (km: number): string => {
    if (km >= 1000) {
      return `${(km / 1000).toFixed(1)}k km`;
    }
    return `${km.toFixed(1)} km`;
  };

  const formatProvince = (province: string): string => {
    return province
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="grid grid-cols-4">
      {/* Total Affected Distance */}
      <div className="card summary-card impact">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            🛣️
          </div>
        </div>
        <div className="card-value">{formatKm(data.total_affected_km)}</div>
        <div className="card-title">{t('impact.totalAffected')}</div>
        <div className="card-subtitle">{t('impact.roadSegments')}</div>
      </div>

      {/* Top Province */}
      <div className="card summary-card province">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            📍
          </div>
        </div>
        <div className="card-value" style={{ fontSize: data.top_province.length > 10 ? '1.25rem' : '2rem' }}>
          {formatProvince(data.top_province)}
        </div>
        <div className="card-title">{t('impact.topProvince')}</div>
        <div className="card-subtitle">{t('impact.incidents7d', { count: data.top_province_count })}</div>
      </div>

      {/* Top Road */}
      <div className="card summary-card road">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            🛤️
          </div>
        </div>
        <div className="card-value" style={{ fontSize: data.top_road.length > 8 ? '1.25rem' : '2rem' }}>
          {data.top_road}
        </div>
        <div className="card-title">{t('impact.topRoad')}</div>
        <div className="card-subtitle">{t('impact.incidents7d', { count: data.top_road_count })}</div>
      </div>

      {/* Weather Impact */}
      <div className="card summary-card weather">
        <div className="summary-card-header">
          <div className="summary-card-icon" aria-hidden="true">
            🌧️
          </div>
        </div>
        <div className="card-value">{data.weather_impact_pct.toFixed(1)}%</div>
        <div className="card-title">{t('impact.weatherImpact')}</div>
        <div className="card-subtitle">{t('impact.weatherIncidents', { weather: data.weather_incidents, total: data.total_incidents })}</div>
      </div>
    </div>
  );
}
