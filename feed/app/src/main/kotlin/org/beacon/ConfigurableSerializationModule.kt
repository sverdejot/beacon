package org.beacon

import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.databind.BeanDescription
import com.fasterxml.jackson.databind.JavaType
import com.fasterxml.jackson.databind.JsonSerializer
import com.fasterxml.jackson.databind.SerializationConfig
import com.fasterxml.jackson.databind.SerializerProvider
import com.fasterxml.jackson.databind.module.SimpleModule
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper

data class ClassMapping(
    val ignore: List<String> = emptyList(),
    val rename: Map<String, String> = emptyMap(),
    val unwrap: List<String> = emptyList(),
    val flattenEnumValues: List<String> = emptyList()
)

data class MappingConfig(
    val mappings: Map<String, ClassMapping> = emptyMap(),
    val valueOnly: Map<String, String> = emptyMap(),
    val enums: List<String> = emptyList()
)

class ConfigurableSerializationModule(configPath: String) : SimpleModule() {
    private val config: MappingConfig

    init {
        val yamlMapper = YAMLMapper()
        val stream = javaClass.getResourceAsStream(configPath)
            ?: throw IllegalArgumentException("Config not found: $configPath")
        config = yamlMapper.readValue(stream, MappingConfig::class.java)
    }

    override fun setupModule(context: SetupContext) {
        super.setupModule(context)
        context.addBeanSerializerModifier(ConfigurableSerializerModifier(config))
    }

    fun getConfig(): MappingConfig = config
}

private class ConfigurableSerializerModifier(
    private val config: MappingConfig
) : BeanSerializerModifier() {

    // Get merged mapping from class and all its superclasses/interfaces
    private fun getMergedMapping(clazz: Class<*>): ClassMapping? {
        val ignore = mutableSetOf<String>()
        val rename = mutableMapOf<String, String>()
        val unwrap = mutableSetOf<String>()
        val flattenEnumValues = mutableListOf<String>()
        var foundAny = false

        // Walk up the class hierarchy
        var current: Class<*>? = clazz
        while (current != null && current != Any::class.java) {
            config.mappings[current.simpleName]?.let { mapping ->
                foundAny = true
                ignore.addAll(mapping.ignore)
                rename.putAll(mapping.rename)
                unwrap.addAll(mapping.unwrap)
                if (mapping.flattenEnumValues.isNotEmpty()) {
                    flattenEnumValues.addAll(mapping.flattenEnumValues)
                }
            }
            // Also check interfaces
            for (iface in current.interfaces) {
                config.mappings[iface.simpleName]?.let { mapping ->
                    foundAny = true
                    ignore.addAll(mapping.ignore)
                    rename.putAll(mapping.rename)
                    unwrap.addAll(mapping.unwrap)
                }
            }
            current = current.superclass
        }

        return if (foundAny) {
            ClassMapping(ignore.toList(), rename, unwrap.toList(), flattenEnumValues)
        } else null
    }

    override fun changeProperties(
        config: SerializationConfig,
        beanDesc: BeanDescription,
        beanProperties: MutableList<BeanPropertyWriter>
    ): MutableList<BeanPropertyWriter> {
        val mapping = getMergedMapping(beanDesc.beanClass) ?: return beanProperties

        val result = mutableListOf<BeanPropertyWriter>()

        for (writer in beanProperties) {
            val propertyName = writer.name

            // Skip ignored properties
            if (propertyName in mapping.ignore) continue

            // Handle unwrapped properties
            if (propertyName in mapping.unwrap) {
                result.add(UnwrappingPropertyWriter(writer, this.config))
                continue
            }

            // Handle renamed properties
            val newName = mapping.rename[propertyName]
            if (newName != null) {
                result.add(RenamedPropertyWriter(writer, newName))
            } else {
                result.add(writer)
            }
        }

        return result
    }

    override fun modifySerializer(
        config: SerializationConfig,
        beanDesc: BeanDescription,
        serializer: JsonSerializer<*>
    ): JsonSerializer<*> {
        val mapping = getMergedMapping(beanDesc.beanClass)

        // Handle flattenEnumValues - serialize as array of enum value strings
        if (mapping != null && mapping.flattenEnumValues.isNotEmpty()) {
            @Suppress("UNCHECKED_CAST")
            return FlattenEnumValuesSerializer(mapping.flattenEnumValues) as JsonSerializer<Any>
        }

        // Handle valueOnly classes - check class hierarchy
        for (clazz in generateSequence(beanDesc.beanClass) { it.superclass }) {
            val valueProperty = this.config.valueOnly[clazz.simpleName]
            if (valueProperty != null) {
                @Suppress("UNCHECKED_CAST")
                return ValueOnlySerializer(valueProperty) as JsonSerializer<Any>
            }
        }

        // Handle enums - check class hierarchy
        for (clazz in generateSequence(beanDesc.beanClass) { it.superclass }) {
            if (clazz.simpleName in this.config.enums) {
                @Suppress("UNCHECKED_CAST")
                return EnumValueSerializer() as JsonSerializer<Any>
            }
        }

        return serializer
    }
}

private class RenamedPropertyWriter(
    delegate: BeanPropertyWriter,
    private val newName: String
) : BeanPropertyWriter(delegate) {
    override fun getName(): String = newName
    override fun serializeAsField(bean: Any, gen: JsonGenerator, prov: SerializerProvider) {
        val value = get(bean) ?: return
        gen.writeFieldName(newName)
        prov.defaultSerializeValue(value, gen)
    }
}

