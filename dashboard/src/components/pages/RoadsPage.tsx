import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { TopRoadsTable } from '../TopRoadsTable';
import { TopSubtypesTable } from '../TopSubtypesTable';
import { SkeletonTable } from '../Skeleton';

interface RoadsPageProps {
  currentPath: string;
  lang?: string;
}

export function RoadsPage({ currentPath, lang }: RoadsPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.topRoads')} currentPath={currentPath} lang={lang as SupportedLang}>
      <RoadsContent />
    </AppLayout>
  );
}

function RoadsContent() {
  const { t } = useTranslation();
  const data = useDashboardData();

  if (data.loading) {
    return (
      <div className="grid grid-cols-2">
        <SkeletonTable />
        <SkeletonTable />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">&#x26A0;&#xFE0F;</span>
        <div>{t('error.loadingRoads')}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {t('roadsPage.description')}
        </p>
      </div>

      <div className="grid grid-cols-2">
        <TopRoadsTable data={data.topRoads} />
        <TopSubtypesTable data={data.topSubtypes} />
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('roadsPage.analysisTitle')}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          {t('roadsPage.analysisDesc1')}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
          {t('roadsPage.analysisDesc2')}
        </p>
      </div>
    </>
  );
}
