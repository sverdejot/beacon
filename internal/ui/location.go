package ui

import (
	"strings"

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
