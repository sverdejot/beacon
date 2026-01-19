package org.beacon

import com.beacon.schema.situation.SituationPublication
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private const val DATEX_URL = "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml"
private val MQTT_BROKER = System.getenv("MQTT_BROKER") ?: "tcp://localhost:1883"
private const val MQTT_CLIENT_ID = "datex-feed"
private const val MQTT_TOPIC_PREFIX = "datex/situations"
private const val POLL_INTERVAL_SECONDS = 60L

fun main() {
    val datexClient = DatexClient(DATEX_URL)
    val mqttPublisher = MqttPublisher(MQTT_BROKER, MQTT_CLIENT_ID, MQTT_TOPIC_PREFIX)
    val scheduler = Executors.newScheduledThreadPool(4)
    val processor = SituationProcessor(mqttPublisher, scheduler)

    Runtime.getRuntime().addShutdownHook(Thread {
        scheduler.shutdown()
        mqttPublisher.disconnect()
    })

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
        val publication = client.fetch()
        if (publication is SituationPublication) {
            processor.process(publication)
        }
    } catch (e: Exception) {
        println("[${Instant.now()}] Error during poll: ${e.message}")
    }
}
