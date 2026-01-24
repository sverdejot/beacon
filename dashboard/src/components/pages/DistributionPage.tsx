import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { SeverityDonut } from '../SeverityDonut';
import { CauseTypeChart } from '../CauseTypeChart';
import { ProvinceChart } from '../ProvinceChart';
import { SkeletonChart } from '../Skeleton';

interface DistributionPageProps {
  currentPath: string;
}

export function DistributionPage({ currentPath }: DistributionPageProps) {
  return (
    <AppLayout title="Distribution" currentPath={currentPath}>
      <DistributionContent />
    </AppLayout>
  );
}

function DistributionContent() {
  const data = useDashboardData();

  if (data.loading) {
    return (
      <>
        <h2 className="section-title" style={{ marginTop: 0 }}>By Severity</h2>
        <SkeletonChart />
        
        <h2 className="section-title">By Cause Type</h2>
        <SkeletonChart />

        <h2 className="section-title">By Province</h2>
        <SkeletonChart />
      </>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">⚠️</span>
        <div>Error loading distribution data</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>By Severity</h2>
          <SeverityDonut data={data.severityDistribution} />
        </div>
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>By Province</h2>
          <ProvinceChart data={data.provinceDistribution} />
        </div>
      </div>

      <h2 className="section-title">By Cause Type</h2>
      <CauseTypeChart data={data.causeTypeDistribution} />

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Distribution Insights</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Severity Levels
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Incidents are classified from Low to Highest based on their impact on traffic flow and safety.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Cause Types
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              12 main categories including accidents, roadworks, weather conditions, and traffic congestion.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Geographic Spread
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Data covers all Spanish provinces with real-time updates from DGT.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
