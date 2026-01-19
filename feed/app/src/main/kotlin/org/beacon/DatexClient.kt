package org.beacon

import com.beacon.schema.common.PayloadPublication
import jakarta.xml.bind.JAXBContext
import jakarta.xml.bind.JAXBElement
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

class DatexClient(private val url: String) {
    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build()

    private val jaxbContext: JAXBContext = JAXBContext.newInstance(
        com.beacon.schema.payload.ObjectFactory::class.java,
        com.beacon.schema.situation.ObjectFactory::class.java,
        com.beacon.schema.common.ObjectFactory::class.java
    )

    fun fetch(): PayloadPublication? {
        val xml = fetchXml()
        return parseXml(xml)
    }

    private fun fetchXml(): String {
        val request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Accept", "application/xml")
            .timeout(Duration.ofSeconds(30))
            .GET()
            .build()

        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())

        if (response.statusCode() != 200) {
            throw RuntimeException("Failed to fetch XML: HTTP ${response.statusCode()}")
        }

        return response.body()
    }

    private fun parseXml(xml: String): PayloadPublication? {
        val unmarshaller = jaxbContext.createUnmarshaller()
        val result = unmarshaller.unmarshal(xml.reader())

        return when (result) {
            is JAXBElement<*> -> result.value as? PayloadPublication
            is PayloadPublication -> result
            else -> null
        }
    }
}
