#!/usr/bin/env bash
set -e

echo "=== Installing Java 17 JDK for Render ==="
if [ ! -f "$PWD/.jdk/bin/java" ]; then
  echo "Downloading Eclipse Temurin OpenJDK 17..."
  rm -rf .jdk
  mkdir -p .jdk
  curl -sL "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz" | tar -xz -C .jdk --strip-components=1
fi

export JAVA_HOME="$PWD/.jdk"
export PATH="$JAVA_HOME/bin:$PATH"

echo "Java environment ready:"
java -version

echo "=== Building Spring Boot Backend ==="
chmod +x mvnw
./mvnw clean package -DskipTests
