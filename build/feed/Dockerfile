FROM ghcr.io/graalvm/graalvm-community:21 AS builder
WORKDIR /app
RUN microdnf install -y findutils git
COPY feed/gradle/ ./gradle/
COPY feed/gradlew ./
COPY feed/gradlew.bat ./
COPY feed/gradle.properties ./
COPY feed/settings.gradle.kts ./
COPY feed/gradle/libs.versions.toml ./gradle/
COPY feed/app/build.gradle.kts ./app/
COPY feed/app/src/ ./app/src/
RUN ./gradlew :app:installDist --no-daemon

FROM ghcr.io/graalvm/graalvm-community:21
WORKDIR /app
COPY --from=builder /app/app/build/install/app/ ./
ENTRYPOINT ["sh", "-c", "java -cp \"lib/*\" org.beacon.FeedKt"]
