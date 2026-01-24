import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { HourlyTrendChart } from '../HourlyTrendChart';
import { DailyTrendChart } from '../DailyTrendChart';
import { SkeletonChart } from '../Skeleton';

interface TrendsPageProps {
  currentPath: string;
}

export function TrendsPage({ currentPath }: TrendsPageProps) {
  return (
    <AppLayout title="Trends" currentPath={currentPath}>
      <TrendsContent />
    </AppLayout>
  );
}

function TrendsContent() {
  const data = useDashboardData();

  if (data.loading) {
    return (
      <>
        <h2 className="section-title" style={{ marginTop: 0 }}>Hourly Trends</h2>
        <SkeletonChart />
        
        <h2 className="section-title">Daily Trends</h2>
        <SkeletonChart />
      </>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">⚠️</span>
        <div>Error loading trends data</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <h2 className="section-title" style={{ marginTop: 0 }}>Hourly Trends</h2>
      <div style={{ marginBottom: '1.5rem' }}>
        <HourlyTrendChart data={data.hourlyTrend} />
      </div>

      <h2 className="section-title">Daily Trends</h2>
      <DailyTrendChart data={data.dailyTrend} />

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Understanding the Data</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <strong>Hourly Trend</strong> shows incident frequency over the last 24 hours, helping identify 
          peak activity periods and rush hour patterns.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
          <strong>Daily Trend</strong> displays the 7-day rolling pattern, useful for spotting 
          weekly cycles and comparing weekday vs weekend traffic incidents.
        </p>
      </div>
    </>
  );
}
