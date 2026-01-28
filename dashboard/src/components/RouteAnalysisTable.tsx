import type { RouteIncidentStats } from '../lib/types';
import { useTranslation } from 'react-i18next';

interface Props {
  data: RouteIncidentStats[];
}

function getSeverityLabel(severity: number, t: (key: string) => string): string {
  if (severity >= 4.5) return t('severity.critical');
  if (severity >= 3.5) return t('severity.high');
  if (severity >= 2.5) return t('severity.medium');
  return t('severity.low');
}

function getSeverityColor(severity: number): string {
  if (severity >= 4.5) return 'severity-highest';
  if (severity >= 3.5) return 'severity-high';
  if (severity >= 2.5) return 'severity-medium';
  return 'severity-low';
}

export function RouteAnalysisTable({ data }: Props) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">{t('routeAnalysis.title')}</h3>
        <div className="table-empty">{t('empty.noRouteData')}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">{t('routeAnalysis.title')}</h3>
      <p className="card-subtitle">{t('routeAnalysis.subtitle')}</p>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('table.road')}</th>
              <th>{t('table.incidents')}</th>
              <th>{t('table.severity')}</th>
              <th>{t('table.affected')}</th>
              <th>{t('table.commonCauses')}</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((route, index) => (
              <tr key={route.road_number}>
                <td className="rank">{index + 1}</td>
                <td className="road">
                  <span className="road-number">{route.road_number}</span>
                  {route.road_name && (
                    <span className="road-name">{route.road_name}</span>
                  )}
                </td>
                <td className="count">{route.incident_count}</td>
                <td>
                  <span className={`severity-badge ${getSeverityColor(route.avg_severity)}`}>
                    {getSeverityLabel(route.avg_severity, t)}
                  </span>
                </td>
                <td className="km">{route.total_length_km.toFixed(1)} km</td>
                <td className="causes">
                  {route.common_causes.slice(0, 2).map((cause, i) => (
                    <span key={i} className="cause-tag">
                      {cause.replace(/_/g, ' ')}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
