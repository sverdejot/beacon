package org.beacon

import com.beacon.schema.location.PointLocation
import com.beacon.schema.location.SingleRoadLinearLocation
import com.beacon.schema.location.TpegNonJunctionPoint
import com.beacon.schema.location.TpegSimplePoint
import com.beacon.schema.situation.SituationRecord
import java.time.Instant
import javax.xml.datatype.XMLGregorianCalendar

fun XMLGregorianCalendar.toInstant(): Instant {
    return this.toGregorianCalendar().toZonedDateTime().toInstant()
}

fun String.toSnakeCase(): String {
    return this.replace(Regex("([a-z])([A-Z])"), "$1_$2").lowercase()
}

fun String.normalizeForTopic(): String {
    return this
        .split("/").first()
        .replace(" ", "_")
        .lowercase()
}

fun SituationRecord.extractProvince(): String {
    return when (val location = this.locationReference) {
        is SingleRoadLinearLocation -> {
            val tpegLocation = location.tpegLinearLocation ?: return "unknown"

            val fromPoint = tpegLocation.from as? TpegNonJunctionPoint
            val fromProvince = fromPoint?.tpegNonJunctionPointExtension?.extendedTpegNonJunctionPoint?.province
            if (fromProvince != null) return fromProvince

            val toPoint = tpegLocation.to as? TpegNonJunctionPoint
            val toProvince = toPoint?.tpegNonJunctionPointExtension?.extendedTpegNonJunctionPoint?.province
            if (toProvince != null) return toProvince

            "unknown"
        }

        is PointLocation -> {
            val tpegPointLocation = location.tpegPointLocation ?: return "unknown"

            val simplePoint = tpegPointLocation as? TpegSimplePoint
            val point = simplePoint?.point as? TpegNonJunctionPoint
            val province = point?.tpegNonJunctionPointExtension?.extendedTpegNonJunctionPoint?.province
            if (province != null) return province

            "unknown"
        }

        else -> "unknown"
    }
}
