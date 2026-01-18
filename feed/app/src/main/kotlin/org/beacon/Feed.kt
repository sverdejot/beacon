package org.beacon

import com.beacon.schema.common.OverallPeriod
import com.beacon.schema.common.PayloadPublication
import com.beacon.schema.common.Validity
import com.beacon.schema.location.DirectionEnum
import com.beacon.schema.location.LinearLocation
import com.beacon.schema.location.Location
import com.beacon.schema.location.LocationReference
import com.beacon.schema.location.NetworkLocation
import com.beacon.schema.location.PointCoordinates
import com.beacon.schema.location.PointLocation
import com.beacon.schema.location.SupplementaryPositionalDescription
import com.beacon.schema.location.DirectionPurposeEnum
import com.beacon.schema.location.GeographicCharacteristicEnum
import com.beacon.schema.location.InfrastructureDescriptorEnum
import com.beacon.schema.location.SingleRoadLinearLocation
import com.beacon.schema.location.TpegLinearLocation
import com.beacon.schema.location.TpegLoc01LinearLocationSubtypeEnum
import com.beacon.schema.location.TpegLoc01SimplePointLocationSubtypeEnum
import com.beacon.schema.location.TpegNonJunctionPoint
import com.beacon.schema.location.TpegNonJunctionPointExtensionType
import com.beacon.schema.location.TpegPoint
import com.beacon.schema.location.TpegPointLocation
import com.beacon.schema.location.TpegSimplePoint
import com.beacon.schema.location.RoadInformation
import com.beacon.schema.spanishloc.ExtendedTpegNonJunctionPoint
import com.beacon.schema.situation.AbnormalTraffic
import com.beacon.schema.situation.AbnormalTrafficTypeEnum
import com.beacon.schema.situation.AnimalPresenceObstruction
import com.beacon.schema.situation.AnimalPresenceTypeEnum
import com.beacon.schema.situation.Cause
import com.beacon.schema.situation.CauseTypeEnum
import com.beacon.schema.situation.ComplianceOptionEnum
import com.beacon.schema.situation.Conditions
import com.beacon.schema.situation.GeneralInstructionOrMessageToRoadUsers
import com.beacon.schema.situation.GeneralInstructionToRoadUsersTypeEnum
import com.beacon.schema.situation.GeneralObstruction
import com.beacon.schema.situation.GenericSituationRecord
import com.beacon.schema.situation.Impact
import com.beacon.schema.situation.MaintenanceWorks
import com.beacon.schema.situation.Mobility
import com.beacon.schema.situation.MobilityTypeEnum
import com.beacon.schema.situation.NetworkManagement
import com.beacon.schema.situation.NonWeatherRelatedRoadConditions
import com.beacon.schema.situation.NonWeatherRelatedRoadConditionTypeEnum
import com.beacon.schema.situation.Obstruction
import com.beacon.schema.situation.ObstructionTypeEnum
import com.beacon.schema.situation.OperatorAction
import com.beacon.schema.situation.PoorEnvironmentConditions
import com.beacon.schema.situation.PoorEnvironmentTypeEnum
import com.beacon.schema.situation.ProbabilityOfOccurrenceEnum
import com.beacon.schema.situation.RoadMaintenanceTypeEnum
import com.beacon.schema.situation.RoadOrCarriagewayOrLaneManagement
import com.beacon.schema.situation.RoadOrCarriagewayOrLaneManagementTypeEnum
import com.beacon.schema.situation.RoadSurfaceConditions
import com.beacon.schema.situation.Roadworks
import com.beacon.schema.situation.SeverityEnum
import com.beacon.schema.situation.SituationPublication
import com.beacon.schema.situation.SituationRecord
import com.beacon.schema.situation.SpeedManagement
import com.beacon.schema.situation.SpeedManagementTypeEnum
import com.beacon.schema.situation.TrafficElement
import com.beacon.schema.situation.VehicleObstruction
import com.beacon.schema.situation.VehicleObstructionTypeEnum
import com.beacon.schema.situation.Delays
import com.beacon.schema.situation.DetailedCauseType
import com.beacon.schema.situation.AccidentTypeEnum
import com.beacon.schema.situation.DisturbanceActivityTypeEnum
import com.beacon.schema.situation.EnvironmentalObstructionTypeEnum
import com.beacon.schema.situation.EquipmentOrSystemFaultTypeEnum
import com.beacon.schema.situation.InfrastructureDamageTypeEnum
import com.beacon.schema.common.PublicEventTypeEnum
import com.beacon.schema.common.Source
import com.beacon.schema.common.VehicleCharacteristics
import com.beacon.schema.common.LoadTypeEnum
import com.beacon.schema.common.VehicleEquipmentEnum
import com.beacon.schema.common.VehicleTypeEnum
import com.beacon.schema.common.GrossWeightCharacteristic
import com.beacon.schema.common.HeightCharacteristic
import com.beacon.schema.common.LengthCharacteristic
import com.beacon.schema.common.WidthCharacteristic
import com.beacon.schema.common.HeaviestAxleWeightCharacteristic
import com.beacon.schema.common.ComparisonOperatorEnum
import com.beacon.schema.common.WeightTypeEnum
import com.beacon.schema.common.Emissions
import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonUnwrapped
import com.fasterxml.jackson.annotation.JsonValue
import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.databind.JsonSerializer
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializerProvider
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.module.SimpleModule
import com.fasterxml.jackson.module.jaxb.JaxbAnnotationModule
import jakarta.xml.bind.JAXBContext
import jakarta.xml.bind.JAXBElement
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.time.Instant
import java.time.ZonedDateTime
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import javax.xml.datatype.XMLGregorianCalendar

