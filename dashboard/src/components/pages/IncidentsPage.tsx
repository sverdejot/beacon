import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useDashboard } from '../../context/DashboardContext';
import { ActiveIncidentsTable } from '../ActiveIncidentsTable';
import { SkeletonTable } from '../Skeleton';

interface IncidentsPageProps {
  currentPath: string;
  lang?: string;
}

export function IncidentsPage({ currentPath, lang }: IncidentsPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.activeIncidents')} currentPath={currentPath} lang={lang as SupportedLang}>
      <IncidentsContent />
    </AppLayout>
  );
}

function IncidentsContent() {
  const { t } = useTranslation();
  const { filters } = useDashboard();
  const data = useDashboardData(filters);

  if (data.loading) {
    return <SkeletonTable />;
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">&#x26A0;&#xFE0F;</span>
        <div>{t('error.loadingIncidents')}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {t('incidentsPage.description')}
        </p>
      </div>

      <ActiveIncidentsTable data={data.activeIncidents} />
    </>
  );
}
