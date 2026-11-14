import type { StepInfo } from '../../components/Player'
import { blank, cmd, comment, ok, out, warn, type TermLine } from '../../components/Terminal'

/* Caso de punta a punta sobre ARCH_NODES (ids de src/sim/architecture.ts). */
export type E2EStep = StepInfo & { flows: string[]; active: string[]; event: string }

export const E2E: E2EStep[] = [
  {
    title: 'Camila escribe en Gemini Enterprise',
    body: '"Quiero devolver el pedido 5102, la mochila llegó rota. Son $65.970." La app enruta el mensaje al agente registrado «Andi · Operaciones» con la identidad corporativa de Camila.',
    flows: ['user>ge', 'ge>root'],
    active: ['ge'],
    event: 'user: "Quiero devolver el pedido 5102, la mochila llegó rota. Son $65.970."',
  },
  {
    title: 'Gateway, identidad y Model Armor',
    body: 'Agent Gateway verifica que el agente esté registrado y que la política IAM lo permita; Model Armor revisa el prompt (sin inyecciones ni datos sensibles). El agente corre con su Agent Identity, no con una cuenta de servicio compartida.',
    flows: ['gateway>root', 'armor>root', 'identity>root'],
    active: ['gateway', 'armor', 'identity'],
    event: 'ModelArmorPlugin: prompt screened → SUCCESS · principal://…/reasoningEngines/4890128374650163200',
  },
  {
    title: 'Sessions y Memory Bank cargan contexto',
    body: 'VertexAiSessionService recupera la sesión (estado user:name, user:customer_id). preload_memory trae de Memory Bank lo que se sabe de Camila: "prefiere reembolso a cupón".',
    flows: ['root>sessions', 'root>memory'],
    active: ['sessions', 'memory'],
    event: 'preload_memory → ["Camila prefiere reembolso al medio de pago original antes que cupón."]',
  },
  {
    title: 'El coordinador delega en devoluciones_agent',
    body: 'gemini-4-hydrogen lee las descripciones de los sub-agentes y llama a devoluciones_agent (mode="task"): podrá pedir aclaraciones y volverá solo con finish_task.',
    flows: ['root>gemini', 'gemini>root', 'root>returns'],
    active: ['gemini', 'returns'],
    event: 'function_call devoluciones_agent({request: "devolver pedido 5102, mochila rota, $65.970"})',
  },
  {
    title: 'get_order vía MCP Toolbox → Cloud SQL',
    body: 'El sub-agente llama get_order(order_id="5102"). before_tool_callback comprueba que el pedido sea de Camila; Toolbox ejecuta el SQL parametrizado en Cloud SQL y devuelve el pedido con sus ítems y el total ($65.970).',
    flows: ['returns>toolbox', 'toolbox>cloudsql', 'cloudsql>toolbox'],
    active: ['toolbox', 'cloudsql'],
    event: 'function_response get_order → {state: "preparando", total_clp: 65970, items: [Mochila 30L azul, 2× Botella térmica 1L]}',
  },
  {
    title: 'request_refund supera el umbral: confirmación humana',
    body: '$65.970 > $50.000. FunctionTool(require_confirmation=needs_approval) pausa la ejecución y ADK emite una solicitud adk_request_confirmation. Un supervisor la ve y aprueba.',
    flows: ['returns>human', 'human>returns'],
    active: ['human'],
    event: 'adk_request_confirmation {hint: "Reembolso de $65.970 requiere aprobación", payload: {order_id: "5102", amount_clp: 65970}} → confirmed: true',
  },
  {
    title: 'Reembolso ejecutado y respuesta',
    body: 'La función corre, devuelve refund_id y devoluciones_agent redacta la respuesta; finish_task devuelve el control al coordinador. Model Armor revisa la salida antes de que llegue a Gemini Enterprise.',
    flows: ['returns>root', 'root>armor', 'root>ge', 'ge>user'],
    active: ['root', 'armor'],
    event: 'final: "Listo, Camila: reembolso rf_5102_… de $65.970 aprobado por un supervisor, al medio de pago original. 5-10 días hábiles."',
  },
  {
    title: 'Memoria y traza',
    body: 'after_agent_callback guarda la sesión en Memory Bank (nuevo hecho: "tuvo un producto dañado en nov-2026"). La traza invoke_agent → call_llm → execute_tool queda en Cloud Trace; el evalset de CI tiene un caso parecido.',
    flows: ['root>memory', 'root>trace'],
    active: ['memory', 'trace'],
    event: 'add_session_to_memory() · trace 1 804 ms · 4 call_llm · 3 execute_tool',
  },
]

