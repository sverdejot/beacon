package ui

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/sverdejot/beacon/pkg/datex"
)

const (
	getRouteTemplatePath = "%s/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson"
)

type RouteService struct {
	url    string
	client *http.Client
}

type osrmResponse struct {
	Routes []struct {
		Geometry struct {
			Coordinates [][]float64 `json:"coordinates"`
		} `json:"geometry"`
	} `json:"routes"`
}

func NewRouteService(url string) *RouteService {
	return &RouteService{
		url:    url,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (rs *RouteService) GetRoute(from, to datex.Coordinates) []datex.Coordinates {
	url := fmt.Sprintf(getRouteTemplatePath,
		rs.url, from.Lon, from.Lat, to.Lon, to.Lat)

	resp, err := rs.client.Get(url)
	if err != nil {
		return []datex.Coordinates{from, to}
	}
	defer resp.Body.Close()

	var osrm osrmResponse
	if err := json.NewDecoder(resp.Body).Decode(&osrm); err != nil {
		return []datex.Coordinates{from, to}
	}

	if len(osrm.Routes) == 0 {
		return []datex.Coordinates{from, to}
	}

	coords := make([]datex.Coordinates, len(osrm.Routes[0].Geometry.Coordinates))
	for i, c := range osrm.Routes[0].Geometry.Coordinates {
		coords[i] = datex.Coordinates{Lat: c[1], Lon: c[0]}
	}
	return coords
}
