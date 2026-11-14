# Plataforma de agentes de Google — hechos verificados (13-nov-2026)

Fuente de verdad para las lecciones. Todo lo que afirma el tutorial sobre nombres, comandos, APIs, modelos y precios sale de aquí. Si algo no está aquí, **no lo afirmes en una lección** (o márcalo como "a confirmar").

## 1. Nombres y renombres

| Antes | Ahora | Desde | Nota |
|---|---|---|---|
| Vertex AI | **Gemini Enterprise Agent Platform** | Cloud Next, abr-2026 | URLs de consola y API (`aiplatform.googleapis.com`) sin cambios. |
| Vertex AI Agent Engine | **Agent Runtime** | abr-2026 | Recurso: `projects/P/locations/L/reasoningEngines/ID`. CLI: `adk deploy agent_engine`. |
| Agentspace | **Gemini Enterprise** (app para empleados) | oct-2025 | Rol: `discoveryengine.agentspaceAdmin` ("Gemini Enterprise Admin"). |
| Vertex AI Agent Builder | pilar **Build** de la plataforma | abr-2026 | |

Pilares oficiales (docs.cloud.google.com/agent-builder/overview):
- **Build**: ADK, Agent Studio (low-code), Agent Garden (plantillas), Model Garden, RAG Engine, Vector Search, Managed Agents API, CodeMender.
- **Scale**: Agent Runtime, Sessions, Memory Bank, Code Execution (sandbox).
- **Govern**: Agent Registry, Agent Identity, Agent Gateway (+ Model Armor), políticas, escaneo de amenazas.
- **Optimize**: evaluación de agentes (y simulada), observabilidad/trazas, optimizador de prompts.

## 2. Modelos Gemini (ciclo de vida + precios API nivel pagado, US$/1M tokens)

| ID | Estado | Lanzado | Retiro | Input | Output | Nota |
|---|---|---|---|---|---|---|
| `gemini-4-argon` | GA | 2026-10-13 | ≥ 2027-10-13 | 2 → 4 (desde 2026-12-01) | 10 → 20 | Frontier. Thinking LOW/MEDIUM/HIGH; ignora temperature; 1M contexto; sin Live API/RAG Engine/tuning/caché explícita. Solo `global`, `us`, `eu`. |
| `gemini-4-carbon` | corto plazo | 2026-11-10 | — | 2 → 4 | 10 → 20 | Frontier. |
| `gemini-4-hydrogen` | corto plazo | 2026-11-12 | — | 1.50 | 7.50 | "Modelo de todos los días" para código y flujos agénticos. |
| `gemini-3.8-flash` | GA | 2026-09-02 | ≥ 2027-09-02 | 0.75 → 1.50 (2027-01-01) | 3.75 → 7.50 | Flash GA más nuevo; reemplazo sugerido de 2.5 Pro/Flash y 3.6/3.7 Flash. |
| `gemini-3.5-flash` | GA | 2026-05-19 | ≥ 2027-05-19 | (no listado) | | |
| `gemini-3.5-flash-lite` | GA | 2026-07-21 | ≥ 2027-07-21 | 0.30 | 2.50 | |
| `gemini-2.5-pro/flash/flash-lite` | GA | 2025 | **2026-10-20** (ya retirados) | | | |

Alias usado por la documentación de ADK: `gemini-flash-latest`. Precios de Vertex pueden diferir; la página de precios de la API es aistudio.google.com/docs/pricing.

## 3. ADK (Agent Development Kit)

- Python `google-adk` **2.14.1** (2026-11-12). `Requires-Python >= 3.11`. Extras: `a2a`, `gcp`, `toolbox`, `eval`, `mcp`, `otel-gcp`, `agent-identity`, `bigquery-analytics`, `db`, …
- ADK 2.0 GA: Python 2026-05-19, Go 2026-06-30, TypeScript 2026-08-21. **Workflow Runtime**: agentes, herramientas y funciones son nodos de un grafo. `BaseAgent` ahora hereda de `BaseNode`; sobrescribir `_run_async_impl()` se ignora: usar callbacks. No capturar `BaseException` en tools (rompe HITL); no capturar `Exception` amplio (desactiva reintentos; usar `RetryConfig(max_attempts=3)`).
- 2.14: A2A, sandboxes, evaluación y runtime salen de experimental; `MultiRunConfig`/`adk eval` multi-run; TeamsRunner; enums en FunctionTool llegan como miembros; `VertexAiSessionService.create_session` solo acepta config.

