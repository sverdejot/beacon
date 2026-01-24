import type { RouteIncidentStats } from '../lib/types';

interface Props {
  data: RouteIncidentStats[];
}

function getSeverityLabel(severity: number): string {
  if (severity >= 4.5) return 'Critical';
  if (severity >= 3.5) return 'High';
  if (severity >= 2.5) return 'Medium';
  return 'Low';
}

function getSeverityColor(severity: number): string {
  if (severity >= 4.5) return 'severity-highest';
  if (severity >= 3.5) return 'severity-high';
  if (severity >= 2.5) return 'severity-medium';
  return 'severity-low';
}

export function RouteAnalysisTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">Route Analysis</h3>
        <div className="table-empty">No route data available</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">Route Analysis</h3>
      <p className="card-subtitle">Top corridors by incident count (last 7 days)</p>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Road</th>
              <th>Incidents</th>
              <th>Severity</th>
              <th>Affected</th>
              <th>Common Causes</th>
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
                    {getSeverityLabel(route.avg_severity)}
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
