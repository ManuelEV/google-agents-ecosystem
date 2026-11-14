# Ejemplos · Andes Market en la plataforma de Google

Cuatro agentes ADK (Python ≥ 3.11) más el backend de un portal externo que los consume; acompañan al tutorial. Cada carpeta es un agente que `adk web` descubre solo: corre los comandos **desde esta carpeta `examples/`**.

| Carpeta | Lección | Qué muestra |
|---|---|---|
| `andes_hello/` | Tu primer agente | Un `Agent` con una herramienta de función y estado de sesión. Corre solo con una API key. |
| `andes_data/` | Herramientas · Datos dentro y fuera de Google | MCP Toolbox (Cloud SQL **y** un Postgres on-prem simulado en Docker), BigQuery, un servidor MCP externo (API del transportista) y confirmación humana para reembolsos. |
| `andes_workflow/` | Multi-agente y workflows | Coordinador con sub-agentes (`mode="task"`) y, como alternativa, un `Workflow` de ADK 2.0 con router y `RequestInput`. |
| `andes_prod/` | Sesiones y memoria · Desplegar · Seguridad · Evaluar · Publicar | `App` con `LoggingPlugin` + `ModelArmorPlugin`, Memory Bank, `.agent_engine_config.json` con Agent Identity, scripts de despliegue, consulta remota, A2A, evalset y registro en Gemini Enterprise. |
| `andes_portal/` | Integrar en tu propia app | Backend FastAPI (p. ej. en AWS) que llama al agente desplegado: chat por SSE, botón «Resumir con Andi», webhook de eventos, Lambda con la REST API y Workload Identity Federation sin llaves. |

## Instalar

```bash
cd examples
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -e .            # instala google-adk[gcp,toolbox,a2a,eval,mcp] y deps (ver pyproject.toml)
cp .env.example andes_hello/.env   # y edita con tu API key o tu proyecto
```

### Dos formas de autenticar

```ini
# A) API de Gemini (más simple para empezar; sin Google Cloud)
GOOGLE_API_KEY="tu-api-key"

# B) Vertex / Gemini Enterprise Agent Platform (lo que usarás en producción)
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=andes-market-prod
GOOGLE_CLOUD_LOCATION=us-central1
# + gcloud auth application-default login
```

## Correr

```bash
adk web --port 8000      # http://localhost:8000 · elige el agente en el desplegable
adk run andes_hello      # en terminal
python scripts/run_local.py andes_hello "¿Dónde está mi pedido 4821?"   # Runner + eventos crudos
```

Cada carpeta tiene su propio `README.md` con los pasos extra (Docker para el Postgres externo, MCP Toolbox, despliegue, etc.).

> Los datos (pedidos, clientes, SKUs, precios) son inventados. Los comandos, APIs y formatos son los reales a noviembre de 2026; revisa `../docs/research/` para las fuentes.
