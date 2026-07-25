# Multi-stage Docker build for Spring Boot Backend (Root directory context)
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy dependency definition from backend directory
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B || true

# Copy source code and package application
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Final runtime image
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy built artifact from builder stage
COPY --from=builder /app/target/attendease-backend-1.0.0.jar app.jar

ENV PORT=8138
EXPOSE 8138

ENTRYPOINT ["java", "-jar", "app.jar"]
