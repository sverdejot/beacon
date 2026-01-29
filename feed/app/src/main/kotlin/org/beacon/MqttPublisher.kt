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
import java.time.Instant

class MqttPublisher(
    brokerUrl: String,
    clientId: String,
    private val topicPrefix: String
) {
    private val client: MqttClient
    private val objectMapper: ObjectMapper = ObjectMapper()
        .registerModule(JaxbAnnotationModule())
        .registerModule(ConfigurableSerializationModule("/mappings.yaml"))
        .enable(SerializationFeature.INDENT_OUTPUT)
        .setSerializationInclusion(JsonInclude.Include.NON_EMPTY)

    init {
        val persistence = MemoryPersistence()
        client = MqttClient(brokerUrl, clientId, persistence)

        val options = MqttConnectOptions().apply {
            isCleanSession = true
            connectionTimeout = 10
            isAutomaticReconnect = true
        }

        client.connect(options)
        println("Connected to MQTT broker")
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
            } catch (e: Exception) {
                Metrics.mqttPublishErrors.increment()
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
        println("Published deletion for $id to $topic")
    }

    fun disconnect() {
        client.disconnect()
    }
}
