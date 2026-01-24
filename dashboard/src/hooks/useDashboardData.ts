import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import type {
  Summary,
  HourlyDataPoint,
  DailyDataPoint,
  DistributionItem,
  TopRoad,
  TopSubtype,
  HeatmapPoint,
  ActiveIncident,
  ImpactSummary,
  DurationBucket,
  RouteIncidentStats,
  DirectionStats,
  RushHourStats,
  Hotspot,
  Anomaly,
} from '../lib/types';

interface DashboardData {
  summary: Summary | null;
  hourlyTrend: HourlyDataPoint[];
  dailyTrend: DailyDataPoint[];
  severityDistribution: DistributionItem[];
  causeTypeDistribution: DistributionItem[];
  provinceDistribution: DistributionItem[];
  topRoads: TopRoad[];
  topSubtypes: TopSubtype[];
  heatmapData: HeatmapPoint[];
  activeIncidents: ActiveIncident[];
  impactSummary: ImpactSummary | null;
  durationDistribution: DurationBucket[];
  routeAnalysis: RouteIncidentStats[];
  directionAnalysis: DirectionStats[];
  rushHourStats: RushHourStats[];
  hotspots: Hotspot[];
  anomalies: Anomaly[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    summary: null,
    hourlyTrend: [],
    dailyTrend: [],
    severityDistribution: [],
    causeTypeDistribution: [],
    provinceDistribution: [],
    topRoads: [],
    topSubtypes: [],
    heatmapData: [],
    activeIncidents: [],
    impactSummary: null,
    durationDistribution: [],
    routeAnalysis: [],
    directionAnalysis: [],
    rushHourStats: [],
    hotspots: [],
    anomalies: [],
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [
        summary,
        hourlyTrendRes,
        dailyTrendRes,
        severityRes,
        causeTypeRes,
        provinceRes,
        topRoadsRes,
        topSubtypesRes,
        heatmapRes,
        activeIncidentsRes,
        // New analytics
        impactSummaryRes,
        durationDistributionRes,
        routeAnalysisRes,
        directionAnalysisRes,
        rushHourRes,
        hotspotsRes,
        anomaliesRes,
      ] = await Promise.all([
        api.getSummary(),
        api.getHourlyTrend(),
        api.getDailyTrend(),
        api.getSeverityDistribution(),
        api.getCauseTypeDistribution(),
        api.getProvinceDistribution(),
        api.getTopRoads(),
        api.getTopSubtypes(),
        api.getHeatmapData(),
        api.getActiveIncidents(),
        api.getImpactSummary(),
        api.getDurationDistribution(),
        api.getRouteAnalysis(),
        api.getDirectionAnalysis(),
        api.getRushHourComparison(),
        api.getHotspots(),
        api.getAnomalies(),
      ]);

      setData({
        summary,
        hourlyTrend: hourlyTrendRes.data || [],
        dailyTrend: dailyTrendRes.data || [],
        severityDistribution: severityRes.data || [],
        causeTypeDistribution: causeTypeRes.data || [],
        provinceDistribution: provinceRes.data || [],
        topRoads: topRoadsRes.data || [],
        topSubtypes: topSubtypesRes.data || [],
        heatmapData: heatmapRes.data || [],
        activeIncidents: activeIncidentsRes.data || [],
        impactSummary: impactSummaryRes.data || null,
        durationDistribution: durationDistributionRes.data || [],
        routeAnalysis: routeAnalysisRes.data || [],
        directionAnalysis: directionAnalysisRes.data || [],
        rushHourStats: rushHourRes.data || [],
        hotspots: hotspotsRes.data || [],
        anomalies: anomaliesRes.data || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch data',
      }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { ...data, refresh: fetchAll };
}