export type RepoFile = { path: string; what: string; lesson?: string; dir?: boolean }

export const REPO: RepoFile[] = [
  { path: 'examples/README.md', what: 'Instalación (pip install -e .), las dos formas de autenticar y cómo correr cada agente.' },
  { path: 'examples/pyproject.toml', what: 'google-adk[gcp,toolbox,a2a,eval,mcp] ≥ 2.14, google-cloud-aiplatform[agent_engines,adk], mcp, pytest. Python ≥ 3.11.', lesson: 'preparar' },
  { path: 'examples/.env.example', what: 'GOOGLE_API_KEY o GOOGLE_GENAI_USE_VERTEXAI + proyecto; URLs de Toolbox y del MCP del transportista; AGENT_ENGINE_ID; plantillas de Model Armor.', lesson: 'preparar' },
  { path: 'examples/andes_common/', dir: true, what: 'Datos ficticios (pedidos, clientes, inventario, política de reembolsos) y la instrucción base de Andi.' },
  { path: 'examples/andes_hello/agent.py', what: 'Un Agent con get_order_status: docstring como descripción, dict con status, ToolContext para guardar last_order_id.', lesson: 'primer-agente' },
  { path: 'examples/andes_data/tools.py', what: 'request_refund con require_confirmation, McpToolset (Streamable HTTP + header) al transportista, ToolboxToolset(server_url).', lesson: 'herramientas' },
  { path: 'examples/andes_data/toolbox/tools.yaml', what: 'Fuentes cloud-sql-postgres, postgres (ERP on-prem) y bigquery; tools postgres-sql/bigquery-sql con $1; toolsets andes_ops y readonly.', lesson: 'datos' },
  { path: 'examples/andes_data/toolbox/tools.local.yaml', what: 'La misma config apuntando a los dos Postgres de Docker (sin BigQuery) para probar sin Google Cloud.', lesson: 'datos' },
  { path: 'examples/andes_data/docker/compose.yaml', what: 'orders-db (:5432), erp-db (:5433) con seeds SQL y el contenedor de MCP Toolbox (:5000).', lesson: 'datos' },
  { path: 'examples/andes_data/carrier_mcp/server.py', what: 'Servidor MCP (FastMCP, streamable-http :8081) que simula la API de AndesExpress: track_shipment.', lesson: 'herramientas' },
  { path: 'examples/andes_workflow/agent.py', what: 'Coordinador gemini-4-hydrogen con pedidos_agent, devoluciones_agent y analitica_agent (gemini-3.8-flash, mode="task").', lesson: 'workflows' },
  { path: 'examples/andes_workflow/graph.py', what: 'Alternativa Workflow: triage (flash-lite) → route() → especialistas; supervisor_review con RequestInput.', lesson: 'workflows' },
  { path: 'examples/andes_prod/agent.py', what: 'App + LoggingPlugin + ModelArmorPlugin, preload_memory, before_tool_callback only_own_orders, after_agent_callback → Memory Bank.', lesson: 'seguridad' },
  { path: 'examples/andes_prod/.agent_engine_config.json', what: '{"identity_type": "AGENT_IDENTITY"}: el agente despliega con su propio principal IAM.', lesson: 'seguridad' },
  { path: 'examples/andes_prod/deploy.sh', what: 'gcloud auth, APIs, bucket de staging, .env y adk deploy agent_engine --otel_to_cloud.', lesson: 'desplegar' },
  { path: 'examples/andes_prod/query_remote.py', what: 'vertexai.Client → agent_engines.get → async_create_session → async_stream_query. También query_remote.sh (REST :streamQuery?alt=sse).', lesson: 'desplegar' },
  { path: 'examples/andes_prod/evals/andes_ops.evalset.json', what: 'Tres casos con tool_uses y final_response; test_config.json con los criterios; tests/test_eval.py para pytest.', lesson: 'evaluar' },
  { path: 'examples/andes_prod/a2a_server.py', what: 'to_a2a(root_agent, agent_card=…) y logistics_remote.py con RemoteA2aAgent.', lesson: 'gemini-enterprise' },
  { path: 'examples/andes_prod/register_gemini_enterprise.sh', what: 'POST a Discovery Engine v1alpha con adkAgentDefinition.provisionedReasoningEngine.', lesson: 'gemini-enterprise' },
  { path: 'examples/andes_portal/backend.py', what: 'FastAPI fuera de Google: /chat (SSE, sesión persistente), /tickets/{id}/summary (ask_once) y /events/shipment-delayed (principal de sistema). widget.js consume el stream.', lesson: 'integrar' },
  { path: 'examples/andes_portal/lambda_handler.py', what: 'Lambda de EventBridge que llama a :streamQuery por REST con google-auth; wif_setup.sh crea el pool de Workload Identity Federation (sin llaves).', lesson: 'integrar' },
  { path: 'examples/scripts/run_local.py', what: 'Runner + InMemorySessionService: imprime function_call / function_response / state_delta de cualquier agente.', lesson: 'primer-agente' },
]