### Quickstart
```bash
pip install google-adk          # Python ≥ 3.11
adk create my_agent             # crea my_agent/{agent.py,.env,__init__.py}
adk run my_agent                # CLI
adk web --port 8000             # UI de desarrollo, se corre desde la carpeta PADRE del agente; no para producción
adk api_server                  # API REST
```
`.env` (API key): `GOOGLE_API_KEY="..."`. Vertex: `GOOGLE_GENAI_USE_VERTEXAI=TRUE`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`.

agent.py mínimo (docs):
```python
from google.adk.agents.llm_agent import Agent   # o: from google.adk.agents import Agent
root_agent = Agent(model="gemini-flash-latest", name="root_agent", description="...", instruction="...", tools=[get_current_time])
```

### LlmAgent / Agent
`name` (identificador único; `user` reservado), `description` (clave para delegación), `model` (string o BaseLlm; hereda del ancestro si falta), `instruction` (string o función `InstructionProvider`; `{var}` inyecta estado, `{var?}` opcional, `{artifact.x}`), `tools`, `sub_agents`, `output_key` (guarda la respuesta final en state), `output_schema`/`input_schema` (Pydantic), `generate_content_config` (sin tools/system_instruction/response_schema), `include_contents='default'|'none'`, `planner` (`BuiltInPlanner(thinking_config)` / `PlanReActPlanner`), `code_executor` (`BuiltInCodeExecutor`), `mode` en sub-agentes: `chat` (defecto) / `task` (vuelve solo con `finish_task`) / `single_turn` (sin interacción, paralelizable). No poner `mode` en el raíz. Task mode: agentes hoja; desactivado dentro de grafos en 2.0.0. `GlobalInstructionPlugin` reemplaza a `global_instruction`.

### Function tools
Función Python → `FunctionTool` automático. Esquema desde nombre, docstring, type hints y defaults. Parámetro requerido = tipo sin default (`Optional` solo no basta). Pydantic BaseModel anidado OK. Devolver `dict` con clave `status`; valores no-dict se envuelven en `{"result": ...}`. `tool_context: ToolContext` se detecta por tipo y se oculta al modelo: `.state`, `.actions` (`escalate`, `transfer_to_agent`, `skip_summarization`), artefactos, `request_confirmation(hint=, payload=)`, `tool_confirmation`. Prefijo `temp:` para datos entre tools de una invocación. `LongRunningFunctionTool` para operaciones largas (devuelve ticket, pausa). `AgentTool` para usar un agente como herramienta.
Confirmación: `FunctionTool(fn, require_confirmation=True)` o función booleana sobre los argumentos. El cliente responde con `function_response` `name: "adk_request_confirmation"`, `id` = function_call_id, `response: {confirmed, payload}` (+ `invocation_id` si Resume).

### MCP
```python
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams, StreamableHTTPConnectionParams, SseConnectionParams
from mcp import StdioServerParameters
McpToolset(connection_params=StdioConnectionParams(server_params=StdioServerParameters(command="npx", args=[...]), timeout=...), tool_filter=["list_directory"])
McpToolset(connection_params=StreamableHTTPConnectionParams(url=..., headers={...}, timeout=..., sse_read_timeout=...))
```
Siempre `tool_filter`. Preferir `auth_scheme`/`auth_credential` a headers manuales. No conecta al construir; sí en el primer uso. Definir sincrónicamente en agent.py para producción.

### MCP Toolbox for Databases
Servidor open source (mcp-toolbox.dev). Cliente: `pip install google-adk[toolbox]`; `ToolboxToolset(server_url="http://127.0.0.1:5000")` en `tools=[...]`. Auth: `CredentialStrategy.workload_identity(target_audience="<TOOLBOX_URL>")` (ADC, recomendado en Cloud Run/GKE/local); OAuth2 (identidad del usuario); API keys. `bound_params` oculta valores al modelo. Config `tools.yaml` (`toolbox --config tools.yaml`), documentos separados con `---`:
```yaml
kind: source
name: my-pg-source
type: postgres            # cloud-sql-postgres | alloydb-postgres | bigquery | mysql | mongodb | neo4j …
host: 127.0.0.1
port: 5432
database: toolbox_db
user: ${USER_NAME}
password: ${PASSWORD}
---
kind: tool
name: search-hotels-by-name
type: postgres-sql
source: my-pg-source
description: Search for hotels based on name.
parameters:
  - name: name
    type: string
    description: The name of the hotel.
