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

## Probar sin gastar dinero

Casi todo se puede probar gratis. Hay tres niveles; conviene ir en este orden.

| Nivel | Qué pide | Qué ejemplos cubre |
|---|---|---|
| 1. API key de Gemini (AI Studio) | Nada: sin tarjeta ni facturación | `andes_hello`, `andes_workflow` y buena parte de `andes_data` (el Postgres en Docker y el servidor MCP del transportista corren en tu máquina) |
| 2. Vertex AI en modo express | Cuenta de Google; gratis por 90 días, sin facturación | El camino de Vertex con cuota limitada y solo algunos servicios; sirve para probar sesiones y memoria de Agent Engine |
| 3. Prueba gratuita de Google Cloud | Tarjeta; USD 300 de crédito por 90 días | `andes_prod`: despliegue en Agent Engine, Memory Bank, Model Armor, BigQuery y Cloud SQL |

Detalles que importan:

- **Nivel 1.** Es la opción A de «Dos formas de autenticar». El free tier solo cubre algunos modelos y tiene cuotas bajas, que hoy solo se ven dentro de AI Studio. Google puede usar tus prompts del free tier para mejorar sus productos: no metas datos reales.
- **Nivel 3.** No te cobra al acabarse el crédito o el plazo: la cuenta se cierra, salvo que tú la actualices a cuenta de pago. Solo aplica si nunca fuiste cliente de pago de Google Cloud, Maps Platform o Firebase. El crédito no sirve para la API de AI Studio; para Gemini dentro de Vertex no hay una confirmación oficial clara, así que revísalo en la consola de facturación.

Qué consume crédito en el nivel 3:

- **Cloud SQL:** cobra por hora mientras la instancia exista. Créala, prueba y bórrala el mismo día.
- **Agent Engine:** el runtime tendría una franja gratis mensual (unas 50 vCPU-hora, según fuentes de terceros), pero Sessions y Memory Bank se cobran desde 2026. Borra el despliegue al terminar.
- **Gemini Enterprise:** el registro del agente va por licencia; no cuentes con probar esa parte gratis.
- **BigQuery:** tiene franja gratis permanente (1 TB de consultas al mes); con datos de juguete no pagas.

Crea un proyecto solo para esto, ponle una alerta de presupuesto (por ejemplo USD 5) y al terminar borra el proyecto entero. La alerta solo avisa, no corta el gasto.

Los precios y cuotas cambian seguido y varias cifras vienen de fuentes de terceros (revisado en noviembre de 2026). Confírmalas antes de desplegar:

- [Funciones gratuitas y prueba de Google Cloud](https://docs.cloud.google.com/free)
- [Preguntas frecuentes del modo express](https://cloud.google.com/resources/cloud-express-faqs)
- [Límites de la API de Gemini](https://ai.google.dev/gemini-api/docs/rate-limits)
- [ADK: modo express para sesiones y memoria](https://google.github.io/adk-docs/sessions/express-mode)
- [Notas de versión de Agent Builder](https://docs.cloud.google.com/agent-builder/release-notes)

> Los datos (pedidos, clientes, SKUs, precios) son inventados. Los comandos, APIs y formatos son los reales a noviembre de 2026; revisa `../docs/research/` para las fuentes.
