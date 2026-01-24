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