statement: SELECT * FROM hotels WHERE name ILIKE '%' || $1 || '%';
---
kind: toolset
name: my_first_toolset
tools: [my_first_tool, my_second_tool]
```
Placeholders `$1` (Postgres) / `?` (MySQL); `${ENV:default}`. Se puede correr como sidecar en Cloud Run; con AlloyDB/Cloud SQL, auth IAM sin contraseñas.

### Otras integraciones
- BigQuery: `from google.adk.integrations.bigquery import BigQueryToolset, BigQueryCredentialsConfig`; `from google.adk.integrations.bigquery.config import BigQueryToolConfig, WriteMode`; `BigQueryToolConfig(write_mode=WriteMode.BLOCKED)`; credenciales `google.auth.default()`. Tools: list_dataset_ids, get_dataset_info, list_table_ids, get_table_info, execute_sql, ask_data_insights, forecast, detect_anomalies, …
- Application Integration (Salesforce, ServiceNow, SAP, JIRA… 100+ conectores): `from google.adk.tools.application_integration_tool.application_integration_toolset import ApplicationIntegrationToolset(project, location, connection, entity_operations, actions, tool_name_prefix, tool_instructions)`. Roles: integrations.integrationEditor, connectors.invoker, secretmanager.secretAccessor (NO integrationInvoker en Agent Runtime).
- Built-in: google_search, code execution, computer use, GCS.

### Workflows (2.0)
```python
from google.adk import Agent, Workflow, Event
root_agent = Workflow(name="root_agent", edges=[("START", fruit_agent, shout)])
def shout(node_input: str): return Event(message=f"{node_input.upper()}")
# rutas
def router(node_input: str): return Event(route="DONE", output=node_input)
Workflow(name=..., edges=[("START", task_a, router), (router, {"RETRY": task_a, "DONE": final})])
# humano
from google.adk.events import RequestInput
async def step(node_input): yield RequestInput(message="...", payload=..., response_schema=...)
# dinámico
from google.adk import Context, Workflow; from google.adk.workflow import node
@node(rerun_on_resume=True) async def parent(ctx: Context): r = await ctx.run_node(child)
```
Ciclos necesitan ≥ 1 arista ruteada y NO se acotan solos. `DEFAULT_ROUTE`. Colaborativo: raíz con `sub_agents` → ADK inyecta tools de delegación con el nombre del sub-agente; `transfer_to_agent` para volver en modo chat. Template (`SequentialAgent`, `ParallelAgent`, `LoopAgent`, `exit_loop` con `tool_context.actions.escalate = True`, `max_iterations`) **deprecados** pero funcionan.

### Sesiones, estado, memoria
- `Runner(agent=root_agent, app_name=..., session_service=...)`; `InMemoryRunner(app=app)`; `runner.run_async(user_id=, session_id=, new_message=types.Content(role='user', parts=[types.Part(text=q)]))` → eventos; `event.is_final_response()`, `event.content.parts[0].text`.
- Session services: `InMemorySessionService`, `DatabaseSessionService`, `VertexAiSessionService(project, location, agent_engine_id)`. `session_service.create_session(app_name, user_id, session_id?)`, `list_sessions`, `get_session`.
- Estado: sin prefijo = sesión; `user:` por usuario (todas sus sesiones); `app:` global; `temp:` solo la invocación. Escribir vía `tool_context.state[...]` / `callback_context.state[...]` o `EventActions(state_delta=...)` + `append_event`. No mutar `session.state` directamente.
- Memoria: `InMemoryMemoryService`, `VertexAiMemoryBankService(project, location, agent_engine_id)`, `VertexAiRagMemoryService`. Tools `preload_memory` (automático cada turno) y `load_memory` (a demanda). Guardar: `await callback_context.add_session_to_memory()` en `after_agent_callback`. `adk web --memory_service_uri="agentengine://<ID>"`. Memory Bank: extrae hechos con LLM, consolida, scope `{app_name, user_id}`, TTL, revisiones, IAM conditions; generación asíncrona; cobra por operación.

### Callbacks y plugins
Callbacks por agente: `before/after_agent_callback` (devolver `Content` para saltar/añadir), `before/after_model_callback` (`LlmResponse`), `before/after_tool_callback` (`dict`). `None` = continuar. Firma: `def f(callback_context: CallbackContext, llm_request: LlmRequest) -> Optional[LlmResponse]`.
Plugins (`BasePlugin`): `on_user_message_callback`, `before/after_run_callback`, `on_run_error_callback`, `before/after_agent/model/tool_callback`, `on_*_error_callback`, `on_event_callback`, `close()`. Registrar con `App(name=, root_agent=, plugins=[...])` y `InMemoryRunner(app=app)` (no `Runner(plugins=)`). `adk web --extra_plugins google.adk.plugins.LoggingPlugin`. Built-in: LoggingPlugin, SaveFilesAsArtifactsPlugin, Context Filter, Reflect and Retry, **Model Armor**.

### Model Armor plugin
```python
from google.adk.apps import App
from google.adk.integrations.model_armor import ModelArmorConfig, ModelArmorPlugin
App(name="...", root_agent=agent, plugins=[ModelArmorPlugin(config=ModelArmorConfig(
    prompt_template_name="projects/P/locations/us-central1/templates/t-prompt",
    response_template_name="projects/P/locations/us-central1/templates/t-response",
    input_blocked_message=..., output_blocked_message=..., block_on_screening_failure=True))])
