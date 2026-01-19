package main

import "strings"

var icons = map[string]string{
	"vehicle_obstruction":                  "🚗",
	"general_obstruction":                  "⚠️",
	"animal_presence_obstruction":          "🦌",
	"abnormal_traffic":                     "🚦",
	"poor_environment_conditions":          "☁️",
	"road_surface_conditions":              "❄️",
	"non_weather_related_road_conditions":  "🕳️",
	"roadworks":                            "🚧",
	"maintenance_works":                    "🚧",
	"road_or_carriageway_or_lane_management": "🚫",
	"speed_management":                     "🐢",
	"general_instruction_or_message_to_road_users": "ℹ️",
	"generic_situation_record":             "📍",
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

    // fallback in case no type matches
	return "📍"
}

type Record struct {
    Location Location `json:"location"`
}

type Location struct {
    Segment *Segment`json:"linear,omitempty"`
    Single *Single `json:"point,omitempty"`
}

type Segment struct {
    From SegmentPoint `json:"from"`
    To   SegmentPoint `json:"to"`
}

type SegmentPoint struct {
    Coordinates Coordinates `json:"coords"`
}

type Single struct {
    Coordinates Coordinates `json:"coords"`
}

type Coordinates struct {
    Lat float64 `json:"lat"`
    Lon float64 `json:"lon"`
}

func (c Coordinates) Empty() bool {
    return c.Lat == 0.0 && c.Lon == 0.0
}

type MapLocation struct {
    Type  string        `json:"type"`
    Icon string         `json:"icon"`
    Point *Coordinates  `json:"point,omitempty"`
    Path  []Coordinates `json:"path,omitempty"`
}

func (r Record) ToMapLocation(rs *RouteService, recordType string) *MapLocation {
    icon := GetEmoji(recordType)

    if r.Location.Segment != nil {
        from := r.Location.Segment.From.Coordinates
        to := r.Location.Segment.To.Coordinates
        if from.Empty() || to.Empty() {
            return nil
        }
        path := rs.GetRoute(from, to)
        return &MapLocation{
            Type:  "segment",
            Icon: icon,
            Path:  path,
        }
    }
    if r.Location.Single != nil {
        point := r.Location.Single.Coordinates
        if point.Empty() {
            return nil
        }
        return &MapLocation{
            Type:  "point",
            Icon: icon,
            Point: &point,
        }
    }
    return nil
}
