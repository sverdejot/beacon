package api

import (
	"time"
)

type Summary struct {
	ActiveIncidents int32  `json:"active_incidents"`
	SevereIncidents int32  `json:"severe_incidents"`
	TodaysTotal     int32  `json:"todays_total"`
	PeakHour        int32  `json:"peak_hour"`        // 0-23, hour with most incidents today
	PeakHourCount   int32  `json:"peak_hour_count"`  // incident count during peak hour
}

type ImpactSummary struct {
	TotalAffectedKm    float64 `json:"total_affected_km"`
	AvgAffectedKm      float64 `json:"avg_affected_km"`
	IncidentsWithKm    int32   `json:"incidents_with_km"`
	TopProvince        string  `json:"top_province"`
	TopProvinceCount   int32   `json:"top_province_count"`
	TopRoad            string  `json:"top_road"`
	TopRoadCount       int32   `json:"top_road_count"`
	WeatherImpactPct   float64 `json:"weather_impact_pct"`
	WeatherIncidents   int32   `json:"weather_incidents"`
	TotalIncidents     int32   `json:"total_incidents"`
}

type ImpactSummaryResponse struct {
	Data *ImpactSummary `json:"data"`
}

type DurationBucket struct {
	Bucket    string  `json:"bucket"`     // e.g., "0-15", "15-30", etc.
	Count     int32   `json:"count"`
	AvgMins   float64 `json:"avg_mins"`
}

type DurationDistributionResponse struct {
	Data []DurationBucket `json:"data"`
}

type RouteIncidentStats struct {
	RoadNumber   string  `json:"road_number"`
	RoadName     string  `json:"road_name"`
	IncidentCount int32  `json:"incident_count"`
	AvgSeverity  float64 `json:"avg_severity"`
	TotalLengthKm float64 `json:"total_length_km"`
	CommonCauses []string `json:"common_causes"`
}

type RouteAnalysisResponse struct {
	Data []RouteIncidentStats `json:"data"`
}

type DirectionStats struct {
	Direction     string `json:"direction"`
	IncidentCount int32  `json:"incident_count"`
	Percentage    float64 `json:"percentage"`
}

type DirectionAnalysisResponse struct {
	Data []DirectionStats `json:"data"`
}

type RushHourStats struct {
	Period        string  `json:"period"`      // "morning_rush", "evening_rush", "off_peak"
	IncidentCount int32   `json:"incident_count"`
	AvgSeverity   float64 `json:"avg_severity"`
	AvgDuration   float64 `json:"avg_duration_mins"`
}

type RushHourResponse struct {
	Data []RushHourStats `json:"data"`
}

type Hotspot struct {
	Lat           float64 `json:"lat"`
	Lon           float64 `json:"lon"`
	IncidentCount int32   `json:"incident_count"`
	Recurrence    int32   `json:"recurrence"`      // number of distinct days with incidents
	TopCause      string  `json:"top_cause"`
	AvgSeverity   float64 `json:"avg_severity"`
}

type HotspotsResponse struct {
	Data []Hotspot `json:"data"`
}

type Anomaly struct {
	Dimension   string  `json:"dimension"`    // "province", "cause_type", "hour"
	Value       string  `json:"value"`        // e.g., "madrid", "accident"
	CurrentCount int32  `json:"current_count"`
	BaselineCount float64 `json:"baseline_count"`
	Deviation   float64 `json:"deviation"`    // percentage deviation from baseline
	Severity    string  `json:"severity"`     // "low", "medium", "high"
}

type AnomaliesResponse struct {
	Data []Anomaly `json:"data"`
}

type HourlyDataPoint struct {
	Hour  time.Time `json:"hour"`
	Count int32     `json:"count"`
}

type DailyDataPoint struct {
	Date        time.Time `json:"date"`
	Count       int32     `json:"count"`
	SevereCount int32     `json:"severe_count"`
}

type DistributionItem struct {
	Label string `json:"label"`
	Count int32  `json:"count"`
}

type TopRoad struct {
	Road  string `json:"road"`
	Count int32  `json:"count"`
}

type TopSubtype struct {
	Subtype    string  `json:"subtype"`
	Count      int32   `json:"count"`
	Percentage float64 `json:"percentage"`
}

type HeatmapPoint struct {
	Lat    float64 `json:"lat"`
	Lon    float64 `json:"lon"`
	Weight int32   `json:"weight"`
}

type ActiveIncident struct {
	ID           string    `json:"id"`
	Timestamp    time.Time `json:"timestamp"`
	Province     string    `json:"province"`
	RoadNumber   string    `json:"road_number"`
	RoadName     string    `json:"road_name"`
	Severity     string    `json:"severity"`
	CauseType    string    `json:"cause_type"`
	DurationMins float64   `json:"duration_mins"`
	Lat          float64   `json:"lat"`
	Lon          float64   `json:"lon"`
}

type HourlyTrendResponse struct {
	Data []HourlyDataPoint `json:"data"`
}

type DailyTrendResponse struct {
	Data []DailyDataPoint `json:"data"`
}

type DistributionResponse struct {
	Data []DistributionItem `json:"data"`
}

type TopRoadsResponse struct {
	Data []TopRoad `json:"data"`
}

type TopSubtypesResponse struct {
	Data []TopSubtype `json:"data"`
}

type HeatmapResponse struct {
	Data []HeatmapPoint `json:"data"`
}

type ActiveIncidentsResponse struct {
	Data []ActiveIncident `json:"data"`
}

type MapIncident struct {
	ID         string  `json:"id"`
	Icon       string  `json:"icon"`
	Lat        float64 `json:"lat"`
	Lon        float64 `json:"lon"`
	RecordType string  `json:"record_type"`
	Severity   string  `json:"severity,omitempty"`
	RoadName   string  `json:"road_name,omitempty"`
	RoadNumber string  `json:"road_number,omitempty"`
}

type MapIncidentsResponse struct {
	Data []MapIncident `json:"data"`
}
