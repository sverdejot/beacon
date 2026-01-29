package cache

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const metricsPrefix = "ingester"

var (
	CacheOperations = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_cache_operations_total",
		Help: "Total number of cache operations",
	}, []string{"operation", "status"}) // operation: store, remove, get, get_all; status: success, error

	CacheOperationDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_cache_operation_duration_seconds",
		Help:    "Time spent on cache operations",
		Buckets: prometheus.DefBuckets,
	}, []string{"operation"})

	CacheItemsCount = promauto.NewGauge(prometheus.GaugeOpts{
		Name: metricsPrefix + "_cache_items_count",
		Help: "Current number of items in the cache",
	})

	CacheCleanupExpired = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_cache_cleanup_expired_total",
		Help: "Total number of expired items cleaned up from cache",
	})
)
