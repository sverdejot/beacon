package org.beacon

import com.beacon.schema.situation.SituationPublication
import org.slf4j.LoggerFactory
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private val logger = LoggerFactory.getLogger("org.beacon.Feed")

private const val DATEX_URL = "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml"
private val MQTT_BROKER = System.getenv("MQTT_BROKER") ?: "tcp://localhost:1883"
private const val MQTT_CLIENT_ID = "datex-feed"
private const val MQTT_TOPIC_PREFIX = "beacon/v1/es"
private const val POLL_INTERVAL_SECONDS = 60L
private val METRICS_PORT = System.getenv("METRICS_PORT")?.toIntOrNull() ?: 9090

fun main() {
    logger.info("starting feed service")
    logger.info("configuration loaded: datexUrl={}, mqttBroker={}, pollInterval={}s, metricsPort={}",
        DATEX_URL, MQTT_BROKER, POLL_INTERVAL_SECONDS, METRICS_PORT)

    // Start metrics server
    Metrics.startServer(METRICS_PORT)

    val datexClient = DatexClient(DATEX_URL)
    val mqttPublisher = MqttPublisher(MQTT_BROKER, MQTT_CLIENT_ID, MQTT_TOPIC_PREFIX)
    val scheduler = Executors.newScheduledThreadPool(4)
    val processor = SituationProcessor(mqttPublisher, scheduler)

    Runtime.getRuntime().addShutdownHook(Thread {
        logger.info("shutdown signal received, stopping services...")
        scheduler.shutdown()
        mqttPublisher.disconnect()
        logger.info("shutdown complete")
    })

    logger.info("starting scheduled polling every {} seconds", POLL_INTERVAL_SECONDS)
    scheduler.scheduleAtFixedRate(
        { poll(datexClient, processor) },
        0,
        POLL_INTERVAL_SECONDS,
        TimeUnit.SECONDS
    )

    Thread.currentThread().join()
}

private fun poll(client: DatexClient, processor: SituationProcessor) {
    try {
        logger.debug("starting poll cycle")
        val publication = client.fetch()
        if (publication is SituationPublication) {
            val situationCount = publication.situation.size
            logger.debug("fetched {} situations from DATEX API", situationCount)
            processor.process(publication)
        } else {
            logger.warn("received unexpected publication type: {}", publication?.javaClass?.simpleName)
        }
    } catch (e: Exception) {
        logger.error("error during poll cycle: {}", e.message, e)
    }
}
