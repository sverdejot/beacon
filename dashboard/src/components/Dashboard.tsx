import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboard } from '../context/DashboardContext';
import { useSSE } from '../hooks/useSSE';
import { SummaryCards } from './SummaryCards';
import { HourlyTrendChart } from './HourlyTrendChart';
import { DailyTrendChart } from './DailyTrendChart';
import { SeverityDonut } from './SeverityDonut';
import { CauseTypeChart } from './CauseTypeChart';
import { ProvinceChart } from './ProvinceChart';
import { TopRoadsTable } from './TopRoadsTable';
import { TopSubtypesTable } from './TopSubtypesTable';
import { ActiveIncidentsTable } from './ActiveIncidentsTable';
import { IncidentHeatmap } from './IncidentHeatmap';
import { LiveMap } from './LiveMap';
import { ImpactMetricsCards } from './ImpactMetricsCards';
import { DurationDistributionChart } from './DurationDistributionChart';
import { RouteAnalysisTable } from './RouteAnalysisTable';
import { DirectionalFlowChart } from './DirectionalFlowChart';
import { RushHourComparison } from './RushHourComparison';
import { HotspotsMap } from './HotspotsMap';
import { AnomaliesPanel } from './AnomaliesPanel';

export default function Dashboard() {
  const { filters } = useDashboard();
  const data = useDashboardData(filters);
  const sse = useSSE();

  // Prefer SSE summary for real-time updates, fall back to API data
  const summary = sse.summary || data.summary;

  if (data.loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="dashboard">
        <div className="error">Error: {data.error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Beacon Traffic Analytics</h1>
        <div className={`connection-status ${sse.connected ? 'connected' : ''}`}>
          <span className="dot" />
          {sse.connected ? 'Live' : 'Connecting...'}
        </div>
      </header>

      <LiveMap />

      <SummaryCards summary={summary} hourlyTrend={data.hourlyTrend} dailyTrend={data.dailyTrend} />

      <h2 className="section-title">Impact Metrics</h2>
      <ImpactMetricsCards data={data.impactSummary} />

      <h2 className="section-title">Alerts & Anomalies</h2>
      <AnomaliesPanel data={data.anomalies} />

      <h2 className="section-title">Trends</h2>
      <div className="grid grid-cols-2">
        <HourlyTrendChart data={data.hourlyTrend} />
        <DailyTrendChart data={data.dailyTrend} />
      </div>

      <h2 className="section-title">Time Analysis</h2>
      <div className="grid grid-cols-2">
        <RushHourComparison data={data.rushHourStats} />
        <DurationDistributionChart data={data.durationDistribution} />
      </div>

      <h2 className="section-title">Distribution</h2>
      <div className="grid grid-cols-3">
        <SeverityDonut data={data.severityDistribution} />
        <CauseTypeChart data={data.causeTypeDistribution} />
        <DirectionalFlowChart data={data.directionAnalysis} />
      </div>

      <h2 className="section-title">Corridor Analysis</h2>
      <div className="grid grid-cols-2">
        <RouteAnalysisTable data={data.routeAnalysis} />
        <ProvinceChart data={data.provinceDistribution} />
      </div>

      <h2 className="section-title">Top Statistics</h2>
      <div className="grid grid-cols-2">
        <TopRoadsTable data={data.topRoads} />
        <TopSubtypesTable data={data.topSubtypes} />
      </div>

      <h2 className="section-title">Recurring Hotspots</h2>
      <HotspotsMap data={data.hotspots} />

      <h2 className="section-title">Density Heatmap</h2>
      <IncidentHeatmap data={data.heatmapData} />

      <h2 className="section-title">Active Incidents</h2>
      <ActiveIncidentsTable data={data.activeIncidents} />
    </div>
  );
}