```
ADK ≥ 2.8, `pip install 'google-adk[gcp]'`, API Model Armor + plantillas creadas, ADC. Bloqueo → mensaje de reemplazo + `custom_metadata['model_armor_blocked']`. No revisa function_response.

### Seguridad (adk.dev/safety)
Agent-auth (identidad del agente, mínimo privilegio, loguear con atribución) vs user-auth (OAuth, scopes amplios). Guardrails en la herramienta (política en ToolContext, no en args del modelo; rechazar SELECT fuera de tablas permitidas), filtros de seguridad Gemini, callbacks (`before_tool_callback` valida user_id vs state), plugins para políticas compartidas (Gemini como juez con Flash-Lite, Model Armor, redacción PII), sandbox para código, VPC-SC, escapar salida del modelo en UIs.

### A2A
`pip install google-adk[a2a]`. Exponer: `from google.adk.a2a.utils.agent_to_a2a import to_a2a; a2a_app = to_a2a(root_agent, port=8001)` → `uvicorn modulo:a2a_app --host localhost --port 8001`; card en `/.well-known/agent-card.json`; o `adk api_server --a2a <dir>` (solo carpetas con `agent.json`). Consumir: `from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH; RemoteA2aAgent(name=, description=, agent_card=f"http://localhost:8001/a2a/check_prime_agent{AGENT_CARD_WELL_KNOWN_PATH}", use_legacy=False)` como `sub_agent`. Gemini Enterprise soporta **A2A v0.3 streaming** (con SDK 1.x usar `a2a.compat.v0_3`).

### Evaluación
`*.test.json` (1 sesión) / `*.evalset.json` (varias; `eval_set_id`, `eval_cases[{eval_id, conversation[{invocation_id, user_content, final_response, intermediate_data{tool_uses[{name,args}], intermediate_responses}}], session_input{app_name,user_id,state}}]`). `test_config.json`: `{"criteria": {"tool_trajectory_avg_score": 1.0, "response_match_score": 0.8}}` (defaults). Otros: `final_response_match_v2`, `rubric_based_final_response_quality_v1`, `rubric_based_tool_use_quality_v1`, `hallucinations_v1`, `safety_v1`, `multi_turn_*`; eficiencia (informativos): `tool_call_count_v1`, `inference_call_count_v1`, `token_usage_v1`, `invocation_duration_v1`. LLM-judge requiere Gen AI Evaluation Service (GOOGLE_API_KEY o proyecto+ADC). `adk eval <agent_dir> <evalset.json> [--config_file_path] [--print_detailed_results]`; `evalset.json:eval_1,eval_2`. pytest: `await AgentEvaluator.evaluate(agent_module="...", eval_dataset_file_path_or_dir="...")`. UI: pestaña Eval en `adk web`.

### Observabilidad
`adk deploy agent_engine --otel_to_cloud` (por defecto `ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS='false'`), `AdkApp(agent=, enable_tracing=True)`, custom: `google_cloud.get_gcp_exporters(enable_cloud_tracing=True)` + `maybe_set_otel_providers([...])`. Spans: `invoke_agent`, `generate_content`, `call_llm`, `execute_tool`. Ver en Trace Explorer (console.cloud.google.com/traces/explorer).

## 4. Agent Runtime

- Prerrequisitos: habilitar **Agent Platform API** y **Cloud Resource Manager API**; `gcloud auth login` + `gcloud auth application-default login`; roles `roles/aiplatform.user` + `roles/storage.admin` (bucket de staging `gs://...`).
- CLI: `adk deploy agent_engine --project=$PROJECT_ID --region=$LOCATION_ID --display_name="My First Agent" [--otel_to_cloud] <agent_dir>` → "AgentEngine created. Resource name: projects/…/locations/…/reasoningEngines/<RESOURCE_ID>". Identidad propia: `.agent_engine_config.json` con `{"identity_type": "AGENT_IDENTITY"}` antes de desplegar.
- SDK (quickstart ADK): `pip install "google-cloud-aiplatform[agent_engines,adk]>=1.112"`; `client = vertexai.Client(project=, location=)`; `app = agent_engines.AdkApp(agent=agent)`; local `app.async_stream_query(user_id=, message=)`; `remote = client.agent_engines.create(agent=app, config={"requirements": [...], "staging_bucket": "gs://...", "identity_type": types.IdentityType.AGENT_IDENTITY})`; `remote.async_stream_query(...)`; `remote.delete(force=True)`. SDK 2.0.1+ renombra el módulo a `agentplatform` (`client.runtimes.create/get`, `sessions`, `memory_banks`); config extra: `env_vars`, `service_account`, `min/max_instances`, `resource_limits`, `container_concurrency`, `agent_framework="google-adk"`.
- Seis formas de desplegar: Developer Connect (Python), repo Git público (Python), archivos fuente (Python, sin bucket), Dockerfile, imagen de contenedor, SDK con objeto en memoria.
- Usar: `adk_app = client.runtimes.get(name="projects/P/locations/L/reasoningEngines/ID")`; `session = await adk_app.async_create_session(user_id=)`; `async for event in adk_app.async_stream_query(user_id=, session_id=, message=)`; `async_list_sessions`, `async_delete_session`. REST: `POST https://LOCATION-aiplatform.googleapis.com/v1/projects/P/locations/L/reasoningEngines/ID:streamQuery?alt=sse` con `{"class_method": "async_stream_query", "input": {"user_id": "...", "message": "..."}}`.
- Sessions sin desplegar agente: `client.runtimes.create(config={"display_name": "My Session Store"})` → ID para `VertexAiSessionService`.
- Agent Identity: `principal://TRUST_DOMAIN/NAMESPACE/AGENT_NAME` (SPIFFE); roles automáticos `roles/aiplatform.agentDefaultAccess`, `roles/aiplatform.agentContextEditor`; recomendados `serviceusage.serviceUsageConsumer`, `browser`, `secretmanager.secretAccessor`; nunca `roles/aiplatform.user` al agente; `principalSet://` para muchos agentes; `gcloud RESOURCE add-iam-policy-binding … --member="principal://…"`.
- Agent Gateway: deny por defecto; inspecciona JSON-RPC MCP; consulta Agent Registry; IAM Unified Access Policies; Model Armor ida y vuelta; SPIFFE + mTLS + DPoP. Administrado en Agent Runtime/Gemini Enterprise; GKE/Cloud Run próximamente; cross-cloud Limited Preview.
- Agent Registry: catálogo de agentes, MCP servers/tools, endpoints, skills; registro automático de cargas soportadas del proyecto; manual (`Service`) para externos; "governance project"; management boundary para multi-proyecto.

