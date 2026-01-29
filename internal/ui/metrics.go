package ui

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const metricsPrefix = "api"

var (
	HTTPRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_http_requests_total",
		Help: "Total number of HTTP requests",
	}, []string{"method", "endpoint", "status"})

	HTTPRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_http_request_duration_seconds",
		Help:    "HTTP request duration in seconds",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "endpoint"})

	SSEConnectionsActive = promauto.NewGauge(prometheus.GaugeOpts{
		Name: metricsPrefix + "_sse_connections_active",
		Help: "Number of active SSE connections",
	})

	SSEConnectionsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_sse_connections_total",
		Help: "Total number of SSE connections established",
	})

	SSEEventsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_sse_events_total",
		Help: "Total number of SSE events sent",
	}, []string{"type"}) // type: update, delete, summary

	ClickHouseQueryDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_clickhouse_query_duration_seconds",
		Help:    "ClickHouse query duration in seconds",
		Buckets: prometheus.DefBuckets,
	}, []string{"query"})

	ClickHouseQueryErrors = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_clickhouse_query_errors_total",
		Help: "Total number of ClickHouse query errors",
	}, []string{"query"})

	MapIncidentsRequests = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_map_incidents_requests_total",
		Help: "Total number of map incidents requests",
	})

	MapIncidentsCount = promauto.NewGauge(prometheus.GaugeOpts{
		Name: metricsPrefix + "_map_incidents_count",
		Help: "Number of incidents returned in last map request",
	})

	MQTTStreamMessagesTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_mqtt_stream_messages_total",
		Help: "Total number of MQTT messages processed for streaming",
	}, []string{"type"}) // type: update, deletion
)
