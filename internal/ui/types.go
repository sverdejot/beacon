package ui

import (
	"time"
)

type Summary struct {
	ActiveIncidents int32   `json:"active_incidents"`
	SevereIncidents int32   `json:"severe_incidents"`
	TodaysTotal     int32   `json:"todays_total"`
	AvgDurationMins float64 `json:"avg_duration_mins"`
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