private class UnwrappingPropertyWriter(
    private val delegate: BeanPropertyWriter,
    private val config: MappingConfig
) : BeanPropertyWriter(delegate) {

    override fun serializeAsField(bean: Any, gen: JsonGenerator, prov: SerializerProvider) {
        val value = delegate.get(bean) ?: return

        // Serialize the unwrapped object's properties directly
        val beanClass = value::class.java
        val className = beanClass.simpleName
        val mapping = config.mappings[className]

        for (method in beanClass.methods) {
            if (!method.name.startsWith("get") || method.name == "getClass") continue
            if (method.parameterCount > 0) continue

            val rawPropertyName = method.name.removePrefix("get").replaceFirstChar { it.lowercase() }

            // Skip ignored properties
            if (mapping != null && rawPropertyName in mapping.ignore) continue

            // Handle recursively unwrapped properties
            if (mapping != null && rawPropertyName in mapping.unwrap) {
                val nestedValue = method.invoke(value) ?: continue
                serializeUnwrapped(nestedValue, gen, prov)
                continue
            }

            val propertyName = mapping?.rename?.get(rawPropertyName) ?: rawPropertyName
            val propertyValue = method.invoke(value) ?: continue

            // Skip empty collections
            if (propertyValue is Collection<*> && propertyValue.isEmpty()) continue

            gen.writeFieldName(propertyName)
            prov.defaultSerializeValue(propertyValue, gen)
        }
    }

    private fun serializeUnwrapped(value: Any, gen: JsonGenerator, prov: SerializerProvider) {
        val beanClass = value::class.java
        val className = beanClass.simpleName
        val mapping = config.mappings[className]

        for (method in beanClass.methods) {
            if (!method.name.startsWith("get") || method.name == "getClass") continue
            if (method.parameterCount > 0) continue

            val rawPropertyName = method.name.removePrefix("get").replaceFirstChar { it.lowercase() }

            // Skip ignored properties
            if (mapping != null && rawPropertyName in mapping.ignore) continue

            // Handle recursively unwrapped properties
            if (mapping != null && rawPropertyName in mapping.unwrap) {
                val nestedValue = method.invoke(value) ?: continue
                serializeUnwrapped(nestedValue, gen, prov)
                continue
            }

            val propertyName = mapping?.rename?.get(rawPropertyName) ?: rawPropertyName
            val propertyValue = method.invoke(value) ?: continue

            // Skip empty collections
            if (propertyValue is Collection<*> && propertyValue.isEmpty()) continue

            gen.writeFieldName(propertyName)
            prov.defaultSerializeValue(propertyValue, gen)
        }
    }
}

private class ValueOnlySerializer(private val propertyName: String) : JsonSerializer<Any>() {
    override fun serialize(value: Any, gen: JsonGenerator, serializers: SerializerProvider) {
        val getterName = "get${propertyName.replaceFirstChar { it.uppercase() }}"
        val method = value::class.java.getMethod(getterName)
        val propertyValue = method.invoke(value)

        if (propertyValue != null) {
            serializers.defaultSerializeValue(propertyValue, gen)
        } else {
            gen.writeNull()
        }
    }
}

private class EnumValueSerializer : JsonSerializer<Any>() {
    override fun serialize(value: Any, gen: JsonGenerator, serializers: SerializerProvider) {
        // These enums have a getValue() method that returns another enum with value()
        val getValueMethod = value::class.java.getMethod("getValue")
        val innerValue = getValueMethod.invoke(value)

        if (innerValue != null) {
            val valueMethod = innerValue::class.java.getMethod("value")
            val stringValue = valueMethod.invoke(innerValue)
            gen.writeString(stringValue as String)
        } else {
            gen.writeNull()
        }
    }
}

private class FlattenEnumValuesSerializer(
    private val fieldNames: List<String>
) : JsonSerializer<Any>() {
    override fun serialize(value: Any, gen: JsonGenerator, serializers: SerializerProvider) {
        val results = mutableListOf<String>()
        val clazz = value::class.java

        for (fieldName in fieldNames) {
            val getterName = "get${fieldName.replaceFirstChar { it.uppercase() }}"
            try {
                val method = clazz.getMethod(getterName)
                val fieldValue = method.invoke(value) ?: continue

                // Handle lists (e.g., accidentType is a List)
                if (fieldValue is List<*>) {
                    for (item in fieldValue) {
                        extractEnumValue(item)?.let { results.add(it) }
                    }
                } else {
                    // Handle single values
                    extractEnumValue(fieldValue)?.let { results.add(it) }
                }
            } catch (_: NoSuchMethodException) {
                // Field doesn't exist, skip
            }
        }

        gen.writeObject(results)
    }

    private fun extractEnumValue(wrapper: Any?): String? {
        if (wrapper == null) return null
        return try {
            // These are enum wrappers with getValue() -> inner enum with value()
            val getValueMethod = wrapper::class.java.getMethod("getValue")
            val innerValue = getValueMethod.invoke(wrapper) ?: return null
            val valueMethod = innerValue::class.java.getMethod("value")
            valueMethod.invoke(innerValue) as? String
        } catch (_: Exception) {
            null
        }
    }
}
