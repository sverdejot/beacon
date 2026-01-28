// Package datex provides DATEX II traffic incident data types and MQTT topic
// parsing utilities for the Beacon traffic monitoring system.
//
// DATEX II is a European standard for exchanging traffic and travel information.
// This package defines the Go structures that map to the JSON representation
// of DATEX II records as published by the Feed service.
//
// The package also provides utilities for parsing MQTT topic strings that follow
// the format: beacon/v1/{country}/{region}/{category}/{event_type}
package datex

import (
	"strings"
	"time"
)

// Record represents a DATEX II traffic incident record.
// It contains all relevant information about a traffic event including
// identification, severity, location, timing, cause, and impact data.
type Record struct {
	ID          string    `json:"id"`
	Version     string    `json:"version"`
	Name        string    `json:"name,omitempty"`
	Probability string    `json:"probability,omitempty"`
	Severity    string    `json:"severity,omitempty"`
	Location    Location  `json:"location"`
	Validity    *Validity `json:"validity,omitempty"`
	Cause       *Cause    `json:"cause,omitempty"`
	Mobility    string    `json:"mobility,omitempty"`
	Impact      *Impact   `json:"impact,omitempty"`
}

// Location contains geographic information about where an incident occurred.
// It supports two location types: Linear (for incidents spanning a road segment)
// and Point (for incidents at a specific location). Only one should be populated.
type Location struct {
	// Linear contains the start and end points for incidents along a route segment.
	Linear *LinearLocation `json:"linear,omitempty"`
	// Point contains coordinates for incidents at a fixed location.
	Point *PointLocation `json:"point,omitempty"`
	// Length is the affected distance in meters (typically for linear locations).
	Length *float64 `json:"length,omitempty"`
	// Roads lists the affected road names and identifiers.
	Roads []RoadInfo `json:"roads,omitempty"`
}

// LinearLocation represents an incident spanning between two geographic points.
// This is used for incidents that affect a section of road rather than a single point,
// such as traffic jams, roadworks zones, or lane closures.
type LinearLocation struct {
	// Direction indicates the affected traffic direction or lane.
	Direction string `json:"direction,omitempty"`
	// From is the starting point of the affected segment.
	From LocationPoint `json:"from"`
	// To is the ending point of the affected segment.
	To LocationPoint `json:"to"`
}

// PointLocation represents an incident at a single geographic point.
// This is used for localized incidents such as accidents or obstructions
// that occur at a specific location rather than along a road segment.
type PointLocation struct {
	// Coordinates contains the latitude and longitude of the incident.
	Coordinates Coordinates `json:"coords"`
	// Direction indicates the affected traffic direction.
	Direction string `json:"direction,omitempty"`
	// State is the Spanish autonomous community where the incident occurred.
	State string `json:"state,omitempty"`
	// Province is the province where the incident occurred.
	Province string `json:"province,omitempty"`
	// Municipality is the municipality where the incident occurred.
	Municipality string `json:"municipality,omitempty"`
}

// LocationPoint represents a geographic point with associated administrative metadata.
// It is used within LinearLocation to define the start and end points of a route segment.
type LocationPoint struct {
	// Coordinates contains the latitude and longitude.
	Coordinates Coordinates `json:"coords"`
	// State is the Spanish autonomous community.
	State string `json:"state,omitempty"`
	// Province is the province name.
	Province string `json:"province,omitempty"`
	// Municipality is the municipality name.
	Municipality string `json:"municipality,omitempty"`
	// Km is the kilometer marker on the road, if available.
	Km *float64 `json:"km,omitempty"`
}

// Coordinates represents a geographic point as a latitude/longitude pair.
// This is the canonical coordinate type used throughout the Beacon system
// for OSRM routing, cache storage, and API responses.
type Coordinates struct {
	// Lat is the latitude in decimal degrees.
	Lat float64 `json:"lat"`
	// Lon is the longitude in decimal degrees.
	Lon float64 `json:"lon"`
}

// Empty returns true if both latitude and longitude are zero,
// indicating that no valid coordinates have been set.
func (c Coordinates) Empty() bool {
	return c.Lat == 0.0 && c.Lon == 0.0
}

// Validity defines the time window during which an incident is active.
// It is used to calculate cache TTL and filter active vs historical incidents.
type Validity struct {
	// StartTime is when the incident started or was first reported.
	StartTime *time.Time `json:"startTime,omitempty"`
	// EndTime is when the incident ended or is expected to end.
	EndTime *time.Time `json:"endTime,omitempty"`
}

// Cause describes the root cause of a traffic incident.
// It provides both a primary classification and optional subtypes for detailed categorization.
type Cause struct {
	// Type is the primary cause category (e.g., "accident", "roadworks", "poor_environment_conditions").
	Type string `json:"type,omitempty"`
	// Subtypes provides more specific cause classifications within the primary type.
	Subtypes []string `json:"subtypes,omitempty"`
}

// Impact describes the consequences of an incident on traffic flow.
type Impact struct {
	// Delays contains delay measurements if available.
	Delays *Delays `json:"delays,omitempty"`
}

// Delays contains delay measurements for an incident.
type Delays struct {
	// Delay is the estimated delay in seconds caused by the incident.
	Delay *float64 `json:"delay,omitempty"`
}

// RoadInfo contains metadata about a road affected by an incident.
type RoadInfo struct {
	// Name is the road name (e.g., "Autovía del Norte").
	Name string `json:"name,omitempty"`
	// Number is the road identifier (e.g., "A-1", "M-30").
	Number string `json:"number,omitempty"`
	// Destination indicates the direction or destination of the affected lane.
	Destination string `json:"destination,omitempty"`
}

// MQTT Topic Format: beacon/v1/{country}/{region}/{category}/{event_type}
//
// Example: beacon/v1/es/madrid/situations/accident

// ExtractCountry returns the country code from an MQTT topic.
// For topic "beacon/v1/es/madrid/situations/accident", returns "es".
// Returns empty string if the topic does not have enough segments.
func ExtractCountry(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 3 {
		return parts[2]
	}
	return ""
}

// ExtractRegion returns the region/province from an MQTT topic.
// For topic "beacon/v1/es/madrid/situations/accident", returns "madrid".
// Returns empty string if the topic does not have enough segments.
func ExtractRegion(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 4 {
		return parts[3]
	}
	return ""
}

// ExtractCategory returns the message category from an MQTT topic.
// For topic "beacon/v1/es/madrid/situations/accident", returns "situations".
// Common categories are "situations" for new/updated incidents and "deletions" for removed incidents.
// Returns empty string if the topic does not have enough segments.
func ExtractCategory(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 5 {
		return parts[4]
	}
	return ""
}

// ExtractEventType returns the event type from an MQTT topic.
// For topic "beacon/v1/es/madrid/situations/accident", returns "accident".
// Common event types include "accident", "roadworks", "poor_environment_conditions".
// Returns empty string if the topic does not have enough segments.
func ExtractEventType(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 6 {
		return parts[5]
	}
	return ""
}

// DeletionEvent signals that a traffic incident has been resolved or removed.
// It is published to deletion topics when an incident is no longer active.
type DeletionEvent struct {
	// ID is the unique identifier of the deleted incident.
	ID string `json:"id"`
	// DeletedAt is the timestamp when the incident was removed.
	DeletedAt time.Time `json:"deletedAt"`
}

// IsDeletionTopic returns true if the MQTT topic is for deletion events.
// Deletion topics have "deletions" as the category segment.
func IsDeletionTopic(topic string) bool {
	return ExtractCategory(topic) == "deletions"
}
