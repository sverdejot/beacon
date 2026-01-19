package org.beacon

import com.beacon.schema.situation.SituationPublication
import com.beacon.schema.situation.SituationRecord
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class SituationProcessor(
    private val publisher: MqttPublisher,
    private val scheduler: ScheduledExecutorService
) {
    private val publishedRecords = ConcurrentHashMap.newKeySet<String>()
    private val scheduledRecords = ConcurrentHashMap.newKeySet<String>()

    fun process(publication: SituationPublication) {
        var newRecords = 0
        var scheduledCount = 0
        var immediateCount = 0

        publication.situation.forEach { situation ->
            situation.situationRecord.forEach { record ->
                val recordKey = "${record.id}:${record.version}"

                if (recordKey in publishedRecords || recordKey in scheduledRecords) {
                    return@forEach
                }

                newRecords++
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

        if (newRecords > 0) {
            println("Found $newRecords new records: $immediateCount published immediately, $scheduledCount scheduled")
        } else {
            println("No new records")
        }
        println("Total tracked: ${publishedRecords.size} published, ${scheduledRecords.size} pending")
    }

    private fun scheduleRecord(
        record: SituationRecord,
        recordKey: String,
        publishTime: Instant,
        now: Instant
    ) {
        val delay = Duration.between(now, publishTime).toMillis()
        scheduledRecords.add(recordKey)

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
            publishedRecords.add(recordKey)
        } catch (e: Exception) {
            scheduledRecords.remove(recordKey)
            println("Failed to publish record $recordKey: ${e.message}")
        }
    }
}
