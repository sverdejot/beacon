package org.beacon

import com.sun.net.httpserver.HttpServer
import io.micrometer.core.instrument.Counter
import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.Timer
import io.micrometer.prometheus.PrometheusConfig
import io.micrometer.prometheus.PrometheusMeterRegistry
import org.slf4j.LoggerFactory
import java.net.InetSocketAddress
import java.util.concurrent.atomic.AtomicInteger

object Metrics {
    private val logger = LoggerFactory.getLogger(Metrics::class.java)
    val registry = PrometheusMeterRegistry(PrometheusConfig.DEFAULT)

    private const val PREFIX = "feed"

    // Datex API metrics
    val datexFetchTimer: Timer = Timer.builder("${PREFIX}_datex_fetch_duration_seconds")
        .description("Time spent fetching data from DATEX API")
        .register(registry)

    val datexFetchTotal: Counter = Counter.builder("${PREFIX}_datex_fetch_total")
        .description("Total number of DATEX API fetch attempts")
        .register(registry)

    val datexFetchErrors: Counter = Counter.builder("${PREFIX}_datex_fetch_errors_total")
        .description("Total number of DATEX API fetch errors")
        .register(registry)

    // MQTT publishing metrics
    val mqttPublishTotal: Counter = Counter.builder("${PREFIX}_mqtt_publish_total")
        .description("Total number of MQTT messages published")
        .tag("type", "situation")
        .register(registry)

    val mqttPublishErrors: Counter = Counter.builder("${PREFIX}_mqtt_publish_errors_total")
        .description("Total number of MQTT publish errors")
        .register(registry)

    val mqttDeletionTotal: Counter = Counter.builder("${PREFIX}_mqtt_deletion_total")
        .description("Total number of deletion messages published")
        .register(registry)

    val mqttPublishTimer: Timer = Timer.builder("${PREFIX}_mqtt_publish_duration_seconds")
        .description("Time spent publishing to MQTT")
        .register(registry)

    // Situation processing metrics
    private val trackedRecordsGauge = AtomicInteger(0)
    private val scheduledRecordsGauge = AtomicInteger(0)

    val situationsProcessedTotal: Counter = Counter.builder("${PREFIX}_situations_processed_total")
        .description("Total number of situations processed")
        .register(registry)

    val situationsNewTotal: Counter = Counter.builder("${PREFIX}_situations_new_total")
        .description("Total number of new situations detected")
        .register(registry)

    val situationsUpdatedTotal: Counter = Counter.builder("${PREFIX}_situations_updated_total")
        .description("Total number of situation updates detected")
        .register(registry)

    val situationsDeletedTotal: Counter = Counter.builder("${PREFIX}_situations_deleted_total")
        .description("Total number of situations deleted")
        .register(registry)

    val situationsScheduledTotal: Counter = Counter.builder("${PREFIX}_situations_scheduled_total")
        .description("Total number of situations scheduled for future publication")
        .register(registry)

    init {
        Gauge.builder("${PREFIX}_tracked_records", trackedRecordsGauge) { it.get().toDouble() }
            .description("Current number of tracked records")
            .register(registry)

        Gauge.builder("${PREFIX}_scheduled_records", scheduledRecordsGauge) { it.get().toDouble() }
            .description("Current number of scheduled records pending publication")
            .register(registry)
    }

    fun setTrackedRecords(count: Int) {
        trackedRecordsGauge.set(count)
    }

    fun setScheduledRecords(count: Int) {
        scheduledRecordsGauge.set(count)
    }

    fun startServer(port: Int = 9090) {
        logger.info("starting metrics server on port {}", port)
        val server = HttpServer.create(InetSocketAddress(port), 0)
        server.createContext("/metrics") { exchange ->
            val response = registry.scrape()
            exchange.responseHeaders.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            exchange.sendResponseHeaders(200, response.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(response.toByteArray()) }
            logger.trace("served metrics request")
        }
        server.createContext("/health") { exchange ->
            val response = "OK"
            exchange.sendResponseHeaders(200, response.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(response.toByteArray()) }
        }
        server.executor = null
        server.start()
        logger.info("metrics server started: endpoints=[/metrics, /health]")
    }
}
