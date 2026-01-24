import type {
  Summary,
  HourlyTrendResponse,
  DailyTrendResponse,
  DistributionResponse,
  TopRoadsResponse,
  TopSubtypesResponse,
  HeatmapResponse,
  ActiveIncidentsResponse,
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
