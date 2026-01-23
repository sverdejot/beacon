package main

import (
	"strings"
	"time"
)

// Record represents the JSON payload from MQTT
type Record struct {
	ID          string    `json:"id"`
	Version     int       `json:"version"`
	Name        string    `json:"name,omitempty"`
	Probability string    `json:"probability,omitempty"`
	Severity    string    `json:"severity,omitempty"`
	Location    Location  `json:"location"`
	Validity    *Validity `json:"validity,omitempty"`
	Cause       *Cause    `json:"cause,omitempty"`
}

type Location struct {
	Linear *LinearLocation `json:"linear,omitempty"`
	Point  *PointLocation  `json:"point,omitempty"`
	Length *float64        `json:"length,omitempty"`
	Roads  []RoadInfo      `json:"roads,omitempty"`
}

type LinearLocation struct {
	Direction string       `json:"direction,omitempty"`
	From      LocationPoint `json:"from"`
	To        LocationPoint `json:"to"`
}

type PointLocation struct {
	Coordinates Coordinates `json:"coords"`
	Direction   string      `json:"direction,omitempty"`
	State       string      `json:"state,omitempty"`
}

type LocationPoint struct {
	Coordinates Coordinates `json:"coords"`
	State       string      `json:"state,omitempty"`
	Km          *float64    `json:"km,omitempty"`
}

type Coordinates struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type Validity struct {
	StartTime *time.Time `json:"startTime,omitempty"`
	EndTime   *time.Time `json:"endTime,omitempty"`
}

type Cause struct {
	Type     string   `json:"type,omitempty"`
	Subtypes []string `json:"subtypes,omitempty"`
}

type RoadInfo struct {
	Name        string `json:"name,omitempty"`
	Number      string `json:"number,omitempty"`
	Destination string `json:"destination,omitempty"`
}

// Incident is the flattened structure for ClickHouse insertion
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
}

// ToIncident converts a Record to an Incident for ClickHouse
func (r *Record) ToIncident(topic string, rawJSON string) *Incident {
	province := extractProvince(topic)
	recordType := extractRecordType(topic)

	inc := &Incident{
		ID:         r.ID,
		Version:    int32(r.Version),
		Timestamp:  time.Now(),
		Province:   province,
		RecordType: recordType,
		Severity:   r.Severity,
		Probability: r.Probability,
		RawJSON:    rawJSON,
	}

	// Extract timestamps from validity
	if r.Validity != nil {
		if r.Validity.StartTime != nil {
			inc.Timestamp = *r.Validity.StartTime
		}
		inc.EndTimestamp = r.Validity.EndTime
	}

	// Extract coordinates
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

	// Extract cause
	if r.Cause != nil {
		inc.CauseType = r.Cause.Type
		inc.CauseSubtypes = r.Cause.Subtypes
	}

	// Extract road info
	if len(r.Location.Roads) > 0 {
		inc.RoadName = r.Location.Roads[0].Name
		inc.RoadNumber = r.Location.Roads[0].Number
	}

	return inc
}

// datex/situations/{province}/{record_type}
func extractProvince(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 3 {
		return parts[2]
	}
	return ""
}

// datex/situations/{province}/{record_type} || datex/situations/{province}/causes/{cause_type}
func extractRecordType(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return ""
	}
	return strings.Join(parts[3:], "/")
}
