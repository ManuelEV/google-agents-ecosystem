# andes_prod · producción en Agent Runtime

| Archivo | Para qué |
|---|---|
| `agent.py` | `App` con `LoggingPlugin` + `ModelArmorPlugin`, `preload_memory`, guardrail `before_tool_callback`, memoria guardada en `after_agent_callback`. |
| `.agent_engine_config.json` | `identity_type: AGENT_IDENTITY` → el agente despliega con su propio principal IAM. |
| `deploy.sh` | APIs, bucket, `.env` y `adk deploy agent_engine … --otel_to_cloud`. |
| `query_remote.py` / `.sh` | Consultar el agente desplegado (SDK y REST `:streamQuery?alt=sse`). |
| `evals/` + `tests/` | `adk eval` y pytest con `AgentEvaluator`. |
| `a2a_server.py` | Exponer el agente por A2A (`to_a2a`), card en `/.well-known/agent-card.json`. |
| `logistics_remote.py` | Consumir un agente A2A de otro equipo (`RemoteA2aAgent`). |
| `register_gemini_enterprise.sh` | Registrar el agente en una app de Gemini Enterprise (REST). |

## Memory Bank y Sessions en local

```bash
# 1) crea un Agent Runtime "vacío" como almacén (o usa el ID del agente desplegado)
python - <<'EOF'
import os, vertexai
client = vertexai.Client(project=os.environ["GOOGLE_CLOUD_PROJECT"], location=os.environ.get("GOOGLE_CLOUD_LOCATION","us-central1"))
engine = client.agent_engines.create(config={"display_name": "andes-memory-store"})
print(engine.api_resource.name.split("/")[-1])
EOF
# 2) adk web con sesiones y memoria administradas
adk web --port 8000 \
  --session_service_uri="agentengine://$AGENT_ENGINE_ID" \
  --memory_service_uri="agentengine://$AGENT_ENGINE_ID"
```

## Evaluar

```bash
adk eval andes_prod andes_prod/evals/andes_ops.evalset.json --config_file_path andes_prod/evals/test_config.json --print_detailed_results
adk eval andes_prod andes_prod/evals/andes_ops.evalset.json:order_status_4821     # solo un caso
pytest andes_prod/tests -q
```

## Model Armor

```bash
gcloud services enable modelarmor.googleapis.com
gcloud model-armor templates create andes-prompt --location=us-central1 \
  --rai-settings-filters='[{"filterType":"HATE_SPEECH","confidenceLevel":"MEDIUM_AND_ABOVE"}]' \
  --basic-config-filter-enforcement=enabled --pi-and-jailbreak-filter-settings-enforcement=enabled \
  --pi-and-jailbreak-filter-settings-confidence-level=MEDIUM_AND_ABOVE
export MODEL_ARMOR_PROMPT_TEMPLATE=projects/$GOOGLE_CLOUD_PROJECT/locations/us-central1/templates/andes-prompt
```

## Orden sugerido

1. `adk web` local con `GOOGLE_GENAI_USE_VERTEXAI=TRUE`.
2. `adk eval` hasta que los tres casos pasen.
3. `bash andes_prod/deploy.sh` → guarda el `RESOURCE_ID` en `AGENT_ENGINE_ID`.
4. `python -m andes_prod.query_remote "¿Dónde está mi pedido 4821?"`.
5. Trazas en https://console.cloud.google.com/traces/explorer.
6. `bash andes_prod/register_gemini_enterprise.sh` y pruébalo desde la app de Gemini Enterprise.
