package org.beacon

import com.beacon.schema.situation.SituationRecord
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.jaxb.JaxbAnnotationModule
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.slf4j.LoggerFactory
import java.time.Instant

class MqttPublisher(
    brokerUrl: String,
    clientId: String,
    private val topicPrefix: String
) {
    private val logger = LoggerFactory.getLogger(MqttPublisher::class.java)
    private val client: MqttClient
    private val objectMapper: ObjectMapper = ObjectMapper()
        .registerModule(JaxbAnnotationModule())
        .registerModule(ConfigurableSerializationModule("/mappings.yaml"))
        .enable(SerializationFeature.INDENT_OUTPUT)
        .setSerializationInclusion(JsonInclude.Include.NON_EMPTY)

    init {
        logger.info("connecting to MQTT broker: brokerUrl={}, clientId={}", brokerUrl, clientId)
        val persistence = MemoryPersistence()
        client = MqttClient(brokerUrl, clientId, persistence)

        val options = MqttConnectOptions().apply {
            isCleanSession = true
            connectionTimeout = 10
            isAutomaticReconnect = true
        }

        client.connect(options)
        logger.info("connected to MQTT broker")
    }

    fun publish(record: SituationRecord) {
        Metrics.mqttPublishTimer.record {
            try {
                val region = record.extractProvince().normalizeForTopic()
                val eventType = record.extractEventType()

                val topic = "$topicPrefix/$region/situations/$eventType"
                val json = objectMapper.writeValueAsString(record)

                val message = MqttMessage(json.toByteArray()).apply {
                    qos = 1
                    isRetained = false
                }

                client.publish(topic, message)
                Metrics.mqttPublishTotal.increment()
                logger.debug("published situation: id={}, topic={}, size={} bytes",
                    record.id, topic, json.length)
            } catch (e: Exception) {
                Metrics.mqttPublishErrors.increment()
                logger.error("failed to publish situation: id={}, error={}",
                    record.id, e.message)
                throw e
            }
        }
    }

    fun publishDeletion(id: String, province: String, eventType: String) {
        val topic = "$topicPrefix/$province/deletions/$eventType"
        val payload = mapOf(
            "id" to id,
            "deletedAt" to Instant.now().toString()
        )
        val json = objectMapper.writeValueAsString(payload)

        val message = MqttMessage(json.toByteArray()).apply {
            qos = 1
            isRetained = false
        }

        client.publish(topic, message)
        Metrics.mqttDeletionTotal.increment()
        logger.info("published deletion: id={}, topic={}", id, topic)
    }

    fun disconnect() {
        logger.info("disconnecting from MQTT broker")
        client.disconnect()
        logger.info("disconnected from MQTT broker")
    }
}