export const RUN_ORDER = ['Instalar y autenticar', 'Probar andes_hello en adk web', 'Levantar Docker + Toolbox + MCP y probar andes_data', 'Evaluar andes_prod con adk eval', 'Desplegar en Agent Runtime', 'Consultar el agente remoto', 'Registrar en Gemini Enterprise']

export const TERM_RUN: TermLine[] = [
  comment('1 · instalar y autenticar'),
  cmd('cd examples && python -m venv .venv && source .venv/bin/activate && pip install -e .'),
  ok('Successfully installed andes-market-agents google-adk-2.14.1 …'),
  cmd('gcloud auth application-default login'),
  blank(),
  comment('2 · el primer agente'),
  cmd('adk web --port 8000'),
  ok('Uvicorn running on http://127.0.0.1:8000   → elige andes_hello y pregunta por el pedido 4821'),
  blank(),
  comment('3 · datos dentro y fuera de Google'),
  cmd('docker compose -f andes_data/docker/compose.yaml up -d'),
  ok('Container orders-db  Started · Container erp-db  Started · Container toolbox  Started'),
  cmd('python -m andes_data.carrier_mcp.server &'),
  out('Uvicorn running on http://127.0.0.1:8081'),
  blank(),
  comment('4 · evaluar antes de desplegar'),
  cmd('adk eval andes_prod andes_prod/evals/andes_ops.evalset.json --config_file_path andes_prod/evals/test_config.json'),
  ok('Eval set andes_ops_smoke: 3/3 passed.'),
  blank(),
  comment('5 · desplegar'),
  cmd('bash andes_prod/deploy.sh'),
  ok('AgentEngine created. Resource name: projects/734019283651/locations/us-central1/reasoningEngines/4890128374650163200'),
  cmd('export AGENT_ENGINE_ID=4890128374650163200'),
  blank(),
  comment('6 · consultar'),
  cmd('python -m andes_prod.query_remote "¿Dónde está mi pedido 4821?"'),
  out('→ tool pedidos_agent({…}) · → tool get_order({order_id: 4821}) · → tool track_shipment({tracking: AX-88213-CL})'),
  out('[andes_ops] Tu pedido 4821 va en ruta con AndesExpress…'),
  blank(),
  comment('7 · publicar'),
  cmd('GE_APP_ID=andes-empleados_1762440100 bash andes_prod/register_gemini_enterprise.sh'),
  ok('{ "name": ".../assistants/default_assistant/agents/8841…", "state": "ENABLED" }'),
  warn('Recuerda la cuota: 1 registro por usuario y día con licencia Standard.'),
]

export type CheckItem = { id: string; text: string; group: 'seguridad' | 'fiabilidad' | 'costo' | 'observabilidad'; done?: boolean }

