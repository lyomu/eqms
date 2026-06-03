# Multi-stage build for the eQMS API (Java 21 LTS + Spring Boot 3.2).
# Stage 1: build the fat jar with Maven.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
# Copy the reactor so eqms-api can resolve eqms-shared from source.
COPY pom.xml .
COPY eqms-shared eqms-shared
COPY eqms-api eqms-api
COPY eqms-cli eqms-cli
RUN mvn -q -pl eqms-api -am -DskipTests package

# Stage 2: minimal runtime image (JRE only).
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
# NTP-synced host clock is a deployment prerequisite (compliance rule 3 — server UTC time).
COPY --from=build /workspace/eqms-api/target/eqms-api-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