## 5. Gemini Enterprise: registrar agentes

Prerrequisitos: rol Gemini Enterprise Admin, Discovery Engine API, una app de Gemini Enterprise, agente ADK desplegado en Agent Runtime (o A2A alojado). Opcional OAuth (cliente web con redirect URIs `https://vertexaisearch.cloud.google.com/oauth-redirect` y `https://vertexaisearch.cloud.google.com/static/oauth/oauth.html`).

Consola: **Gemini Enterprise** → nombre de la app → **Agents** → **Add agent** → **Add** junto a **Custom agent via Agent Runtime** → (opcional) **Authorizations** → **Add authorization** (nombre, Client ID, Client secret, Token URI, Authorization URI) → **Next** → **Agent name**, **Describe your agent** (lo usa el LLM para decidir cuándo invocarlo), **Agent Runtime resource path** `projects/PROJECT_ID/locations/LOCATION/reasoningEngines/RESOURCE_ID` → **Create**. Editar: Agents → agente → Edit → Save.

REST: `POST https://ENDPOINT_LOCATION-discoveryengine.googleapis.com/v1alpha/projects/PROJECT_ID/locations/global/collections/default_collection/engines/APP_ID/assistants/default_assistant/agents` con `{"displayName","description","icon":{"uri"},"adkAgentDefinition":{"provisionedReasoningEngine":{"reasoningEngine":"projects/…/reasoningEngines/ID"}},"authorizationConfig":{"toolAuthorizations":["projects/PN/locations/global/authorizations/AUTH_ID"]}}`. `ENDPOINT_LOCATION` ∈ us|eu|global; app `us` exige región `us-*`, `eu` → `europe-*`. Cuota: 1 registro/usuario/día (Standard), 10 (Plus), 0 (Frontline) → HTTP 429 en CI/CD.

