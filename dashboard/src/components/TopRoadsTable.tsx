import type { TopRoad } from '../lib/types';
import { useDashboard } from '../context/DashboardContext';
import { useTranslation } from 'react-i18next';

interface Props {
  data: TopRoad[];
}

export function TopRoadsTable({ data }: Props) {
  const { t } = useTranslation();

  // Try to get filter context
  let addFilter: ((filter: { type: 'province' | 'severity' | 'cause' | 'road'; value: string; label: string }) => void) | undefined;
  
  try {
    const context = useDashboard();
    addFilter = context.addFilter;
  } catch {
    // Context not available
  }

  const handleRoadClick = (road: string) => {
    if (addFilter) {
      addFilter({ type: 'road', value: road, label: road });
    }
  };

  // Calculate max for progress bar
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="card table-card">
      <div className="card-header">
        <span className="card-title">{t('topRoads.title')}</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: '60px' }}>#</th>
              <th scope="col">{t('table.road')}</th>
              <th scope="col" style={{ width: '100px', textAlign: 'right' }}>{t('table.incidents')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((road, index) => (
              <tr key={road.road}>
                <td style={{ color: 'var(--color-text-muted)' }}>{index + 1}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {addFilter ? (
                      <button
                        onClick={() => handleRoadClick(road.road)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text)',
                          cursor: 'pointer',
                          padding: 0,
                          font: 'inherit',
                          fontWeight: 500,
                          textAlign: 'left',
                        }}
                        title={t('table.clickToFilterRoad')}
                      >
                        {road.road}
                      </button>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{road.road}</span>
                    )}
                    {/* Progress bar */}
                    <div
                      style={{
                        height: '4px',
                        backgroundColor: 'var(--color-border)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(road.count / maxCount) * 100}%`,
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {road.count.toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <div className="empty-state">
                    <span className="empty-state-icon">🛣️</span>
                    <div className="empty-state-title">{t('empty.noRoadData')}</div>
                    <div className="empty-state-description">
                      {t('empty.roadStatsAppear')}
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
