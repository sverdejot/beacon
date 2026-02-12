import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDashboard } from '../../context/DashboardContext';
import { IncidentHeatmap } from '../IncidentHeatmap';

interface HeatmapPageProps {
  currentPath: string;
  lang?: string;
}

export function HeatmapPage({ currentPath, lang }: HeatmapPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.heatmap')} currentPath={currentPath} lang={lang as SupportedLang}>
      <HeatmapContent />
    </AppLayout>
  );
}

function HeatmapContent() {
  const { t } = useTranslation();
  const { filters } = useDashboard();
  const data = useDashboardData(filters);

  if (data.loading) {
    return (
      <div className="card" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="skeleton skeleton-title" style={{ width: '200px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 'calc(100% - 3rem)', borderRadius: '0.5rem' }} />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">&#x26A0;&#xFE0F;</span>
        <div>{t('error.loadingHeatmap')}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <IncidentHeatmap data={data.heatmapData} />
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('heatmapPage.aboutTitle')}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          {t('heatmapPage.aboutDesc1')}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
          {t('heatmapPage.aboutDesc2')}
        </p>
      </div>
    </>
  );
}
