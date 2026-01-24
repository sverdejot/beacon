import { useState, useMemo } from 'react';
import type { ActiveIncident } from '../lib/types';

interface Props {
  data: ActiveIncident[];
}

type SortField = 'timestamp' | 'province' | 'severity' | 'duration_mins';
type SortDirection = 'asc' | 'desc';

export function ActiveIncidentsTable({ data }: Props) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filter, setFilter] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    let filtered = data;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = data.filter(
        (inc) =>
          inc.province.toLowerCase().includes(lowerFilter) ||
          inc.road_number.toLowerCase().includes(lowerFilter) ||
          inc.cause_type.toLowerCase().includes(lowerFilter)
      );
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'province':
          comparison = a.province.localeCompare(b.province);
          break;
        case 'severity':
          const severityOrder = { highest: 0, high: 1, medium: 2, low: 3, unknown: 4 };
          comparison =
            (severityOrder[a.severity as keyof typeof severityOrder] || 4) -
            (severityOrder[b.severity as keyof typeof severityOrder] || 4);
          break;
        case 'duration_mins':
          comparison = a.duration_mins - b.duration_mins;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection, filter]);

  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${Math.round(mins)} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    return `${hours}h ${remainingMins}m`;
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>;
  };

  return (
    <div className="card table-card">
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Active Incidents ({sortedData.length})</span>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#f1f5f9',
            fontSize: '0.75rem',
          }}
        />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>
                Time
                <SortIndicator field="timestamp" />
              </th>
              <th onClick={() => handleSort('province')} style={{ cursor: 'pointer' }}>
                Province
                <SortIndicator field="province" />
              </th>
              <th>Road</th>
              <th onClick={() => handleSort('severity')} style={{ cursor: 'pointer' }}>
                Severity
                <SortIndicator field="severity" />
              </th>
              <th>Cause</th>
              <th onClick={() => handleSort('duration_mins')} style={{ cursor: 'pointer' }}>
                Duration
                <SortIndicator field="duration_mins" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((inc) => (
              <tr key={inc.id}>
                <td>{formatTime(inc.timestamp)}</td>
                <td>{inc.province}</td>
                <td>{inc.road_number || '-'}</td>
                <td>
                  <span className={`severity-badge ${inc.severity}`}>{inc.severity}</span>
                </td>
                <td>{inc.cause_type.replace(/_/g, ' ') || '-'}</td>
                <td>{formatDuration(inc.duration_mins)}</td>
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  No active incidents
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
