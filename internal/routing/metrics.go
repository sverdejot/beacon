package routing

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const metricsPrefix = "ingester"

var (
	OSRMRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_osrm_requests_total",
		Help: "Total number of OSRM routing requests",
	}, []string{"status"}) // status: success, error, fallback

	OSRMRequestDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_osrm_request_duration_seconds",
		Help:    "Time spent on OSRM routing requests",
		Buckets: prometheus.DefBuckets,
	})

	OSRMRouteDistance = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_osrm_route_distance_meters",
		Help:    "Distance of computed routes in meters",
		Buckets: []float64{100, 500, 1000, 5000, 10000, 50000, 100000},
	})
)
