import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActiveIncident } from '../lib/types';
import { useDashboard } from '../context/DashboardContext';

interface Props {
  data: ActiveIncident[];
}

type SortField = 'timestamp' | 'province' | 'severity' | 'duration_mins';
type SortDirection = 'asc' | 'desc';

const severityIcons: Record<string, string> = {
  highest: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
  unknown: '⚪',
};

export function ActiveIncidentsTable({ data }: Props) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filter, setFilter] = useState('');
  const { t } = useTranslation();

  // Try to get filter context
  let addFilter: ((filter: { type: 'province' | 'severity' | 'cause' | 'road'; value: string; label: string }) => void) | undefined;
  
  try {
    const context = useDashboard();
    addFilter = context.addFilter;
  } catch {
    // Context not available
  }

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
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    }
    return <span style={{ marginLeft: '4px' }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleProvinceClick = (province: string) => {
    if (addFilter) {
      addFilter({ type: 'province', value: province, label: province });
    }
  };

  const handleCauseClick = (cause: string) => {
    if (addFilter) {
      addFilter({ type: 'cause', value: cause, label: cause.replace(/_/g, ' ') });
    }
  };

  return (
    <div className="card table-card">
      <div className="table-header">
        <span className="card-title" style={{ margin: 0 }}>
          {t('activeIncidents.title', { count: sortedData.length })}
        </span>
        <input
          type="text"
          placeholder={t('table.filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="table-filter-input"
          aria-label={t('table.filterLabel')}
        />
      </div>
      <div className="table-container" role="region" aria-label="Active incidents table">
        <table>
          <thead>
            <tr>
              <th
                onClick={() => handleSort('timestamp')}
                className="sortable"
                scope="col"
                aria-sort={sortField === 'timestamp' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t('table.time')}
                <SortIndicator field="timestamp" />
              </th>
              <th
                onClick={() => handleSort('province')}
                className="sortable"
                scope="col"
                aria-sort={sortField === 'province' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t('table.province')}
                <SortIndicator field="province" />
              </th>
              <th scope="col">{t('table.road')}</th>
              <th
                onClick={() => handleSort('severity')}
                className="sortable"
                scope="col"
                aria-sort={sortField === 'severity' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t('table.severity')}
                <SortIndicator field="severity" />
              </th>
              <th scope="col">{t('table.cause')}</th>
              <th
                onClick={() => handleSort('duration_mins')}
                className="sortable"
                scope="col"
                aria-sort={sortField === 'duration_mins' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {t('table.duration')}
                <SortIndicator field="duration_mins" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((inc) => (
              <tr key={inc.id}>
                <td>{formatTime(inc.timestamp)}</td>
                <td>
                  {addFilter ? (
                    <button
                      onClick={() => handleProvinceClick(inc.province)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                      }}
                      title={t('table.clickToFilterProvince')}
                    >
                      {inc.province}
                    </button>
                  ) : (
                    inc.province
                  )}
                </td>
                <td>{inc.road_number || '-'}</td>
                <td>
                  <span className={`severity-badge ${inc.severity}`}>
                    <span aria-hidden="true">{severityIcons[inc.severity] || '⚪'}</span>
                    {inc.severity}
                  </span>
                </td>
                <td>
                  {addFilter ? (
                    <button
                      onClick={() => handleCauseClick(inc.cause_type)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                      }}
                      title={t('table.clickToFilterCause')}
                    >
                      {inc.cause_type.replace(/_/g, ' ') || '-'}
                    </button>
                  ) : (
                    inc.cause_type.replace(/_/g, ' ') || '-'
                  )}
                </td>
                <td>{formatDuration(inc.duration_mins)}</td>
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <span className="empty-state-icon">🔍</span>
                    <div className="empty-state-title">{t('empty.noIncidents')}</div>
                    <div className="empty-state-description">
                      {filter ? t('empty.adjustFilter') : t('empty.noActiveIncidents')}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
