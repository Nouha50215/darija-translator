#!/usr/bin/env bash
# cURL smoke test for the running service.
# Usage: ./test-api.sh [baseUrl] [user:password]
BASE="${1:-http://localhost:8080/translator/api}"
CREDS="${2:-student:darija2026}"

echo "== 1. Health (public)"
curl -s "$BASE/health"; echo; echo

echo "== 2. Translate (POST, Arabic script)"
curl -s -u "$CREDS" -H "Content-Type: application/json" \
     -d '{"text":"Good morning, how are you today?","sourceLanguage":"English"}' \
     "$BASE/translate"; echo; echo

echo "== 3. Translate (GET, Latin script)"
curl -s -u "$CREDS" -G "$BASE/translate" \
     --data-urlencode "text=I am very hungry, let's eat couscous" \
     --data-urlencode "script=latin"; echo; echo

echo "== 4. No credentials -> expect 401"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "Content-Type: application/json" \
     -d '{"text":"Hello"}' "$BASE/translate"; echo

echo "== 5. Wrong password -> expect 401"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -u "student:wrong" -H "Content-Type: application/json" \
     -d '{"text":"Hello"}' "$BASE/translate"; echo

echo "== 6. Empty text -> expect 400"
curl -s -u "$CREDS" -H "Content-Type: application/json" -d '{"text":""}' "$BASE/translate"; echo
