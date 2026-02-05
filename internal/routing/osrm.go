package routing

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/sverdejot/beacon/pkg/datex"
)

const (
	getRouteTemplatePath = "%s/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson"
)

// RouteResult contains the computed route path and distance
type RouteResult struct {
	Path     []datex.Coordinates
	Distance float64 // distance in meters
	Duration float64 // duration in seconds
}

type RouteService struct {
	url    string
	client *http.Client
}

type osrmResponse struct {
	Routes []struct {
		Geometry struct {
			Coordinates [][]float64 `json:"coordinates"`
		} `json:"geometry"`
		Distance float64 `json:"distance"` // distance in meters
		Duration float64 `json:"duration"` // duration in seconds
	} `json:"routes"`
}

func NewRouteService(url string) *RouteService {
	return &RouteService{
		url:    url,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// GetRoute returns just the path coordinates (for backward compatibility)
func (rs *RouteService) GetRoute(from, to datex.Coordinates) []datex.Coordinates {
	result := rs.GetRouteWithDistance(from, to)
	return result.Path
}

// GetRouteWithDistance returns the full route result including distance
func (rs *RouteService) GetRouteWithDistance(from, to datex.Coordinates) RouteResult {
	timer := prometheus.NewTimer(OSRMRequestDuration)
	defer timer.ObserveDuration()

	url := fmt.Sprintf(getRouteTemplatePath,
		rs.url, from.Lon, from.Lat, to.Lon, to.Lat)

	fallback := RouteResult{
		Path:     []datex.Coordinates{from, to},
		Distance: 0,
		Duration: 0,
	}

	resp, err := rs.client.Get(url)
	if err != nil {
		slog.Error("osrm route computation failed", slog.String("error", err.Error()))
		OSRMRequests.WithLabelValues("error").Inc()
		return fallback
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode != http.StatusOK {
		slog.Error("osrm route computation failed", slog.Int("status_code", resp.StatusCode))
		OSRMRequests.WithLabelValues("error").Inc()
		return fallback
	}

	var osrm osrmResponse
	if err := json.NewDecoder(resp.Body).Decode(&osrm); err != nil {
		slog.Error("osrm route computation failed", slog.String("error", err.Error()))
		OSRMRequests.WithLabelValues("error").Inc()
		return fallback
	}

	if len(osrm.Routes) == 0 {
		slog.Error("osrm route computation failed", slog.String("reason", "no_routes_returned"))
		OSRMRequests.WithLabelValues("fallback").Inc()
		return fallback
	}

	route := osrm.Routes[0]
	coords := make([]datex.Coordinates, len(route.Geometry.Coordinates))
	for i, c := range route.Geometry.Coordinates {
		coords[i] = datex.Coordinates{Lat: c[1], Lon: c[0]}
	}

	OSRMRequests.WithLabelValues("success").Inc()
	OSRMRouteDistance.Observe(route.Distance)

	return RouteResult{
		Path:     coords,
		Distance: route.Distance,
		Duration: route.Duration,
	}
}
