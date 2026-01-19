package org.beacon

import com.beacon.schema.situation.GenericSituationRecord
import com.beacon.schema.situation.SituationRecord
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.jaxb.JaxbAnnotationModule
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence

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
        val province = record.extractProvince().normalizeForTopic()
        val recordType = when (record) {
            is GenericSituationRecord -> {
                val causeType = record.cause?.causeType?.value?.value() ?: "unknown"
                "causes/${causeType.toSnakeCase()}"
            }
            else -> record::class.java.simpleName.toSnakeCase()
        }

        val topic = "$topicPrefix/$province/$recordType"
        val json = objectMapper.writeValueAsString(record)

        val message = MqttMessage(json.toByteArray()).apply {
            qos = 1
            isRetained = false
        }

        client.publish(topic, message)
    }

    fun disconnect() {
        client.disconnect()
    }
}
