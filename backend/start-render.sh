#!/usr/bin/env bash
export JAVA_HOME="$PWD/.jdk"
export PATH="$JAVA_HOME/bin:$PATH"

exec java -jar target/attendease-backend-1.0.0.jar
