import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { ActiveIncidentsTable } from '../ActiveIncidentsTable';
import { SkeletonTable } from '../Skeleton';

interface IncidentsPageProps {
  currentPath: string;
}

export function IncidentsPage({ currentPath }: IncidentsPageProps) {
  return (
    <AppLayout title="Active Incidents" currentPath={currentPath}>
      <IncidentsContent />
    </AppLayout>
  );
}

function IncidentsContent() {
  const data = useDashboardData();

  if (data.loading) {
    return <SkeletonTable />;
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">⚠️</span>
        <div>Error loading incidents data</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Real-time list of all currently active traffic incidents across Spain. 
          Click column headers to sort, use the filter to search.
        </p>
      </div>

      <ActiveIncidentsTable data={data.activeIncidents} />
    </>
  );
}
