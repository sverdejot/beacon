import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { SeverityDonut } from '../SeverityDonut';
import { CauseTypeChart } from '../CauseTypeChart';
import { ProvinceChart } from '../ProvinceChart';
import { SkeletonChart } from '../Skeleton';

interface DistributionPageProps {
  currentPath: string;
  lang?: string;
}

export function DistributionPage({ currentPath, lang }: DistributionPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.distribution')} currentPath={currentPath} lang={lang as SupportedLang}>
      <DistributionContent />
    </AppLayout>
  );
}

function DistributionContent() {
  const { t } = useTranslation();
  const data = useDashboardData();

  if (data.loading) {
    return (
      <>
        <h2 className="section-title" style={{ marginTop: 0 }}>{t('distributionPage.bySeverity')}</h2>
        <SkeletonChart />

        <h2 className="section-title">{t('distributionPage.byCauseType')}</h2>
        <SkeletonChart />

        <h2 className="section-title">{t('distributionPage.byProvince')}</h2>
        <SkeletonChart />
      </>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">&#x26A0;&#xFE0F;</span>
        <div>{t('error.loadingDistribution')}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>{t('distributionPage.bySeverity')}</h2>
          <SeverityDonut data={data.severityDistribution} />
        </div>
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>{t('distributionPage.byProvince')}</h2>
          <ProvinceChart data={data.provinceDistribution} />
        </div>
      </div>

      <h2 className="section-title">{t('distributionPage.byCauseType')}</h2>
      <CauseTypeChart data={data.causeTypeDistribution} />

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('distributionPage.insightsTitle')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              {t('distributionPage.severityLevels')}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {t('distributionPage.severityDesc')}
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              {t('distributionPage.causeTypes')}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {t('distributionPage.causeDesc')}
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              {t('distributionPage.geoSpread')}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {t('distributionPage.geoDesc')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
