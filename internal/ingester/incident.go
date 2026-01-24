package ingester

import (
	"strconv"
	"time"

	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/pkg/datex"
)

type Incident struct {
	ID                  string
	Version             int32
	Timestamp           time.Time
	EndTimestamp        *time.Time
	Province            string
	RecordType          string
	Severity            string
	Probability         string
	Lat                 float64
	Lon                 float64
	Km                  *float32
	CauseType           string
	CauseSubtypes       []string
	RoadName            string
	RoadNumber          string
	RawJSON             string
	LocationType        string
	Name                string
	Direction           string
	LengthMeters        float32
	ToLat               float64
	ToLon               float64
	ToKm                *float32
	Municipality        string
	AutonomousCommunity string
	DelayMinutes        float32
	Mobility            string
	RoadDestination     string
}

func RecordToIncident(r *datex.Record, topic string, rawJSON string) *Incident {
	province := datex.ExtractRegion(topic)
	recordType := datex.ExtractEventType(topic)

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
		Name:        r.Name,
		Mobility:    r.Mobility,
	}

	if r.Validity != nil {
		if r.Validity.StartTime != nil {
			inc.Timestamp = *r.Validity.StartTime
		}
		inc.EndTimestamp = r.Validity.EndTime
	}

	if r.Location.Length != nil {
		inc.LengthMeters = float32(*r.Location.Length)
	}

	if r.Location.Linear != nil {
		inc.Lat = r.Location.Linear.From.Coordinates.Lat
		inc.Lon = r.Location.Linear.From.Coordinates.Lon
		inc.Direction = r.Location.Linear.Direction
		inc.ToLat = r.Location.Linear.To.Coordinates.Lat
		inc.ToLon = r.Location.Linear.To.Coordinates.Lon

		if r.Location.Linear.From.Province != "" {
			inc.Province = r.Location.Linear.From.Province
		} else if r.Location.Linear.From.State != "" {
			inc.Province = r.Location.Linear.From.State
		}
		if r.Location.Linear.From.Km != nil {
			km := float32(*r.Location.Linear.From.Km)
			inc.Km = &km
		}
		if r.Location.Linear.To.Km != nil {
			toKm := float32(*r.Location.Linear.To.Km)
			inc.ToKm = &toKm
		}

		if r.Location.Linear.From.Municipality != "" {
			inc.Municipality = r.Location.Linear.From.Municipality
		}
		if r.Location.Linear.From.State != "" {
			inc.AutonomousCommunity = r.Location.Linear.From.State
		}
	} else if r.Location.Point != nil {
		inc.Lat = r.Location.Point.Coordinates.Lat
		inc.Lon = r.Location.Point.Coordinates.Lon
		inc.Direction = r.Location.Point.Direction

		if r.Location.Point.Province != "" {
			inc.Province = r.Location.Point.Province
		} else if r.Location.Point.State != "" {
			inc.Province = r.Location.Point.State
		}

		if r.Location.Point.Municipality != "" {
			inc.Municipality = r.Location.Point.Municipality
		}
		if r.Location.Point.State != "" {
			inc.AutonomousCommunity = r.Location.Point.State
		}
	}

	if r.Cause != nil {
		inc.CauseType = r.Cause.Type
		inc.CauseSubtypes = r.Cause.Subtypes
	}

	if r.Impact != nil && r.Impact.Delays != nil && r.Impact.Delays.Delay != nil {
		inc.DelayMinutes = float32(*r.Impact.Delays.Delay / 60.0)
	}

	if len(r.Location.Roads) > 0 {
		inc.RoadName = r.Location.Roads[0].Name
		inc.RoadNumber = r.Location.Roads[0].Number
		inc.RoadDestination = r.Location.Roads[0].Destination
	}

	return inc
}

func RecordToIncidentWithRoute(r *datex.Record, topic string, rawJSON string, loc *shared.MapLocation) *Incident {
	inc := RecordToIncident(r, topic, rawJSON)

	if loc != nil {
		inc.LocationType = loc.Type
		if loc.Distance > 0 {
			inc.LengthMeters = float32(loc.Distance)
		}
	}

	return inc
}
