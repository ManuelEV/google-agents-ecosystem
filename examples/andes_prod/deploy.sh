#!/usr/bin/env bash
# Despliegue de andes_prod en Agent Runtime (antes: Vertex AI Agent Engine).
# Ejecutar desde examples/ con el entorno activado.
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?define GOOGLE_CLOUD_PROJECT}"
: "${GOOGLE_CLOUD_LOCATION:=us-central1}"
STAGING_BUCKET="gs://${GOOGLE_CLOUD_PROJECT}-agents-staging"

# 1) Autenticación y proyecto
gcloud auth login
gcloud auth application-default login
gcloud config set project "$GOOGLE_CLOUD_PROJECT"

# 2) APIs necesarias (Agent Platform = aiplatform; Resource Manager; Model Armor opcional)
gcloud services enable aiplatform.googleapis.com cloudresourcemanager.googleapis.com modelarmor.googleapis.com

# 3) Bucket de staging para el código del agente
gcloud storage buckets create "$STAGING_BUCKET" --location="$GOOGLE_CLOUD_LOCATION" 2>/dev/null || true

# 4) Variables de entorno que viajan con el agente
cat > andes_prod/.env <<EOF
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}
GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION}
TOOLBOX_URL=${TOOLBOX_URL:-https://toolbox-xxxxx-uc.a.run.app}
CARRIER_MCP_URL=${CARRIER_MCP_URL:-https://carrier-mcp-xxxxx-uc.a.run.app/mcp}
MODEL_ARMOR_PROMPT_TEMPLATE=${MODEL_ARMOR_PROMPT_TEMPLATE:-}
MODEL_ARMOR_RESPONSE_TEMPLATE=${MODEL_ARMOR_RESPONSE_TEMPLATE:-}
EOF

# 5) Desplegar. --otel_to_cloud envía trazas a Cloud Trace (sin contenido de mensajes por defecto).
#    .agent_engine_config.json ({"identity_type": "AGENT_IDENTITY"}) le da identidad propia al agente.
adk deploy agent_engine \
  --project="$GOOGLE_CLOUD_PROJECT" \
  --region="$GOOGLE_CLOUD_LOCATION" \
  --staging_bucket="$STAGING_BUCKET" \
  --display_name="Andi · Operaciones" \
  --otel_to_cloud \
  andes_prod

# Salida esperada (el último segmento es el RESOURCE_ID):
#   AgentEngine created. Resource name: projects/734019283651/locations/us-central1/reasoningEngines/4890128374650163200
