import type {
  Summary,
  HourlyTrendResponse,
  DailyTrendResponse,
  DistributionResponse,
  TopRoadsResponse,
  TopSubtypesResponse,
  HeatmapResponse,
  ActiveIncidentsResponse,
  ImpactSummaryResponse,
  DurationDistributionResponse,
  RouteAnalysisResponse,
  DirectionAnalysisResponse,
  RushHourResponse,
  HotspotsResponse,
  AnomaliesResponse,
} from './types';

const API_BASE = '/api/dashboard';

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function getSummary(): Promise<Summary> {
  return fetchJSON<Summary>(`${API_BASE}/summary`);
}

export async function getHourlyTrend(): Promise<HourlyTrendResponse> {
  return fetchJSON<HourlyTrendResponse>(`${API_BASE}/trends/hourly`);
}

export async function getDailyTrend(): Promise<DailyTrendResponse> {
  return fetchJSON<DailyTrendResponse>(`${API_BASE}/trends/daily`);
}

export async function getSeverityDistribution(): Promise<DistributionResponse> {
  return fetchJSON<DistributionResponse>(`${API_BASE}/distribution/severity`);
}

export async function getCauseTypeDistribution(): Promise<DistributionResponse> {
  return fetchJSON<DistributionResponse>(`${API_BASE}/distribution/cause-type`);
}

export async function getProvinceDistribution(): Promise<DistributionResponse> {
  return fetchJSON<DistributionResponse>(`${API_BASE}/distribution/province`);
}

export async function getTopRoads(limit = 10): Promise<TopRoadsResponse> {
  return fetchJSON<TopRoadsResponse>(`${API_BASE}/top/roads?limit=${limit}`);
}

export async function getTopSubtypes(limit = 20): Promise<TopSubtypesResponse> {
  return fetchJSON<TopSubtypesResponse>(`${API_BASE}/top/subtypes?limit=${limit}`);
}

export async function getHeatmapData(): Promise<HeatmapResponse> {
  return fetchJSON<HeatmapResponse>(`${API_BASE}/heatmap`);
}

export async function getActiveIncidents(): Promise<ActiveIncidentsResponse> {
  return fetchJSON<ActiveIncidentsResponse>(`${API_BASE}/incidents/active`);
}

export async function getImpactSummary(): Promise<ImpactSummaryResponse> {
  return fetchJSON<ImpactSummaryResponse>(`${API_BASE}/impact/summary`);
}

export async function getDurationDistribution(): Promise<DurationDistributionResponse> {
  return fetchJSON<DurationDistributionResponse>(`${API_BASE}/duration/distribution`);
}

export async function getRouteAnalysis(limit = 20): Promise<RouteAnalysisResponse> {
  return fetchJSON<RouteAnalysisResponse>(`${API_BASE}/distribution/route?limit=${limit}`);
}

export async function getDirectionAnalysis(): Promise<DirectionAnalysisResponse> {
  return fetchJSON<DirectionAnalysisResponse>(`${API_BASE}/distribution/direction`);
}

export async function getRushHourComparison(): Promise<RushHourResponse> {
  return fetchJSON<RushHourResponse>(`${API_BASE}/patterns/rush-hour`);
}

export async function getHotspots(limit = 50): Promise<HotspotsResponse> {
  return fetchJSON<HotspotsResponse>(`${API_BASE}/hotspots?limit=${limit}`);
}

export async function getAnomalies(): Promise<AnomaliesResponse> {
  return fetchJSON<AnomaliesResponse>(`${API_BASE}/anomalies`);
}
