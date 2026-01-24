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
  road_number: string;
  road_name: string;
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
