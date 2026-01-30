import { useTranslation } from 'react-i18next';
import { initI18n, type SupportedLang } from '../../i18n';
import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useSSE } from '../../hooks/useSSE';
import { SummaryCards } from '../SummaryCards';
import { LiveMap } from '../LiveMap';
import { HourlyTrendChart } from '../HourlyTrendChart';
import { DailyTrendChart } from '../DailyTrendChart';
import { SeverityDonut } from '../SeverityDonut';
import { CauseTypeChart } from '../CauseTypeChart';
import { SummarySkeleton, SkeletonChart } from '../Skeleton';
import { ImpactMetricsCards } from '../ImpactMetricsCards';
import { DurationDistributionChart } from '../DurationDistributionChart';
import { RouteAnalysisTable } from '../RouteAnalysisTable';
import { DirectionalFlowChart } from '../DirectionalFlowChart';
import { RushHourComparison } from '../RushHourComparison';
import { HotspotsMap } from '../HotspotsMap';
import { AnomaliesPanel } from '../AnomaliesPanel';

interface OverviewPageProps {
  currentPath: string;
  lang?: string;
}

export function OverviewPage({ currentPath, lang }: OverviewPageProps) {
  initI18n(lang as SupportedLang);
  const { t } = useTranslation();
  return (
    <AppLayout title={t('pages.overview')} currentPath={currentPath} lang={lang as SupportedLang}>
      <OverviewContent />
    </AppLayout>
  );
}

function OverviewContent() {
  const { t } = useTranslation();
  const data = useDashboardData();
  const sse = useSSE();

  // Prefer SSE summary for real-time updates, fall back to API data
  const summary = sse.summary || data.summary;

  if (data.loading) {
    return (
      <>
        <SummarySkeleton />

        <div className="card livemap-card" style={{ marginTop: '1rem' }}>
          <div className="skeleton skeleton-title" style={{ width: '150px', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: 'calc(100% - 3rem)', borderRadius: '0.5rem' }} />
        </div>

        <h2 className="section-title">{t('section.trends')}</h2>
        <div className="grid grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        <h2 className="section-title">{t('section.distribution')}</h2>
        <div className="grid grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">&#x26A0;&#xFE0F;</span>
        <div>{t('error.loadingDashboard')}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <SummaryCards summary={summary} hourlyTrend={data.hourlyTrend} dailyTrend={data.dailyTrend} />
      </div>

      <h2 className="section-title">{t('section.impactMetrics')}</h2>
      <ImpactMetricsCards data={data.impactSummary} />

      <h2 className="section-title">{t('section.alertsAnomalies')}</h2>
      <div style={{ marginBottom: '1.5rem' }}>
        <AnomaliesPanel data={data.anomalies} />
      </div>

      <h2 className="section-title">{t('section.liveMap')}</h2>
      <LiveMap />

      <h2 className="section-title">{t('section.trends')}</h2>
      <div className="grid grid-cols-2">
        <HourlyTrendChart data={data.hourlyTrend} />
        <DailyTrendChart data={data.dailyTrend} />
      </div>

      <h2 className="section-title">{t('section.timeAnalysis')}</h2>
      <div className="grid grid-cols-2">
        <RushHourComparison data={data.rushHourStats} />
        <DurationDistributionChart data={data.durationDistribution} />
      </div>

      <h2 className="section-title">{t('section.distribution')}</h2>
      <div className="grid grid-cols-3">
        <SeverityDonut data={data.severityDistribution} />
        <CauseTypeChart data={data.causeTypeDistribution} />
        <DirectionalFlowChart data={data.directionAnalysis} />
      </div>

      <h2 className="section-title">{t('section.corridorAnalysis')}</h2>
      <RouteAnalysisTable data={data.routeAnalysis} />

      <h2 className="section-title">{t('section.recurringHotspots')}</h2>
      <HotspotsMap data={data.hotspots} />
    </>
  );
}