private const val DATEX_URL = "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml"
private val MQTT_BROKER = System.getenv("MQTT_BROKER") ?: "tcp://localhost:1883"
private const val MQTT_CLIENT_ID = "datex-feed"
private const val MQTT_TOPIC_PREFIX = "datex/situations"
private const val POLL_INTERVAL_SECONDS = 60L

// Custom serializer for DetailedCauseType - flattens all subtypes into a single array
private class DetailedCauseTypeSerializer : JsonSerializer<DetailedCauseType>() {
    override fun serialize(value: DetailedCauseType?, gen: JsonGenerator, serializers: SerializerProvider) {
        if (value == null) {
            gen.writeNull()
            return
        }

        val subtypes = mutableListOf<String>()

        // Collect all non-null enum values
        value.abnormalTrafficType?.value?.value()?.let { subtypes.add(it) }
        value.accidentType?.forEach { it?.value?.value()?.let { v -> subtypes.add(v) } }
        value.disturbanceActivityType?.value?.value()?.let { subtypes.add(it) }
        value.environmentalObstructionType?.value?.value()?.let { subtypes.add(it) }
        value.equipmentOrSystemFaultType?.value?.value()?.let { subtypes.add(it) }
        value.infrastructureDamageType?.value?.value()?.let { subtypes.add(it) }
        value.obstructionType?.forEach { it?.value?.value()?.let { v -> subtypes.add(v) } }
        value.poorEnvironmentType?.forEach { it?.value?.value()?.let { v -> subtypes.add(v) } }
        value.publicEventType?.value?.value()?.let { subtypes.add(it) }
        value.roadMaintenanceType?.forEach { it?.value?.value()?.let { v -> subtypes.add(v) } }
        value.roadOrCarriagewayOrLaneManagementType?.value?.value()?.let { subtypes.add(it) }
        value.vehicleObstructionType?.value?.value()?.let { subtypes.add(it) }

        gen.writeObject(subtypes)
    }
}

