export interface Summary {
  active_incidents: number;
  severe_incidents: number;
  todays_total: number;
  avg_duration_mins: number;
}

export interface HourlyDataPoint {
  hour: string;
  count: number;
}

export interface DailyDataPoint {
  date: string;
  count: number;
  severe_count: number;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface TopRoad {
  road: string;
  count: number;
}

export interface TopSubtype {
  subtype: string;
  count: number;
  percentage: number;
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  weight: number;
}

export interface ActiveIncident {
  id: string;
  timestamp: string;
  province: string;
  road_number: string;
  road_name: string;
  severity: string;
  cause_type: string;
  duration_mins: number;
  lat: number;
  lon: number;
}

export interface HourlyTrendResponse {
  data: HourlyDataPoint[];
}

export interface DailyTrendResponse {
  data: DailyDataPoint[];
}

export interface DistributionResponse {
  data: DistributionItem[];
}

export interface TopRoadsResponse {
  data: TopRoad[];
}

export interface TopSubtypesResponse {
  data: TopSubtype[];
}

export interface HeatmapResponse {
  data: HeatmapPoint[];
}

export interface ActiveIncidentsResponse {
  data: ActiveIncident[];
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface MapLocation {
  type: 'point' | 'segment';
  icon: string;
  point?: Coordinates;
  path?: Coordinates[];
}

export interface ImpactSummary {
  total_affected_km: number;
  avg_affected_km: number;
  incidents_with_km: number;
  top_province: string;
  top_province_count: number;
  top_road: string;
  top_road_count: number;
  weather_impact_pct: number;
  weather_incidents: number;
  total_incidents: number;
}

export interface ImpactSummaryResponse {
  data: ImpactSummary;
}

export interface DurationBucket {
  bucket: string;
  count: number;
  avg_mins: number;
}

export interface DurationDistributionResponse {
  data: DurationBucket[];
}

export interface RouteIncidentStats {
  road_number: string;
  road_name: string;
  incident_count: number;
  avg_severity: number;
  total_length_km: number;
  common_causes: string[];
}

export interface RouteAnalysisResponse {
  data: RouteIncidentStats[];
}

export interface DirectionStats {
  direction: string;
  incident_count: number;
  percentage: number;
}

export interface DirectionAnalysisResponse {
  data: DirectionStats[];
}

export interface RushHourStats {
  period: string;
  incident_count: number;
  avg_severity: number;
  avg_duration_mins: number;
}

export interface RushHourResponse {
  data: RushHourStats[];
}

export interface Hotspot {
  lat: number;
  lon: number;
  incident_count: number;
  recurrence: number;
  top_cause: string;
  avg_severity: number;
}

export interface HotspotsResponse {
  data: Hotspot[];
}

export interface Anomaly {
  dimension: string;
  value: string;
  current_count: number;
  baseline_count: number;
  deviation: number;
  severity: string;
}

export interface AnomaliesResponse {
  data: Anomaly[];
}
