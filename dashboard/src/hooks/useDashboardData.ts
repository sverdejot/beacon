import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import type { QueryParams } from '../lib/api';
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
import type { Filter } from '../context/DashboardContext';

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

function filtersToParams(timeRange: string, filters: Filter[]): QueryParams {
  const params: QueryParams = { timeRange };

  for (const filter of filters) {
    switch (filter.type) {
      case 'province':
        params.province = filter.value;
        break;
      case 'severity':
        params.severity = filter.value;
        break;
      case 'cause':
        params.cause = filter.value;
        break;
      case 'road':
        params.road = filter.value;
        break;
    }
  }

  return params;
}

export function useDashboardData(filters: Filter[] = []) {
  const timeRange = '7d';
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
    const params = filtersToParams(timeRange, filters);

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
        api.getSummary(params),
        api.getHourlyTrend(params),
        api.getDailyTrend(params),
        api.getSeverityDistribution(params),
        api.getCauseTypeDistribution(params),
        api.getProvinceDistribution(params),
        api.getTopRoads(10, params),
        api.getTopSubtypes(20, params),
        api.getHeatmapData(params),
        api.getActiveIncidents(params),
        api.getImpactSummary(params),
        api.getDurationDistribution(params),
        api.getRouteAnalysis(20, params),
        api.getDirectionAnalysis(params),
        api.getRushHourComparison(params),
        api.getHotspots(50, params),
        api.getAnomalies(params),
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
  }, [timeRange, filters]);

  useEffect(() => {
    fetchAll();
    // Refresh data every 60 seconds
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { ...data, refresh: fetchAll };
}