A2A: **Add** junto a **Custom agent via A2A** → pegar **Agent card JSON** (`protocolVersion, name, description, url, version, capabilities, skills, defaultInputModes, defaultOutputModes`) → **Preview agent details** → **Next** → OAuth (si accede a recursos de Google o requiere `Authorization`) o **Skip & Finish**. Cloud Run con `.run.app` autenticado: `roles/run.invoker` al service agent `service-PROJECT_NUMBER@gcp-sa-discoveryengine.iam.gserviceaccount.com`. El tráfico de agentes A2A registrados NO pasa por Agent Gateway; Model Armor no se aplica automáticamente; `securitySchemes` del card se ignoran; sin API keys/headers estáticos.

## 6. Agents CLI (preview)
`uvx google-agents-cli setup` (instala CLI + skills para asistentes de código); `pipx/pip install google-agents-cli && npx skills add google/agents-cli`. Requiere uv (Python ≥ 3.11); Node recomendado; macOS/Linux/WSL 2 (Windows nativo no oficial). Comandos: `agents-cli create my-agent --prototype --yes` (`--agent adk_python` por defecto), `install`, `playground` (http://127.0.0.1:8080), `eval run`, `deploy [--agent-identity]`, `publish gemini-enterprise`, `update`. Deploy/publish requieren proyecto con facturación.

## 7. Arquitectura de referencia (Cloud Architecture Center, single-agent ADK + Cloud Run)
Componentes: frontend Cloud Run, agente ADK (Cloud Run / Agent Runtime / GKE), Model Armor, Gemini, MCP Toolbox (AlloyDB), MCP servers, Observabilidad. Recomendaciones: humano en el circuito en flujos críticos; Agent Identity + IAM mínimo (+ Principal Access Boundary); credenciales con Auth Manager, no embebidas; ingreso/egreso vía Agent Gateway con deny por defecto; MCP servers/A2A en Agent Registry; frontend sin `run.app` (LB + Cloud Armor; IAP interno, Identity Platform externo); Binary Authorization, CMEK, VPC-SC, DLP. Fiabilidad: estado fuera del runtime (Memory Bank/Memorystore/Cloud SQL), reintentos, Provisioned Throughput, endpoints globales. Costo: medir QPS/TPS, modelo más barato primero, prompts concisos, caché de contexto, batch. Observabilidad: logs estructurados por paso, Cloud Trace, alertas, evaluación periódica de trayectorias; Toolbox para cambiar tools sin redeploy.

## 8. Integrar el agente desde apps externas (verificado 2026-11-14)
- Cualquier cliente llama a Agent Runtime con la misma API: `POST …/reasoningEngines/ID:streamQuery?alt=sse` + `{"class_method":"async_stream_query","input":{"user_id","session_id?","message"}}`; `async_create_session(user_id=, state=)` acepta estado inicial (p. ej. `user:customer_id`). Gemini Enterprise es un cliente más.
- **StreamAssist** (API de Gemini Enterprise, `…/assistants/default_assistant:streamAssist`, `agentsSpec.agentSpecs[].agentId`): soporta Core Assistant, Deep Research y Workflow Builder; **no invoca agentes ADK ni A2A** registrados (los A2A se llaman por su endpoint); sin acciones mutativas. Permiso `discoveryengine.assistants.assist`.
- **Agent Gateway**: punto de aplicación de políticas en la red, gobierna **entrada** (autentica la credencial entrante e inspecciona prompts; frente a agentes hospedados y tools MCP) y **salida** (tools, MCP remotos, SaaS, agentes downstream; MCP/A2A/REST/gRPC). Administrado por Google en Agent Runtime y Gemini Enterprise ("currently available", hay que configurarlo); GKE y Cloud Run self-managed "coming soon" (Cloud Run: entrada por Application Load Balancer, salida por Secure Web Proxy); cross-cloud (EKS, AKS, OpenShift, on-prem) con Envoy self-managed en Limited Preview, solo tráfico agente→afuera.
- **Workload Identity Federation (AWS)**: habilitar IAM, Resource Manager, Service Account Credentials y STS; `gcloud iam workload-identity-pools create POOL --location=global`; `providers create-aws PROVIDER --workload-identity-pool=POOL --account-id=AWS_ACCOUNT --attribute-mapping="google.subject=assertion.arn,…"`; conceder roles directamente al principal federado (`principalSet://iam.googleapis.com/projects/PN/locations/global/workloadIdentityPools/POOL/attribute.ATTR/VALUE`), impersonación solo si la API no soporta federación; `create-cred-config …/providers/PROVIDER --aws --enable-imdsv2 --output-file=f.json` (sin claves privadas; `type: external_account`, `credential_source.environment_id: aws1`) → `GOOGLE_APPLICATION_CREDENTIALS`. La guía cubre EC2 (IMDSv2); Lambda/ECS vía variables `AWS_*` (google-auth), a probar.
- Rol para invocar el runtime: `roles/aiplatform.user` a quien llama; al agente nunca (Agent Identity).

## Fuentes
- https://docs.cloud.google.com/agent-builder/overview
- https://adk.dev/2.0/ · https://adk.dev/get-started/python/ · https://adk.dev/agents/llm-agents/ · https://adk.dev/tools-custom/function-tools/ · https://adk.dev/tools-custom/mcp-tools/ · https://adk.dev/tools-custom/confirmation/ · https://adk.dev/integrations/mcp-toolbox-for-databases/ · https://adk.dev/integrations/bigquery/ · https://adk.dev/integrations/application-integration/ · https://adk.dev/workflows/ · https://adk.dev/workflows/collaboration/ · https://adk.dev/graphs/ · https://adk.dev/graphs/routes/ · https://adk.dev/graphs/human-input/ · https://adk.dev/graphs/dynamic/ · https://adk.dev/sessions/state/ · https://adk.dev/sessions/memory/ · https://adk.dev/callbacks/ · https://adk.dev/plugins/ · https://adk.dev/integrations/model-armor/ · https://adk.dev/safety/ · https://adk.dev/a2a/quickstart-exposing/ · https://adk.dev/a2a/quickstart-consuming/ · https://adk.dev/evaluate/ · https://adk.dev/integrations/cloud-trace/ · https://adk.dev/deploy/agent-runtime/deploy/
- https://pypi.org/project/google-adk/ · https://github.com/google/adk-python/releases
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions · https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/4-argon · https://aistudio.google.com/docs/pricing
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/quickstart-adk · https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/deploy-an-agent · https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-adk-agent · https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/sessions/manage-with-adk · https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank · https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity · https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview · https://docs.cloud.google.com/agent-registry/overview · https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-studio
- https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent · https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-a2a-agent
- https://mcp-toolbox.dev/documentation/configuration/
- https://google.github.io/agents-cli/guide/getting-started/ · https://pypi.org/project/google-agents-cli/
- https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run
- https://docs.cloud.google.com/gemini/enterprise/docs/invoke-agent-streamassist · https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds · https://docs.cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.reasoningEngines/streamQuery
