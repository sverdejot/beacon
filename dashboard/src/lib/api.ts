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

export interface QueryParams {
  timeRange?: string;
  province?: string;
  severity?: string;
  cause?: string;
  road?: string;
}

function buildQuery(params?: QueryParams, extra?: Record<string, string | number>): string {
  const searchParams = new URLSearchParams();

  if (params?.timeRange && params.timeRange !== '7d') {
    searchParams.set('range', params.timeRange);
  }
  if (params?.province) {
    searchParams.set('province', params.province);
  }
  if (params?.severity) {
    searchParams.set('severity', params.severity);
  }
  if (params?.cause) {
    searchParams.set('cause', params.cause);
  }
  if (params?.road) {
    searchParams.set('road', params.road);
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function getSummary(params?: QueryParams): Promise<Summary> {
  return fetchJSON<Summary>(`${API_BASE}/summary${buildQuery(params)}`);
}

export async function getHourlyTrend(params?: QueryParams): Promise<HourlyTrendResponse> {
  return fetchJSON<HourlyTrendResponse>(`${API_BASE}/trends/hourly${buildQuery(params)}`);
}

export async function getDailyTrend(params?: QueryParams): Promise<DailyTrendResponse> {
  return fetchJSON<DailyTrendResponse>(`${API_BASE}/trends/daily${buildQuery(params)}`);
}

export async function getSeverityDistribution(params?: QueryParams): Promise<DistributionResponse> {
  return fetchJSON<DistributionResponse>(`${API_BASE}/distribution/severity${buildQuery(params)}`);
}

export async function getCauseTypeDistribution(params?: QueryParams): Promise<DistributionResponse> {
  return fetchJSON<DistributionResponse>(`${API_BASE}/distribution/cause-type${buildQuery(params)}`);
}

export async function getProvinceDistribution(params?: QueryParams): Promise<DistributionResponse> {
  return fetchJSON<DistributionResponse>(`${API_BASE}/distribution/province${buildQuery(params)}`);
}

export async function getTopRoads(limit = 10, params?: QueryParams): Promise<TopRoadsResponse> {
  return fetchJSON<TopRoadsResponse>(`${API_BASE}/top/roads${buildQuery(params, { limit })}`);
}

export async function getTopSubtypes(limit = 20, params?: QueryParams): Promise<TopSubtypesResponse> {
  return fetchJSON<TopSubtypesResponse>(`${API_BASE}/top/subtypes${buildQuery(params, { limit })}`);
}

export async function getHeatmapData(params?: QueryParams): Promise<HeatmapResponse> {
  return fetchJSON<HeatmapResponse>(`${API_BASE}/heatmap${buildQuery(params)}`);
}

export async function getActiveIncidents(params?: QueryParams): Promise<ActiveIncidentsResponse> {
  return fetchJSON<ActiveIncidentsResponse>(`${API_BASE}/incidents/active${buildQuery(params)}`);
}

export async function getImpactSummary(params?: QueryParams): Promise<ImpactSummaryResponse> {
  return fetchJSON<ImpactSummaryResponse>(`${API_BASE}/impact/summary${buildQuery(params)}`);
}

export async function getDurationDistribution(params?: QueryParams): Promise<DurationDistributionResponse> {
  return fetchJSON<DurationDistributionResponse>(`${API_BASE}/duration/distribution${buildQuery(params)}`);
}

export async function getRouteAnalysis(limit = 20, params?: QueryParams): Promise<RouteAnalysisResponse> {
  return fetchJSON<RouteAnalysisResponse>(`${API_BASE}/distribution/route${buildQuery(params, { limit })}`);
}

export async function getDirectionAnalysis(params?: QueryParams): Promise<DirectionAnalysisResponse> {
  return fetchJSON<DirectionAnalysisResponse>(`${API_BASE}/distribution/direction${buildQuery(params)}`);
}

export async function getRushHourComparison(params?: QueryParams): Promise<RushHourResponse> {
  return fetchJSON<RushHourResponse>(`${API_BASE}/patterns/rush-hour${buildQuery(params)}`);
}

export async function getHotspots(limit = 50, params?: QueryParams): Promise<HotspotsResponse> {
  return fetchJSON<HotspotsResponse>(`${API_BASE}/hotspots${buildQuery(params, { limit })}`);
}

export async function getAnomalies(params?: QueryParams): Promise<AnomaliesResponse> {
  return fetchJSON<AnomaliesResponse>(`${API_BASE}/anomalies${buildQuery(params)}`);
}