/* Basado en la arquitectura de referencia (Cloud Architecture Center) y las guías de seguridad de ADK. */
export const CHECKLIST: CheckItem[] = [
  { id: 's1', group: 'seguridad', text: 'Agent Identity activa (identity_type AGENT_IDENTITY) y roles mínimos; nunca roles/aiplatform.user al agente', done: true },
  { id: 's2', group: 'seguridad', text: 'Model Armor en prompt y respuesta (ModelArmorPlugin o política del gateway)', done: true },
  { id: 's3', group: 'seguridad', text: 'Guardrails en código: tool_filter en MCP, before_tool_callback con política desde el estado, SQL parametrizado en Toolbox', done: true },
  { id: 's4', group: 'seguridad', text: 'Humano en el circuito para acciones críticas (require_confirmation / RequestInput)', done: true },
  { id: 's5', group: 'seguridad', text: 'Credenciales fuera del código: Secret Manager / Auth Manager; Toolbox con Workload Identity' },
  { id: 's6', group: 'seguridad', text: 'Servidores MCP y agentes A2A registrados en Agent Registry; frontend sin URL .run.app pública (LB + Cloud Armor, IAP o Identity Platform)' },
  { id: 's7', group: 'seguridad', text: 'VPC Service Controls y CMEK si tu organización los exige; escapar la salida del modelo en la UI' },
  { id: 'f1', group: 'fiabilidad', text: 'Estado fuera del runtime: Sessions + Memory Bank (o Cloud SQL / Memorystore)', done: true },
  { id: 'f2', group: 'fiabilidad', text: 'Reintentos configurados (RetryConfig) sin capturar Exception amplio en las tools' },
  { id: 'f3', group: 'fiabilidad', text: 'Pruebas de fallo antes del lanzamiento: Toolbox caído, modelo sin cuota, tool que devuelve error' },
  { id: 'f4', group: 'fiabilidad', text: 'Provisioned Throughput o endpoints globales para cargas críticas' },
  { id: 'c1', group: 'costo', text: 'Modelo por rol: flash-lite para routers/jueces, 3.8-flash para especialistas, 4-hydrogen solo donde hace falta', done: true },
  { id: 'c2', group: 'costo', text: 'Línea base de QPS/TPS y alertas de consumo' },
  { id: 'c3', group: 'costo', text: 'Prompts concisos, include_contents="none" donde no hace falta historial, caché de contexto para prompts largos' },
  { id: 'c4', group: 'costo', text: 'Memory Bank: pocas operaciones por turno (cobra por operación)' },
  { id: 'o1', group: 'observabilidad', text: 'Trazas con --otel_to_cloud; contenido de mensajes desactivado salvo política explícita', done: true },
  { id: 'o2', group: 'observabilidad', text: 'Evalset en CI (pytest + AgentEvaluator) con trayectorias, no solo respuestas', done: true },
  { id: 'o3', group: 'observabilidad', text: 'Logs estructurados por paso (LoggingPlugin) y alertas de error/latencia en Cloud Monitoring' },
  { id: 'o4', group: 'observabilidad', text: 'Evaluación periódica con tráfico real anonimizado; Toolbox para cambiar consultas sin redesplegar' },
]

export const GROUPS: { id: CheckItem['group']; label: string }[] = [
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'fiabilidad', label: 'Fiabilidad' },
  { id: 'costo', label: 'Costo y rendimiento' },
  { id: 'observabilidad', label: 'Observabilidad y operación' },
]

export const SIM_VS_REAL: { thing: string; status: 'real' | 'simulado'; note: string }[] = [
  { thing: 'Nombres de productos, renombres, pilares', status: 'real', note: 'Documentación oficial, nov-2026.' },
  { thing: 'Comandos (adk, gcloud, toolbox, agents-cli) y flags', status: 'real', note: 'Verificados en adk.dev, docs.cloud.google.com y PyPI.' },
  { thing: 'Imports, clases y parámetros de ADK 2.14', status: 'real', note: 'Agent, Workflow, Event, RequestInput, McpToolset, ToolboxToolset, App, ModelArmorPlugin, RemoteA2aAgent…' },
  { thing: 'Formatos: eventos ADK, evalset, Agent Card, tools.yaml, REST de Discovery Engine', status: 'real', note: 'Esquemas de la documentación.' },
  { thing: 'Modelos Gemini y precios', status: 'real', note: 'Ciclo de vida y precios API al 13-nov-2026; pueden cambiar.' },
  { thing: 'Andes Market, Camila, pedidos, SKUs, montos', status: 'simulado', note: 'Inventados para contar una sola historia.' },
  { thing: 'Pantallas de la consola y de Gemini Enterprise', status: 'simulado', note: 'Estructura y nombres de la documentación; la interfaz real cambia.' },
  { thing: 'Salidas de terminal, tiempos y puntajes de evaluación', status: 'simulado', note: 'Plausibles, no capturados de una corrida real.' },
  { thing: 'Respuestas del modelo', status: 'simulado', note: 'Escritas a mano con el formato real.' },
]
