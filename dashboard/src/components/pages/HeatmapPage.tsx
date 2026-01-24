import { AppLayout } from '../AppLayout';
import { useDashboardData } from '../../hooks/useDashboardData';
import { IncidentHeatmap } from '../IncidentHeatmap';

interface HeatmapPageProps {
  currentPath: string;
}

export function HeatmapPage({ currentPath }: HeatmapPageProps) {
  return (
    <AppLayout title="Heatmap" currentPath={currentPath}>
      <HeatmapContent />
    </AppLayout>
  );
}

function HeatmapContent() {
  const data = useDashboardData();

  if (data.loading) {
    return (
      <div className="card" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <div className="skeleton skeleton-title" style={{ width: '200px', marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 'calc(100% - 3rem)', borderRadius: '0.5rem' }} />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="error">
        <span className="error-icon">⚠️</span>
        <div>Error loading heatmap data</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{data.error}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        <IncidentHeatmap data={data.heatmapData} />
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>About the Heatmap</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          This heatmap visualizes incident density across Spain over the last 7 days. 
          Warmer colors (red, orange) indicate areas with higher incident frequency, 
          while cooler colors (blue) show areas with fewer incidents.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
          Use this view to identify recurring problem areas and traffic hotspots that may 
          require infrastructure improvements or increased monitoring.
        </p>
      </div>
    </>
  );
}
