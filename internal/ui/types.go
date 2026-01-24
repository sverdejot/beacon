package ui

import (
	"strings"
	"time"

	"github.com/sverdejot/beacon/pkg/datex"
)

var icons = map[string]string{
	"vehicle_obstruction":                       "🚗",
	"general_obstruction":                       "⚠️",
	"animal_presence_obstruction":               "🦌",
	"abnormal_traffic":                          "🚦",
	"poor_environment_conditions":               "☁️",
	"road_surface_conditions":                   "❄️",
	"non_weather_related_road_conditions":       "🕳️",
	"roadworks":                                 "🚧",
	"maintenance_works":                         "🚧",
	"road_or_carriageway_or_lane_management":    "🚫",
	"speed_management":                          "🐢",
	"general_instruction_or_message_to_road_users": "ℹ️",
	"generic_situation_record":                  "📍",
}

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
	RoadNumber string `json:"road_number"`
	RoadName   string `json:"road_name"`
	Count      int32  `json:"count"`
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
	ID          string    `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	Province    string    `json:"province"`
	RoadNumber  string    `json:"road_number"`
	RoadName    string    `json:"road_name"`
	Severity    string    `json:"severity"`
	CauseType   string    `json:"cause_type"`
	DurationMins float64  `json:"duration_mins"`
	Lat         float64   `json:"lat"`
	Lon         float64   `json:"lon"`
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


func GetEmoji(recordType string) string {
	parts := strings.Split(recordType, "/")
	typeName := parts[len(parts)-1]

	if icon, ok := icons[typeName]; ok {
		return icon
	}

	if len(parts) >= 2 && parts[len(parts)-2] == "causes" {
		if icon, ok := icons[typeName]; ok {
			return icon
		}
	}

	return "📍"
}

type MapLocation struct {
	Type  string              `json:"type"`
	Icon  string              `json:"icon"`
	Point *datex.Coordinates  `json:"point,omitempty"`
	Path  []datex.Coordinates `json:"path,omitempty"`
}

func RecordToMapLocation(r *datex.Record, rs *RouteService, recordType string) *MapLocation {
	icon := GetEmoji(recordType)

	if r.Location.Linear != nil {
		from := r.Location.Linear.From.Coordinates
		to := r.Location.Linear.To.Coordinates
		if from.Empty() || to.Empty() {
			return nil
		}
		path := rs.GetRoute(from, to)
		return &MapLocation{
			Type: "segment",
			Icon: icon,
			Path: path,
		}
	}
	if r.Location.Point != nil {
		point := r.Location.Point.Coordinates
		if point.Empty() {
			return nil
		}
		return &MapLocation{
			Type:  "point",
			Icon:  icon,
			Point: &point,
		}
	}
	return nil
}
