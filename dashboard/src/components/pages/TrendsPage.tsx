import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { HourlyTrendChart } from '../HourlyTrendChart';
import { DailyTrendChart } from '../DailyTrendChart';
import { SkeletonChart } from '../Skeleton';

interface TrendsPageProps {
  currentPath: string;
  lang?: string;
}

export function TrendsPage({ currentPath, lang }: TrendsPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.trends')} currentPath={currentPath} lang={lang as SupportedLang}>
      <TrendsContent />
    </AppLayout>
  );
}

function TrendsContent() {
  const { t } = useTranslation();
  const data = useDashboardData();

  if (data.loading) {
    return (
      <>
        <h2 className="section-title" style={{ marginTop: 0 }}>{t('trendsPage.hourlyTrends')}</h2>
        <SkeletonChart />

        <h2 className="section-title">{t('trendsPage.dailyTrends')}</h2>
        <SkeletonChart />
      </>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">&#x26A0;&#xFE0F;</span>
        <div>{t('error.loadingTrends')}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <h2 className="section-title" style={{ marginTop: 0 }}>{t('trendsPage.hourlyTrends')}</h2>
      <div style={{ marginBottom: '1.5rem' }}>
        <HourlyTrendChart data={data.hourlyTrend} />
      </div>

      <h2 className="section-title">{t('trendsPage.dailyTrends')}</h2>
      <DailyTrendChart data={data.dailyTrend} />

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('trendsPage.understandingTitle')}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}
           dangerouslySetInnerHTML={{ __html: t('trendsPage.hourlyDesc') }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}
           dangerouslySetInnerHTML={{ __html: t('trendsPage.dailyDesc') }} />
      </div>
    </>
  );
}
