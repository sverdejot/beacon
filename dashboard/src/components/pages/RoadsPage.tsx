import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { TopRoadsTable } from '../TopRoadsTable';
import { TopSubtypesTable } from '../TopSubtypesTable';
import { SkeletonTable } from '../Skeleton';

interface RoadsPageProps {
  currentPath: string;
}

export function RoadsPage({ currentPath }: RoadsPageProps) {
  return (
    <AppLayout title="Top Roads" currentPath={currentPath}>
      <RoadsContent />
    </AppLayout>
  );
}

function RoadsContent() {
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
        <span className="error-icon">⚠️</span>
        <div>Error loading roads data</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Statistics on the most affected roads and common incident subtypes over the last 7 days.
        </p>
      </div>

      <div className="grid grid-cols-2">
        <TopRoadsTable data={data.topRoads} />
        <TopSubtypesTable data={data.topSubtypes} />
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Road Analysis</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          The top roads list shows which highways and routes experience the most incidents. 
          This data can help identify corridors that may benefit from additional traffic 
          management resources or infrastructure improvements.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
          The subtypes breakdown reveals the specific causes behind incidents, from vehicle 
          breakdowns to weather-related issues, enabling targeted prevention strategies.
        </p>
      </div>
    </>
  );
}
