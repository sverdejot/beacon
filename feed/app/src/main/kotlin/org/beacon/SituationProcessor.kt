package org.beacon

import com.beacon.schema.situation.SituationPublication
import com.beacon.schema.situation.SituationRecord
import org.slf4j.LoggerFactory
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

data class RecordMetadata(
    val id: String,
    val province: String,
    val eventType: String,
    val version: String
)

class SituationProcessor(
    private val publisher: MqttPublisher,
    private val scheduler: ScheduledExecutorService
) {
    private val logger = LoggerFactory.getLogger(SituationProcessor::class.java)
    private val knownRecords = ConcurrentHashMap<String, RecordMetadata>()
    private val scheduledRecords = ConcurrentHashMap.newKeySet<String>()

    fun process(publication: SituationPublication) {
        var newRecords = 0
        var scheduledCount = 0
        var immediateCount = 0
        var updatedCount = 0
        var deletedCount = 0

        // Collect current record IDs from the publication
        val currentIds = publication.situation.flatMap { situation ->
            situation.situationRecord.map { it.id }
        }.toSet()

        // Detect and process deletions (records that disappeared from the feed)
        val deletedIds = knownRecords.keys - currentIds
        deletedIds.forEach { id ->
            knownRecords.remove(id)?.let { meta ->
                try {
                    publisher.publishDeletion(id, meta.province, meta.eventType)
                    deletedCount++
                    logger.debug("detected deletion: id={}, province={}", id, meta.province)
                } catch (e: Exception) {
                    logger.error("failed to publish deletion: id={}, error={}", id, e.message)
                    // Re-add to retry next poll
                    knownRecords[id] = meta
                }
            }
        }

        publication.situation.forEach { situation ->
            situation.situationRecord.forEach { record ->
                val recordKey = "${record.id}:${record.version}"
                val existingMeta = knownRecords[record.id]

                // Skip if same version already processed or scheduled
                if (existingMeta?.version == record.version || recordKey in scheduledRecords) {
                    return@forEach
                }

                val isUpdate = existingMeta != null
                if (isUpdate) {
                    updatedCount++
                    logger.debug("detected update: id={}, oldVersion={}, newVersion={}",
                        record.id, existingMeta?.version, record.version)
                } else {
                    newRecords++
                    logger.debug("detected new record: id={}, version={}", record.id, record.version)
                }

                val startTime = record.validity.validityTimeSpecification.overallStartTime
                val publishTime = startTime.toInstant()
                val now = Instant.now()

                if (publishTime.isAfter(now)) {
                    scheduleRecord(record, recordKey, publishTime, now)
                    scheduledCount++
                } else {
                    publishRecord(record, recordKey)
                    immediateCount++
                }
            }
        }

        // Update metrics
        Metrics.situationsProcessedTotal.increment()
        if (newRecords > 0) Metrics.situationsNewTotal.increment(newRecords.toDouble())
        if (updatedCount > 0) Metrics.situationsUpdatedTotal.increment(updatedCount.toDouble())
        if (deletedCount > 0) Metrics.situationsDeletedTotal.increment(deletedCount.toDouble())
        if (scheduledCount > 0) Metrics.situationsScheduledTotal.increment(scheduledCount.toDouble())
        Metrics.setTrackedRecords(knownRecords.size)
        Metrics.setScheduledRecords(scheduledRecords.size)

        if (newRecords > 0 || updatedCount > 0 || deletedCount > 0) {
            logger.info("processing complete: new={}, updated={}, deleted={}, immediate={}, scheduled={}",
                newRecords, updatedCount, deletedCount, immediateCount, scheduledCount)
        } else {
            logger.debug("poll complete: no changes detected")
        }
        logger.debug("state: trackedRecords={}, pendingScheduled={}", knownRecords.size, scheduledRecords.size)
    }

    private fun scheduleRecord(
        record: SituationRecord,
        recordKey: String,
        publishTime: Instant,
        now: Instant
    ) {
        val delay = Duration.between(now, publishTime).toMillis()
        scheduledRecords.add(recordKey)

        logger.debug("scheduling record for future publish: id={}, delay={}ms, publishTime={}",
            record.id, delay, publishTime)

        scheduler.schedule(
            { publishRecord(record, recordKey) },
            delay,
            TimeUnit.MILLISECONDS
        )
    }

    private fun publishRecord(record: SituationRecord, recordKey: String) {
        try {
            publisher.publish(record)
            scheduledRecords.remove(recordKey)

            // Store metadata for deletion detection
            val metadata = RecordMetadata(
                id = record.id,
                province = record.extractProvince().normalizeForTopic(),
                eventType = record.extractEventType(),
                version = record.version
            )
            knownRecords[record.id] = metadata
            logger.trace("record published and tracked: id={}, version={}", record.id, record.version)
        } catch (e: Exception) {
            scheduledRecords.remove(recordKey)
            logger.error("failed to publish record: id={}, version={}, error={}",
                record.id, record.version, e.message, e)
        }
    }
}
