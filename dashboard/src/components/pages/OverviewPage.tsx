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

interface OverviewPageProps {
  currentPath: string;
}

export function OverviewPage({ currentPath }: OverviewPageProps) {
  return (
    <AppLayout title="Overview" currentPath={currentPath}>
      <OverviewContent />
    </AppLayout>
  );
}

function OverviewContent() {
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

        <h2 className="section-title">Trends</h2>
        <div className="grid grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        <h2 className="section-title">Distribution</h2>
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
        <span className="error-icon">⚠️</span>
        <div>Error loading dashboard data</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <SummaryCards summary={summary} />
      </div>

      <LiveMap />

      <h2 className="section-title">Trends</h2>
      <div className="grid grid-cols-2">
        <HourlyTrendChart data={data.hourlyTrend} />
        <DailyTrendChart data={data.dailyTrend} />
      </div>

      <h2 className="section-title">Distribution</h2>
      <div className="grid grid-cols-2">
        <SeverityDonut data={data.severityDistribution} />
        <CauseTypeChart data={data.causeTypeDistribution} />
      </div>
    </>
  );
}
