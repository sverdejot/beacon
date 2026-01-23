package datex

import (
	"strings"
	"time"
)

type Record struct {
	ID          string    `json:"id"`
	Version     string    `json:"version"`
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
	Direction string        `json:"direction,omitempty"`
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

func (c Coordinates) Empty() bool {
	return c.Lat == 0.0 && c.Lon == 0.0
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

// extracts the province from a topic like datex/situations/{province}/{record_type}
func ExtractProvince(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 3 {
		return parts[2]
	}
	return ""
}

// extracts the record type from a topic like datex/situations/{province}/{record_type}
func ExtractRecordType(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return ""
	}
	return strings.Join(parts[3:], "/")
}
