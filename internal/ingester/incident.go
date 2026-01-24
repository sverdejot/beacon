package ingester

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/pkg/datex"
)

// flattened structure for clickhouse insertion
type Incident struct {
	ID            string
	Version       int32
	Timestamp     time.Time
	EndTimestamp  *time.Time
	Province      string
	RecordType    string
	Severity      string
	Probability   string
	Lat           float64
	Lon           float64
	Km            *float32
	CauseType     string
	CauseSubtypes []string
	RoadName      string
	RoadNumber    string
	RawJSON       string
	Polyline      string
	LocationType  string
}

func RecordToIncident(r *datex.Record, topic string, rawJSON string) *Incident {
	province := datex.ExtractProvince(topic)
	recordType := datex.ExtractRecordType(topic)

	version, _ := strconv.ParseInt(r.Version, 10, 32)

	inc := &Incident{
		ID:          r.ID,
		Version:     int32(version),
		Timestamp:   time.Now(),
		Province:    province,
		RecordType:  recordType,
		Severity:    r.Severity,
		Probability: r.Probability,
		RawJSON:     rawJSON,
	}

	if r.Validity != nil {
		if r.Validity.StartTime != nil {
			inc.Timestamp = *r.Validity.StartTime
		}
		inc.EndTimestamp = r.Validity.EndTime
	}

	if r.Location.Linear != nil {
		inc.Lat = r.Location.Linear.From.Coordinates.Lat
		inc.Lon = r.Location.Linear.From.Coordinates.Lon
		if r.Location.Linear.From.State != "" {
			inc.Province = r.Location.Linear.From.State
		}
		if r.Location.Linear.From.Km != nil {
			km := float32(*r.Location.Linear.From.Km)
			inc.Km = &km
		}
	} else if r.Location.Point != nil {
		inc.Lat = r.Location.Point.Coordinates.Lat
		inc.Lon = r.Location.Point.Coordinates.Lon
		if r.Location.Point.State != "" {
			inc.Province = r.Location.Point.State
		}
	}

	if r.Cause != nil {
		inc.CauseType = r.Cause.Type
		inc.CauseSubtypes = r.Cause.Subtypes
	}

	if len(r.Location.Roads) > 0 {
		inc.RoadName = r.Location.Roads[0].Name
		inc.RoadNumber = r.Location.Roads[0].Number
	}

	return inc
}

// RecordToIncidentWithRoute creates an Incident with route data from a pre-computed MapLocation
func RecordToIncidentWithRoute(r *datex.Record, topic string, rawJSON string, loc *shared.MapLocation) *Incident {
	inc := RecordToIncident(r, topic, rawJSON)

	if loc != nil {
		inc.LocationType = loc.Type
		if len(loc.Path) > 0 {
			polylineJSON, err := json.Marshal(loc.Path)
			if err == nil {
				inc.Polyline = string(polylineJSON)
			}
		}
	}

	return inc
}