private val objectMapper: ObjectMapper = ObjectMapper()
    .registerModule(JaxbAnnotationModule())
    .registerModule(SimpleModule().addSerializer(DetailedCauseType::class.java, DetailedCauseTypeSerializer()))
    .enable(SerializationFeature.INDENT_OUTPUT)
    .setSerializationInclusion(JsonInclude.Include.NON_EMPTY)
    // SituationRecord mixins
    .addMixIn(SituationRecord::class.java, SituationRecordMixin::class.java)
    .addMixIn(ProbabilityOfOccurrenceEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(SeverityEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(CauseTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(Validity::class.java, ValidityMixin::class.java)
    .addMixIn(OverallPeriod::class.java, OverallPeriodMixin::class.java)
    .addMixIn(Impact::class.java, ImpactMixin::class.java)
    .addMixIn(Cause::class.java, CauseMixin::class.java)
    .addMixIn(DetailedCauseType::class.java, DetailedCauseTypeMixin::class.java)
    .addMixIn(AccidentTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(DisturbanceActivityTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(EnvironmentalObstructionTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(EquipmentOrSystemFaultTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(InfrastructureDamageTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(PublicEventTypeEnum::class.java, EnumValueMixin::class.java)
    // Location mixins - remove extensions
    .addMixIn(LocationReference::class.java, LocationReferenceMixin::class.java)
    .addMixIn(Location::class.java, LocationMixin::class.java)
    .addMixIn(NetworkLocation::class.java, NetworkLocationMixin::class.java)
    .addMixIn(SupplementaryPositionalDescription::class.java, SupplementaryPositionalDescriptionMixin::class.java)
    .addMixIn(DirectionPurposeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(GeographicCharacteristicEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(InfrastructureDescriptorEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(LinearLocation::class.java, LinearLocationMixin::class.java)
    .addMixIn(SingleRoadLinearLocation::class.java, SingleRoadLinearLocationMixin::class.java)
    .addMixIn(PointLocation::class.java, PointLocationMixin::class.java)
    .addMixIn(TpegLinearLocation::class.java, TpegLinearLocationMixin::class.java)
    .addMixIn(TpegPoint::class.java, TpegPointMixin::class.java)
    .addMixIn(TpegNonJunctionPoint::class.java, TpegNonJunctionPointMixin::class.java)
    .addMixIn(TpegNonJunctionPointExtensionType::class.java, TpegNonJunctionPointExtensionMixin::class.java)
    .addMixIn(ExtendedTpegNonJunctionPoint::class.java, ExtendedTpegNonJunctionPointMixin::class.java)
    .addMixIn(TpegPointLocation::class.java, TpegPointLocationMixin::class.java)
    .addMixIn(RoadInformation::class.java, RoadInformationMixin::class.java)
    .addMixIn(TpegSimplePoint::class.java, TpegSimplePointMixin::class.java)
    .addMixIn(PointCoordinates::class.java, PointCoordinatesMixin::class.java)
    // Location enum mixins
    .addMixIn(DirectionEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(TpegLoc01LinearLocationSubtypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(TpegLoc01SimplePointLocationSubtypeEnum::class.java, EnumValueMixin::class.java)
    // Obstruction mixins
    .addMixIn(TrafficElement::class.java, TrafficElementMixin::class.java)
    .addMixIn(Obstruction::class.java, ObstructionMixin::class.java)
    .addMixIn(GeneralObstruction::class.java, GeneralObstructionMixin::class.java)
    .addMixIn(VehicleObstruction::class.java, VehicleObstructionMixin::class.java)
    .addMixIn(AnimalPresenceObstruction::class.java, AnimalPresenceObstructionMixin::class.java)
    .addMixIn(Mobility::class.java, MobilityMixin::class.java)
    .addMixIn(MobilityTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(ObstructionTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(VehicleObstructionTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(AnimalPresenceTypeEnum::class.java, EnumValueMixin::class.java)
    // Conditions mixins
    .addMixIn(Conditions::class.java, ConditionsMixin::class.java)
    .addMixIn(PoorEnvironmentConditions::class.java, PoorEnvironmentConditionsMixin::class.java)
    .addMixIn(PoorEnvironmentTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(RoadSurfaceConditions::class.java, RoadSurfaceConditionsMixin::class.java)
    .addMixIn(NonWeatherRelatedRoadConditions::class.java, NonWeatherRelatedRoadConditionsMixin::class.java)
    .addMixIn(NonWeatherRelatedRoadConditionTypeEnum::class.java, EnumValueMixin::class.java)
    // Traffic mixins
    .addMixIn(AbnormalTraffic::class.java, AbnormalTrafficMixin::class.java)
    .addMixIn(AbnormalTrafficTypeEnum::class.java, EnumValueMixin::class.java)
    // OperatorAction mixins
    .addMixIn(OperatorAction::class.java, OperatorActionMixin::class.java)
    .addMixIn(Roadworks::class.java, RoadworksMixin::class.java)
    .addMixIn(MaintenanceWorks::class.java, MaintenanceWorksMixin::class.java)
    .addMixIn(RoadMaintenanceTypeEnum::class.java, EnumValueMixin::class.java)
    // NetworkManagement mixins
    .addMixIn(NetworkManagement::class.java, NetworkManagementMixin::class.java)
    .addMixIn(ComplianceOptionEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(RoadOrCarriagewayOrLaneManagement::class.java, RoadOrCarriagewayOrLaneManagementMixin::class.java)
    .addMixIn(RoadOrCarriagewayOrLaneManagementTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(SpeedManagement::class.java, SpeedManagementMixin::class.java)
    .addMixIn(SpeedManagementTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(GeneralInstructionOrMessageToRoadUsers::class.java, GeneralInstructionMixin::class.java)
    .addMixIn(GeneralInstructionToRoadUsersTypeEnum::class.java, EnumValueMixin::class.java)
    // Delays mixin
    .addMixIn(Delays::class.java, DelaysMixin::class.java)
    // Source mixin
    .addMixIn(Source::class.java, SourceMixin::class.java)
    // VehicleCharacteristics mixins
    .addMixIn(VehicleCharacteristics::class.java, VehicleCharacteristicsMixin::class.java)
    .addMixIn(LoadTypeEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(VehicleEquipmentEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(VehicleTypeEnum::class.java, EnumValueMixin::class.java)
    // Characteristic mixins
    .addMixIn(GrossWeightCharacteristic::class.java, GrossWeightCharacteristicMixin::class.java)
    .addMixIn(HeightCharacteristic::class.java, HeightCharacteristicMixin::class.java)
    .addMixIn(LengthCharacteristic::class.java, LengthCharacteristicMixin::class.java)
    .addMixIn(WidthCharacteristic::class.java, WidthCharacteristicMixin::class.java)
    .addMixIn(HeaviestAxleWeightCharacteristic::class.java, HeaviestAxleWeightCharacteristicMixin::class.java)
    .addMixIn(ComparisonOperatorEnum::class.java, EnumValueMixin::class.java)
    .addMixIn(WeightTypeEnum::class.java, EnumValueMixin::class.java)
    // Emissions mixin
    .addMixIn(Emissions::class.java, EmissionsMixin::class.java)

// Mixin for SituationRecord - removes unused fields, renames others, flattens validity
@Suppress("unused")
private abstract class SituationRecordMixin {
    @JsonIgnore
    abstract fun getGeneralPublicComment(): List<*>

    @JsonIgnore
    abstract fun getNonGeneralPublicComment(): List<*>

    @JsonIgnore
    abstract fun getSituationRecordCreationReference(): String?

    @JsonIgnore
    abstract fun getSituationRecordCreationTime(): Any?

    @JsonIgnore
    abstract fun getSituationRecordVersionTime(): Any?

    @JsonIgnore
    abstract fun isSafetyRelatedMessage(): Boolean?

    @JsonIgnore
    abstract fun getSituationRecordExtension(): Any?

    @JsonIgnore
    abstract fun getGenericSituationRecordExtension(): Any?

    @JsonProperty("location")
    abstract fun getLocationReference(): Any?

    @JsonProperty("probability")
    abstract fun getProbabilityOfOccurrence(): Any?

    @JsonProperty("name")
    abstract fun getGenericSituationRecordName(): String?

    @JsonUnwrapped
    abstract fun getValidity(): Any?
}

// Mixin to flatten enum wrappers to just their value
@Suppress("unused")
private abstract class EnumValueMixin {
    @JsonValue
    abstract fun getValue(): Any?
}

// Mixin for Validity - unwraps time specification, removes status and extension
@Suppress("unused")
private abstract class ValidityMixin {
    @JsonIgnore
    abstract fun getValidityStatus(): Any?

    @JsonIgnore
    abstract fun getValidityExtension(): Any?

    @JsonUnwrapped
    abstract fun getValidityTimeSpecification(): OverallPeriod?
}

// Mixin for OverallPeriod - renames fields, removes extension
@Suppress("unused")
private abstract class OverallPeriodMixin {
    @JsonProperty("startTime")
    abstract fun getOverallStartTime(): Any?

    @JsonProperty("endTime")
    abstract fun getOverallEndTime(): Any?

    @JsonIgnore
    abstract fun getOverallPeriodExtension(): Any?
}

// Mixin for Impact - removes extension
@Suppress("unused")
private abstract class ImpactMixin {
    @JsonIgnore
    abstract fun getImpactExtension(): Any?
}

// Mixin for Cause - removes extension, renames detailed cause type to subtypes
@Suppress("unused")
private abstract class CauseMixin {
    @JsonIgnore
    abstract fun getCauseExtension(): Any?

    @JsonIgnore
    abstract fun getManagedCause(): Any?

    @JsonProperty("type")
    abstract fun getCauseType(): Any?

    @JsonProperty("subtypes")
    abstract fun getDetailedCauseType(): Any?
}

// DetailedCauseType - remove extension, shorten field names
@Suppress("unused")
private abstract class DetailedCauseTypeMixin {
    @JsonIgnore
    abstract fun getDetailedCauseTypeExtension(): Any?

    @JsonProperty("abnormalTraffic")
    abstract fun getAbnormalTrafficType(): Any?

    @JsonProperty("accident")
    abstract fun getAccidentType(): List<*>?

    @JsonProperty("disturbance")
    abstract fun getDisturbanceActivityType(): Any?

    @JsonProperty("environmental")
    abstract fun getEnvironmentalObstructionType(): Any?

    @JsonProperty("equipmentFault")
    abstract fun getEquipmentOrSystemFaultType(): Any?

    @JsonProperty("infrastructure")
    abstract fun getInfrastructureDamageType(): Any?

    @JsonProperty("obstruction")
    abstract fun getObstructionType(): List<*>?

    @JsonProperty("poorEnvironment")
    abstract fun getPoorEnvironmentType(): List<*>?

    @JsonProperty("publicEvent")
    abstract fun getPublicEventType(): Any?

    @JsonProperty("roadMaintenance")
    abstract fun getRoadMaintenanceType(): List<*>?

    @JsonProperty("laneManagement")
    abstract fun getRoadOrCarriagewayOrLaneManagementType(): Any?

    @JsonProperty("vehicleObstruction")
    abstract fun getVehicleObstructionType(): Any?
}

// ============ Location Mixins ============

// LocationReference - remove extension
@Suppress("unused")
private abstract class LocationReferenceMixin {
    @JsonIgnore
    abstract fun getLocationReferenceExtension(): Any?
}

// Location - remove extension
@Suppress("unused")
private abstract class LocationMixin {
    @JsonIgnore
    abstract fun getLocationExtension(): Any?

    @JsonProperty("coordinates")
    abstract fun getCoordinatesForDisplay(): Any?
}

// NetworkLocation - remove extension, unwrap supplementary description
@Suppress("unused")
private abstract class NetworkLocationMixin {
    @JsonIgnore
    abstract fun getNetworkLocationExtension(): Any?

    @JsonUnwrapped
    abstract fun getSupplementaryPositionalDescription(): Any?
}

// SupplementaryPositionalDescription - remove extension, shorten field names
@Suppress("unused")
private abstract class SupplementaryPositionalDescriptionMixin {
    @JsonIgnore
    abstract fun getSupplementaryPositionalDescriptionExtension(): Any?

    @JsonProperty("length")
    abstract fun getLengthAffected(): Float?

    @JsonProperty("description")
    abstract fun getLocationDescription(): Any?

    @JsonProperty("roads")
    abstract fun getRoadInformation(): List<*>?

    @JsonProperty("geographic")
    abstract fun getGeographicDescriptor(): Any?

    @JsonProperty("infrastructure")
    abstract fun getInfrastructureDescriptor(): Any?

    @JsonProperty("lanes")
    abstract fun getCarriageway(): List<*>?
}

// LinearLocation - remove extension
@Suppress("unused")
private abstract class LinearLocationMixin {
    @JsonIgnore
    abstract fun getLinearLocationExtension(): Any?
}

// SingleRoadLinearLocation - remove extension, rename tpegLinearLocation
@Suppress("unused")
private abstract class SingleRoadLinearLocationMixin {
    @JsonIgnore
    abstract fun getSingleRoadLinearLocationExtension(): Any?

    @JsonProperty("linear")
    abstract fun getTpegLinearLocation(): Any?
}

// PointLocation - remove extension
@Suppress("unused")
private abstract class PointLocationMixin {
    @JsonIgnore
    abstract fun getPointLocationExtension(): Any?

    @JsonProperty("point")
    abstract fun getTpegPointLocation(): Any?
}

// TpegLinearLocation - remove extension, rename direction, remove type
@Suppress("unused")
private abstract class TpegLinearLocationMixin {
    @JsonIgnore
    abstract fun getTpegLinearLocationExtension(): Any?

    @JsonProperty("direction")
    abstract fun getTpegDirection(): Any?

    @JsonIgnore
    abstract fun getTpegLinearLocationType(): Any?
}

// TpegPoint - remove extension
@Suppress("unused")
private abstract class TpegPointMixin {
    @JsonIgnore
    abstract fun getTpegPointExtension(): Any?
}

// TpegNonJunctionPoint - unwrap the extension to flatten Spanish data
@Suppress("unused")
private abstract class TpegNonJunctionPointMixin {
    @JsonProperty("coords")
    abstract fun getPointCoordinates(): Any?

    @JsonUnwrapped
    abstract fun getTpegNonJunctionPointExtension(): Any?
}

// TpegNonJunctionPointExtensionType - unwrap extendedTpegNonJunctionPoint, ignore 'any'
@Suppress("unused")
private abstract class TpegNonJunctionPointExtensionMixin {
    @JsonIgnore
    abstract fun getAny(): List<*>?

    @JsonUnwrapped
    abstract fun getExtendedTpegNonJunctionPoint(): Any?
}

// ExtendedTpegNonJunctionPoint - rename fields
@Suppress("unused")
private abstract class ExtendedTpegNonJunctionPointMixin {
    @JsonProperty("state")
    abstract fun getAutonomousCommunity(): String?

    @JsonProperty("km")
    abstract fun getKilometerPoint(): Float
}

// RoadInformation - remove extension, rename roadName to name
@Suppress("unused")
private abstract class RoadInformationMixin {
    @JsonIgnore
    abstract fun getRoadInformationExtension(): Any?

    @JsonProperty("name")
    abstract fun getRoadName(): String?

    @JsonProperty("number")
    abstract fun getRoadNumber(): String?

    @JsonProperty("destination")
    abstract fun getRoadDestination(): String?
}

// TpegPointLocation - remove extension, rename tpegDirection to direction
@Suppress("unused")
private abstract class TpegPointLocationMixin {
    @JsonIgnore
    abstract fun getTpegPointLocationExtension(): Any?

    @JsonProperty("direction")
    abstract fun getTpegDirection(): Any?
}

// TpegSimplePoint - remove extension, flatten point, remove type
@Suppress("unused")
private abstract class TpegSimplePointMixin {
    @JsonIgnore
    abstract fun getTpegSimplePointExtension(): Any?

    @JsonIgnore
    abstract fun getTpegSimplePointLocationType(): Any?

    @JsonUnwrapped
    abstract fun getPoint(): Any?
}

// PointCoordinates - remove extension and precision metadata, keep only lat/lon
@Suppress("unused")
private abstract class PointCoordinatesMixin {
    @JsonIgnore
    abstract fun getPointCoordinatesExtension(): Any?

    @JsonIgnore
    abstract fun getHeightCoordinate(): List<*>?

    @JsonIgnore
    abstract fun getPositionConfidenceEllipse(): Any?

    @JsonIgnore
    abstract fun getHorizontalPositionAccuracy(): Any?

    @JsonProperty("lat")
    abstract fun getLatitude(): Float

    @JsonProperty("lon")
    abstract fun getLongitude(): Float
}

// ============ Obstruction Mixins ============

// TrafficElement - remove extension
@Suppress("unused")
private abstract class TrafficElementMixin {
    @JsonIgnore
    abstract fun getTrafficElementExtension(): Any?
}

// Obstruction - remove extension, rename fields
@Suppress("unused")
private abstract class ObstructionMixin {
    @JsonIgnore
    abstract fun getObstructionExtension(): Any?

    @JsonProperty("count")
    abstract fun getNumberOfObstructions(): Any?

    @JsonProperty("mobility")
    abstract fun getMobilityOfObstruction(): Any?
}

// GeneralObstruction - remove extension, rename obstructionType to types
@Suppress("unused")
private abstract class GeneralObstructionMixin {
    @JsonIgnore
    abstract fun getGeneralObstructionExtension(): Any?

    @JsonProperty("types")
    abstract fun getObstructionType(): List<*>?
}

// Mobility - flatten to just the value
@Suppress("unused")
private abstract class MobilityMixin {
    @JsonIgnore
    abstract fun getMobilityExtension(): Any?

    @JsonValue
    abstract fun getMobilityType(): Any?
}

// VehicleObstruction - remove extension, rename type
@Suppress("unused")
private abstract class VehicleObstructionMixin {
    @JsonIgnore
    abstract fun getVehicleObstructionExtension(): Any?

    @JsonProperty("type")
    abstract fun getVehicleObstructionType(): Any?
}

// AnimalPresenceObstruction - remove extension, rename type
@Suppress("unused")
private abstract class AnimalPresenceObstructionMixin {
    @JsonIgnore
    abstract fun getAnimalPresenceObstructionExtension(): Any?

    @JsonProperty("type")
    abstract fun getAnimalPresenceType(): Any?
}

// ============ Conditions Mixins ============

// Conditions - remove extension
@Suppress("unused")
private abstract class ConditionsMixin {
    @JsonIgnore
    abstract fun getConditionsExtension(): Any?
}

// PoorEnvironmentConditions - remove extension, rename type
@Suppress("unused")
private abstract class PoorEnvironmentConditionsMixin {
    @JsonIgnore
    abstract fun getPoorEnvironmentConditionsExtension(): Any?

    @JsonProperty("types")
    abstract fun getPoorEnvironmentType(): List<*>?
}

// RoadSurfaceConditions - remove extension
@Suppress("unused")
private abstract class RoadSurfaceConditionsMixin {
    @JsonIgnore
    abstract fun getRoadSurfaceConditionsExtension(): Any?
}

// NonWeatherRelatedRoadConditions - remove extension, rename type
@Suppress("unused")
private abstract class NonWeatherRelatedRoadConditionsMixin {
    @JsonIgnore
    abstract fun getNonWeatherRelatedRoadConditionsExtension(): Any?

    @JsonProperty("types")
    abstract fun getNonWeatherRelatedRoadConditionType(): List<*>?
}

// ============ Traffic Mixins ============

// AbnormalTraffic - remove extension, rename type
@Suppress("unused")
private abstract class AbnormalTrafficMixin {
    @JsonIgnore
    abstract fun getAbnormalTrafficExtension(): Any?

    @JsonProperty("type")
    abstract fun getAbnormalTrafficType(): Any?
}

// ============ OperatorAction Mixins ============

// OperatorAction - remove extension
@Suppress("unused")
private abstract class OperatorActionMixin {
    @JsonIgnore
    abstract fun getOperatorActionExtension(): Any?
}

// Roadworks - remove extension
@Suppress("unused")
private abstract class RoadworksMixin {
    @JsonIgnore
    abstract fun getRoadworksExtension(): Any?
}

// MaintenanceWorks - remove extension, rename type
@Suppress("unused")
private abstract class MaintenanceWorksMixin {
    @JsonIgnore
    abstract fun getMaintenanceWorksExtension(): Any?

    @JsonProperty("types")
    abstract fun getRoadMaintenanceType(): List<*>?
}

// ============ NetworkManagement Mixins ============

// NetworkManagement - remove extension, rename fields
@Suppress("unused")
private abstract class NetworkManagementMixin {
    @JsonIgnore
    abstract fun getNetworkManagementExtension(): Any?

    @JsonProperty("compliance")
    abstract fun getComplianceOption(): Any?

    @JsonProperty("vehicles")
    abstract fun getForVehiclesWithCharacteristicsOf(): List<*>?
}

// RoadOrCarriagewayOrLaneManagement - remove extension, rename fields
@Suppress("unused")
private abstract class RoadOrCarriagewayOrLaneManagementMixin {
    @JsonIgnore
    abstract fun getRoadOrCarriagewayOrLaneManagementExtension(): Any?

    @JsonProperty("type")
    abstract fun getRoadOrCarriagewayOrLaneManagementType(): Any?

    @JsonProperty("minOccupancy")
    abstract fun getMinimumCarOccupancy(): Any?
}

// SpeedManagement - remove extension, rename fields
@Suppress("unused")
private abstract class SpeedManagementMixin {
    @JsonIgnore
    abstract fun getSpeedManagementExtension(): Any?

    @JsonProperty("type")
    abstract fun getSpeedManagementType(): Any?

    @JsonProperty("speedLimit")
    abstract fun getTemporarySpeedLimit(): Float?
}

// GeneralInstructionOrMessageToRoadUsers - remove extension, rename fields
@Suppress("unused")
private abstract class GeneralInstructionMixin {
    @JsonIgnore
    abstract fun getGeneralInstructionOrMessageToRoadUsersExtension(): Any?

    @JsonProperty("type")
    abstract fun getGeneralInstructionToRoadUsersType(): Any?

    @JsonProperty("message")
    abstract fun getGeneralMessageToRoadUsers(): Any?
}

// ============ Delays Mixin ============

// Delays - remove extension, rename delayTimeValue to delay
@Suppress("unused")
private abstract class DelaysMixin {
    @JsonIgnore
    abstract fun getDelaysExtension(): Any?

    @JsonProperty("delay")
    abstract fun getDelayTimeValue(): Float?
}

// ============ Source Mixin ============

// Source - flatten to just the identification string
@Suppress("unused")
private abstract class SourceMixin {
    @JsonIgnore
    abstract fun getSourceExtension(): Any?

    @JsonValue
    abstract fun getSourceIdentification(): String?
}

// ============ VehicleCharacteristics Mixins ============

// VehicleCharacteristics - remove extension, shorten field names
@Suppress("unused")
private abstract class VehicleCharacteristicsMixin {
    @JsonIgnore
    abstract fun getVehicleCharacteristicsExtension(): Any?

    @JsonProperty("load")
    abstract fun getLoadType(): Any?

    @JsonProperty("equipment")
    abstract fun getVehicleEquipment(): Any?

    @JsonProperty("types")
    abstract fun getVehicleType(): List<*>?

    @JsonProperty("grossWeight")
    abstract fun getGrossWeightCharacteristic(): List<*>?

    @JsonProperty("height")
    abstract fun getHeightCharacteristic(): List<*>?

    @JsonProperty("length")
    abstract fun getLengthCharacteristic(): List<*>?

    @JsonProperty("width")
    abstract fun getWidthCharacteristic(): List<*>?

    @JsonProperty("axleWeight")
    abstract fun getHeaviestAxleWeightCharacteristic(): List<*>?
}

// ============ Characteristic Mixins ============

// GrossWeightCharacteristic - remove extension, shorten names
@Suppress("unused")
private abstract class GrossWeightCharacteristicMixin {
    @JsonIgnore
    abstract fun getGrossWeightCharacteristicExtension(): Any?

    @JsonProperty("operator")
    abstract fun getComparisonOperator(): Any?

    @JsonProperty("weight")
    abstract fun getGrossVehicleWeight(): Float

    @JsonProperty("type")
    abstract fun getTypeOfWeight(): Any?
}

// HeightCharacteristic - remove extension, shorten names
@Suppress("unused")
private abstract class HeightCharacteristicMixin {
    @JsonIgnore
    abstract fun getHeightCharacteristicExtension(): Any?

    @JsonProperty("operator")
    abstract fun getComparisonOperator(): Any?

    @JsonProperty("value")
    abstract fun getVehicleHeight(): Float
}

// LengthCharacteristic - remove extension, shorten names
@Suppress("unused")
private abstract class LengthCharacteristicMixin {
    @JsonIgnore
    abstract fun getLengthCharacteristicExtension(): Any?

    @JsonProperty("operator")
    abstract fun getComparisonOperator(): Any?

    @JsonProperty("value")
    abstract fun getVehicleLength(): Float
}

// WidthCharacteristic - remove extension, shorten names
@Suppress("unused")
private abstract class WidthCharacteristicMixin {
    @JsonIgnore
    abstract fun getWidthCharacteristicExtension(): Any?

    @JsonProperty("operator")
    abstract fun getComparisonOperator(): Any?

    @JsonProperty("value")
    abstract fun getVehicleWidth(): Float
}

// HeaviestAxleWeightCharacteristic - remove extension, shorten names
@Suppress("unused")
private abstract class HeaviestAxleWeightCharacteristicMixin {
    @JsonIgnore
    abstract fun getHeaviestAxleWeightCharacteristicExtension(): Any?

    @JsonProperty("operator")
    abstract fun getComparisonOperator(): Any?

    @JsonProperty("weight")
    abstract fun getHeaviestAxleWeight(): Float
}

// ============ Emissions Mixin ============

// Emissions - remove extension, shorten field name
@Suppress("unused")
private abstract class EmissionsMixin {
    @JsonIgnore
    abstract fun getEmissionsExtension(): Any?

    @JsonProperty("classification")
    abstract fun getEmissionClassificationOther(): List<String>?
}

private val jaxbContext: JAXBContext = JAXBContext.newInstance(
    com.beacon.schema.payload.ObjectFactory::class.java,
    com.beacon.schema.situation.ObjectFactory::class.java,
    com.beacon.schema.common.ObjectFactory::class.java
)

// Track published records by "recordId:version" to avoid duplicates
private val publishedRecords = ConcurrentHashMap.newKeySet<String>()

// Track scheduled records to avoid scheduling duplicates
private val scheduledRecords = ConcurrentHashMap.newKeySet<String>()

fun main() {
    val mqttClient = createMqttClient()
    val scheduler = Executors.newScheduledThreadPool(4)

    Runtime.getRuntime().addShutdownHook(Thread {
        scheduler.shutdown()
        mqttClient.disconnect()
    })

    scheduler.scheduleAtFixedRate(
        { pollAndSchedule(mqttClient, scheduler) },
        0,
        POLL_INTERVAL_SECONDS,
        TimeUnit.SECONDS
    )

    Thread.currentThread().join()
}

private fun createMqttClient(): MqttClient {
    val persistence = MemoryPersistence()
    val client = MqttClient(MQTT_BROKER, MQTT_CLIENT_ID, persistence)

    val options = MqttConnectOptions().apply {
        isCleanSession = true
        connectionTimeout = 10
        isAutomaticReconnect = true
    }

    client.connect(options)
    println("Connected to MQTT broker")
    return client
}

private fun pollAndSchedule(mqttClient: MqttClient, scheduler: ScheduledExecutorService) {
    try {
        val xml = fetchXml(DATEX_URL)
        val publication = parseXml(xml)

        if (publication is SituationPublication) {
            processPublication(publication, mqttClient, scheduler)
        }
    } catch (e: Exception) {
        println("[${Instant.now()}] Error during poll: ${e.message}")
    }
}

private fun fetchXml(url: String): String {
    val client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build()

    val request = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .header("Accept", "application/xml")
        .timeout(Duration.ofSeconds(30))
        .GET()
        .build()

    val response = client.send(request, HttpResponse.BodyHandlers.ofString())

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

private fun processPublication(
    publication: SituationPublication,
    mqttClient: MqttClient,
    scheduler: ScheduledExecutorService
) {
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
                val delay = Duration.between(now, publishTime).toMillis()
                scheduledRecords.add(recordKey)

                scheduler.schedule(
                    { publishRecord(mqttClient, record, recordKey) },
                    delay,
                    TimeUnit.MILLISECONDS
                )
                scheduledCount++
            } else {
                publishRecord(mqttClient, record, recordKey)
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

private fun publishRecord(mqttClient: MqttClient, record: SituationRecord, recordKey: String) {
    try {
        val province = record.extractProvince().normalizeForTopic()
        val recordType = when (record) {
            is GenericSituationRecord -> {
                val causeType = record.cause?.causeType?.value?.value() ?: "unknown"
                "causes/${causeType.toSnakeCase()}"
            }
            else -> {
                record::class.java.simpleName.toSnakeCase()
            }
        }
        val topic = "$MQTT_TOPIC_PREFIX/$province/$recordType"

        val json = objectMapper.writeValueAsString(record)

        val message = MqttMessage(json.toByteArray()).apply {
            qos = 1
            isRetained = false
        }

        mqttClient.publish(topic, message)

        scheduledRecords.remove(recordKey)
        publishedRecords.add(recordKey)

        val startTime = record.validity.validityTimeSpecification.overallStartTime
    } catch (e: Exception) {
        scheduledRecords.remove(recordKey)
    }
}

private fun XMLGregorianCalendar.toInstant(): Instant {
    return this.toGregorianCalendar().toZonedDateTime().toInstant()
}

private fun String.toSnakeCase(): String {
    return this.replace(Regex("([a-z])([A-Z])"), "$1_$2").lowercase()
}

private fun String.normalizeForTopic(): String {
    return this
        .split("/").first()          // Take first part if has alternatives (e.g., "València/Valencia" -> "València")
        .replace(" ", "_")            // Replace spaces with underscores
        .lowercase()
}

private fun SituationRecord.extractProvince(): String {
    return when (val location = this.locationReference) {
        // Linear location (e.g., road segment)
        is SingleRoadLinearLocation -> {
            val tpegLocation = location.tpegLinearLocation ?: return "unknown"

            // Try 'from' point
            val fromPoint = tpegLocation.from as? TpegNonJunctionPoint
            val fromProvince = fromPoint?.tpegNonJunctionPointExtension?.extendedTpegNonJunctionPoint?.province
            if (fromProvince != null) return fromProvince

            // Try 'to' point
            val toPoint = tpegLocation.to as? TpegNonJunctionPoint
            val toProvince = toPoint?.tpegNonJunctionPointExtension?.extendedTpegNonJunctionPoint?.province
            if (toProvince != null) return toProvince

            "unknown"
        }

        // Point location (e.g., single point on road)
        is PointLocation -> {
            val tpegPointLocation = location.tpegPointLocation ?: return "unknown"

            // TpegSimplePoint contains the actual point
            val simplePoint = tpegPointLocation as? TpegSimplePoint
            val point = simplePoint?.point as? TpegNonJunctionPoint
            val province = point?.tpegNonJunctionPointExtension?.extendedTpegNonJunctionPoint?.province
            if (province != null) return province

            "unknown"
        }

        else -> "unknown"
    }
}


