#!/usr/bin/env bash
# Builds the WAR and runs it on Payara Micro (an embeddable Jakarta EE runtime, single jar).
# Usage:
#   export GEMINI_API_KEY=your_key            # or: export LLM_PROVIDER=ollama
#   export TRANSLATOR_USERS="student:darija2026"
#   ./run-payara-micro.sh
set -euo pipefail
cd "$(dirname "$0")"

PAYARA_VERSION="${PAYARA_VERSION:-6.2024.6}"
JAR="payara-micro-${PAYARA_VERSION}.jar"
PORT="${PORT:-8080}"

if [ ! -f "$JAR" ]; then
  echo "Downloading Payara Micro ${PAYARA_VERSION}..."
  curl -fL -o "$JAR" \
    "https://repo1.maven.org/maven2/fish/payara/extras/payara-micro/${PAYARA_VERSION}/payara-micro-${PAYARA_VERSION}.jar"
fi

mvn -q clean package

echo "Starting on http://localhost:${PORT}/translator/api ..."
exec java -jar "$JAR" --deploy target/translator.war --port "$PORT" --nocluster
