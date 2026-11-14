#!/usr/bin/env bash
# Lo mismo que query_remote.py pero con la REST API (SSE). Útil desde cualquier lenguaje.
set -euo pipefail
: "${GOOGLE_CLOUD_PROJECT:?}" "${AGENT_ENGINE_ID:?}"
LOCATION="${GOOGLE_CLOUD_LOCATION:-us-central1}"

curl -sS -N \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT}/locations/${LOCATION}/reasoningEngines/${AGENT_ENGINE_ID}:streamQuery?alt=sse" \
  -d '{"class_method": "async_stream_query", "input": {"user_id": "cus_7781", "message": "¿Dónde está mi pedido 4821?"}}'
