# Etapa de construcción con GraalVM
FROM ghcr.io/graalvm/graalvm-community:21 AS builder

WORKDIR /app

# Instalar herramientas necesarias
RUN microdnf install -y findutils git

# Copiar archivos de configuración de Gradle
COPY gradle/ ./gradle/
COPY gradlew ./
COPY gradlew.bat ./
COPY gradle.properties ./
COPY settings.gradle.kts ./

# Copiar archivos de configuración de dependencias
COPY gradle/libs.versions.toml ./gradle/

# Copiar código fuente del proyecto
COPY app/build.gradle.kts ./app/
COPY app/src/ ./app/src/

# Construir la aplicación e instalar la distribución
RUN ./gradlew :app:installDist --no-daemon

# Etapa de ejecución con GraalVM
FROM ghcr.io/graalvm/graalvm-community:21

WORKDIR /app

# Copiar la distribución instalada desde la etapa de construcción
COPY --from=builder /app/app/build/install/app/ ./

# Ejecutar la aplicación directamente con java usando el classpath completo
# installDist crea lib/ con todos los JARs (dependencias + aplicación)
ENTRYPOINT ["sh", "-c", "java -cp \"lib/*\" org.beacon.FeedKt"]
