package ingester

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const metricsPrefix = "ingester"

var (
	// MQTT metrics
	MQTTMessagesReceived = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_mqtt_messages_received_total",
		Help: "Total number of MQTT messages received",
	}, []string{"type"}) // type: situation, deletion

	MQTTProcessingErrors = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_mqtt_processing_errors_total",
		Help: "Total number of MQTT message processing errors",
	})

	// ClickHouse metrics
	ClickHouseInserts = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_clickhouse_inserts_total",
		Help: "Total number of incidents inserted into ClickHouse",
	})

	ClickHouseBatchSize = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_clickhouse_batch_size",
		Help:    "Size of batches sent to ClickHouse",
		Buckets: []float64{1, 5, 10, 25, 50, 100},
	})

	ClickHouseFlushDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    metricsPrefix + "_clickhouse_flush_duration_seconds",
		Help:    "Time spent flushing batches to ClickHouse",
		Buckets: prometheus.DefBuckets,
	})

	ClickHouseErrors = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: metricsPrefix + "_clickhouse_errors_total",
		Help: "Total number of ClickHouse errors",
	}, []string{"operation"}) // operation: prepare_batch, append, send, update

	ClickHousePendingBatch = promauto.NewGauge(prometheus.GaugeOpts{
		Name: metricsPrefix + "_clickhouse_pending_batch_size",
		Help: "Current number of incidents pending in batch",
	})

	// Deletion metrics
	DeletionsProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_deletions_processed_total",
		Help: "Total number of deletion events processed",
	})

	// Worker pool metrics
	WorkerPoolDropped = promauto.NewCounter(prometheus.CounterOpts{
		Name: metricsPrefix + "_worker_pool_dropped_total",
		Help: "Total number of messages dropped due to full worker pool",
	})

	WorkerPoolQueueSize = promauto.NewGauge(prometheus.GaugeOpts{
		Name: metricsPrefix + "_worker_pool_queue_size",
		Help: "Current number of messages in the worker pool queue",
	})
)
