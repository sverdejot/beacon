package org.beacon

import com.beacon.schema.common.PayloadPublication
import jakarta.xml.bind.JAXBContext
import jakarta.xml.bind.JAXBElement
import org.slf4j.LoggerFactory
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

class DatexClient(private val url: String) {
    private val logger = LoggerFactory.getLogger(DatexClient::class.java)

    private val httpClient: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build()

    private val jaxbContext: JAXBContext = JAXBContext.newInstance(
        com.beacon.schema.payload.ObjectFactory::class.java,
        com.beacon.schema.situation.ObjectFactory::class.java,
        com.beacon.schema.common.ObjectFactory::class.java
    )

    init {
        logger.info("initialized DATEX client with url={}", url)
    }

    fun fetch(): PayloadPublication? {
        Metrics.datexFetchTotal.increment()
        return Metrics.datexFetchTimer.recordCallable {
            try {
                logger.debug("fetching XML from DATEX API")
                val xml = fetchXml()
                logger.debug("received XML response, size={} bytes", xml.length)
                parseXml(xml)
            } catch (e: Exception) {
                Metrics.datexFetchErrors.increment()
                logger.error("failed to fetch from DATEX API: {}", e.message)
                throw e
            }
        }
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
            logger.error("DATEX API returned non-200 status: statusCode={}", response.statusCode())
            throw RuntimeException("Failed to fetch XML: HTTP ${response.statusCode()}")
        }

        logger.trace("HTTP response received: statusCode={}", response.statusCode())
        return response.body()
    }

    private fun parseXml(xml: String): PayloadPublication? {
        logger.debug("parsing XML response")
        val unmarshaller = jaxbContext.createUnmarshaller()
        val result = unmarshaller.unmarshal(xml.reader())

        return when (result) {
            is JAXBElement<*> -> {
                logger.debug("parsed JAXBElement successfully")
                result.value as? PayloadPublication
            }
            is PayloadPublication -> {
                logger.debug("parsed PayloadPublication successfully")
                result
            }
            else -> {
                logger.warn("unknown result type from XML parsing: {}", result?.javaClass?.simpleName)
                null
            }
        }
    }
}
