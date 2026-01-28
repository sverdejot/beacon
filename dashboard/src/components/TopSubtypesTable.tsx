import type { TopSubtype } from '../lib/types';
import { useTranslation } from 'react-i18next';

interface Props {
  data: TopSubtype[];
}

// Map subtypes to emoji icons
const subtypeIcons: Record<string, string> = {
  accident: '💥',
  breakdown: '🚗',
  roadworks: '🚧',
  congestion: '🚦',
  weather: '🌧️',
  fog: '🌫️',
  rain: '🌧️',
  snow: '❄️',
  ice: '🧊',
  wind: '💨',
  fire: '🔥',
  animal: '🦌',
  object: '📦',
  closure: '🚫',
  lane_restriction: '↔️',
  default: '⚠️',
};

function getSubtypeIcon(subtype: string): string {
  const lowerSubtype = subtype.toLowerCase();
  for (const [key, icon] of Object.entries(subtypeIcons)) {
    if (lowerSubtype.includes(key)) {
      return icon;
    }
  }
  return subtypeIcons.default;
}

export function TopSubtypesTable({ data }: Props) {
  const { t } = useTranslation();

  // Calculate max for progress bar
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="card table-card">
      <div className="card-header">
        <span className="card-title">{t('topRoads.subtypes')}</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: '60px' }}>#</th>
              <th scope="col">{t('table.subtype')}</th>
              <th scope="col" style={{ width: '100px', textAlign: 'right' }}>{t('table.count')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.subtype}>
                <td style={{ color: 'var(--color-text-muted)' }}>{index + 1}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span aria-hidden="true">{getSubtypeIcon(item.subtype)}</span>
                      <span style={{ fontWeight: 500 }}>
                        {item.subtype.replace(/_/g, ' ')}
                      </span>
                    </div>
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
                          width: `${(item.count / maxCount) * 100}%`,
                          backgroundColor: 'var(--chart-2)',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {item.count.toLocaleString()}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <div className="empty-state">
                    <span className="empty-state-icon">📋</span>
                    <div className="empty-state-title">{t('empty.noSubtypeData')}</div>
                    <div className="empty-state-description">
                      {t('empty.subtypeStatsAppear')}
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
