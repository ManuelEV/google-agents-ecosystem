#!/usr/bin/env bash
# Registrar el agente desplegado en Agent Runtime dentro de una app de Gemini Enterprise (REST).
# Equivale a: consola → Gemini Enterprise → app → Agents → Add agent → Custom agent via Agent Runtime.
# Requiere rol Gemini Enterprise Admin (discoveryengine.agentspaceAdmin) y Discovery Engine API.
set -euo pipefail
: "${GOOGLE_CLOUD_PROJECT:?}" "${AGENT_ENGINE_ID:?}" "${GE_APP_ID:?define GE_APP_ID (ID de la app de Gemini Enterprise)}"
LOCATION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
ENDPOINT_LOCATION="${GE_ENDPOINT_LOCATION:-global}"   # us | eu | global (debe ser coherente con la región del agente)

curl -sS -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "X-Goog-User-Project: ${GOOGLE_CLOUD_PROJECT}" \
  "https://${ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1alpha/projects/${GOOGLE_CLOUD_PROJECT}/locations/global/collections/default_collection/engines/${GE_APP_ID}/assistants/default_assistant/agents" \
  -d @- <<EOF
{
  "displayName": "Andi · Operaciones",
  "description": "Consulta pedidos, envíos, devoluciones y stock de Andes Market. Úsalo para cualquier pregunta operativa de clientes o del equipo interno.",
  "adkAgentDefinition": {
    "provisionedReasoningEngine": {
      "reasoningEngine": "projects/${GOOGLE_CLOUD_PROJECT}/locations/${LOCATION}/reasoningEngines/${AGENT_ENGINE_ID}"
    }
  }
}
EOF
# Cuota: cada registro consume 1 unidad diaria por licencia (Standard: 1/usuario/día). En CI/CD puede devolver 429.
