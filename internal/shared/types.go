package shared

import (
	"strings"

	"github.com/sverdejot/beacon/internal/routing"
	"github.com/sverdejot/beacon/pkg/datex"
)

var icons = map[string]string{
	"vehicle_obstruction":                          "🚙",
	"general_obstruction":                          "⚠️",
	"animal_presence_obstruction":                  "🦌",
	"abnormal_traffic":                             "🚦",
	"poor_environment_conditions":                  "☁️",
	"road_surface_conditions":                      "❄️",
	"non_weather_related_road_conditions":          "🕳️",
	"roadworks":                                    "🚧",
	"maintenance_works":                            "🚧",
	"road_or_carriageway_or_lane_management":       "🚫",
	"speed_management":                             "🐢",
	"general_instruction_or_message_to_road_users": "ℹ️",
	"generic_situation_record":                     "📍",
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
	ID        string              `json:"id"`
	Type      string              `json:"type"`
	Icon      string              `json:"icon"`
	Severity  string              `json:"severity,omitempty"`
	EventType string              `json:"eventType,omitempty"`
	Point     *datex.Coordinates  `json:"point,omitempty"`
	Path      []datex.Coordinates `json:"path,omitempty"`
	Distance  float64             `json:"distance,omitempty"` // distance in meters (for segments)
	Duration  float64             `json:"duration,omitempty"` // duration in seconds (for segments)
}

// RouteProvider is an interface for services that compute routes between coordinates
type RouteProvider interface {
	GetRoute(from, to datex.Coordinates) []datex.Coordinates
	GetRouteWithDistance(from, to datex.Coordinates) routing.RouteResult
}

func RecordToMapLocation(r *datex.Record, rs RouteProvider, recordType string) *MapLocation {
	icon := GetEmoji(recordType)
	severity := strings.ToLower(r.Severity)
	if severity == "" {
		severity = "unknown"
	}

	if r.Location.Linear != nil {
		from := r.Location.Linear.From.Coordinates
		to := r.Location.Linear.To.Coordinates
		if from.Empty() || to.Empty() {
			return nil
		}
		routeResult := rs.GetRouteWithDistance(from, to)
		return &MapLocation{
			ID:        r.ID,
			Type:      "segment",
			Icon:      icon,
			Severity:  severity,
			EventType: recordType,
			Path:      routeResult.Path,
			Distance:  routeResult.Distance,
			Duration:  routeResult.Duration,
		}
	}
	if r.Location.Point != nil {
		point := r.Location.Point.Coordinates
		if point.Empty() {
			return nil
		}
		return &MapLocation{
			ID:        r.ID,
			Type:      "point",
			Icon:      icon,
			Severity:  severity,
			EventType: recordType,
			Point:     &point,
		}
	}
	return nil
}
