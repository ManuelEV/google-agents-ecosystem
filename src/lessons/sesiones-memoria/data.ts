import type { AdkEvent } from '../../sim/scenario'
import { AGENT_NAME, CUSTOMER, LOCATION, PROJECT_ID, REASONING_ENGINE_ID } from '../../sim/scenario'

/* ----------------------------- Prefijos ----------------------------- */

export type Scope = 'session' | 'user' | 'app' | 'temp'

export const SCOPES: Record<Scope, { prefix: string; label: string; lives: string; persists: string; example: string }> = {
  session: {
    prefix: '',
    label: 'sin prefijo',
    lives: 'Solo esta sesión (esta conversación).',
    persists: 'Sí, si el SessionService es persistente (Database o VertexAi). Con InMemory se pierde al reiniciar.',
    example: 'last_order_id',
  },
  user: {
    prefix: 'user:',
    label: 'user:',
    lives: 'Todas las sesiones del mismo user_id dentro de la app.',
    persists: 'Sí, con Database o VertexAi.',
    example: 'user:preferred_delivery',
  },
  app: {
    prefix: 'app:',
    label: 'app:',
    lives: 'Todos los usuarios y todas las sesiones de la app.',
    persists: 'Sí, con Database o VertexAi.',
    example: 'app:refund_auto_max_clp',
  },
  temp: {
    prefix: 'temp:',
    label: 'temp:',
    lives: 'Solo la invocación actual (un turno).',
    persists: 'No. Se descarta al terminar la invocación.',
    example: 'temp:last_refund_id',
  },
}

export const SCOPE_PRESETS: { key: string; value: unknown }[] = [
  { key: 'last_order_id', value: '4821' },
  { key: 'user:preferred_delivery', value: 'retiro_en_tienda' },
  { key: 'app:refund_auto_max_clp', value: 50000 },
  { key: 'temp:last_refund_id', value: 'rf_4790_2931' },
]

/* ----------------------------- Templating ----------------------------- */

export const TEMPLATE_INSTRUCTION = `Eres Andi, coordinador de operaciones de Andes Market.
Usuario: {user:name?} (rol: {user:role?}).
Último pedido consultado: {last_order_id}.
Si la memoria trae preferencias del usuario, respétalas.`

export const CODE_OUTPUT_KEY = `devoluciones = Agent(
    name="devoluciones_agent",
    model=MODEL_WORKER,
    instruction=ROOT_INSTRUCTION + "\\nSolo devoluciones. ...",
    tools=[db_tools, refund_tool],
    output_key="refund_summary",   # guarda la respuesta final en session.state["refund_summary"]
)

# dentro de una tool: el framework registra el cambio en event.actions.state_delta
def request_refund(order_id: str, amount_clp: int, reason: str, tool_context: ToolContext) -> dict:
    ...
    tool_context.state["temp:last_refund_id"] = refund_id   # temp: se descarta al terminar la invocación
    return {"status": "success", "refund_id": refund_id, ...}
`

/* ----------------------------- Services ----------------------------- */

export type ServiceId = 'memory' | 'database' | 'vertex'

export const SERVICES: Record<ServiceId, { name: string; where: string; persists: string; when: string; code: string }> = {
  memory: {
    name: 'InMemorySessionService',
    where: 'En la RAM del proceso de tu agente.',
    persists: 'No: todo se pierde al reiniciar (adk web, un pod de Cloud Run…).',
    when: 'Prototipos, tests, el primer día.',
    code: `from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name="andes_ops", session_service=session_service)
session = await session_service.create_session(app_name="andes_ops", user_id="cus_7781")
`,
  },
  database: {
    name: 'DatabaseSessionService',
    where: 'Una base SQL tuya (SQLite, Postgres, MySQL) vía SQLAlchemy.',
    persists: 'Sí. Tú administras el esquema, backups y escalado.',
    when: 'Self-hosted en Cloud Run/GKE o fuera de Google, sin Agent Runtime.',
    code: `from google.adk.sessions import DatabaseSessionService

# pip install "google-adk[db]"
session_service = DatabaseSessionService(db_url="postgresql+asyncpg://andes:***@10.0.0.5/adk_sessions")
runner = Runner(agent=root_agent, app_name="andes_ops", session_service=session_service)

# Ojo con ADK 2.0: el esquema de eventos agregó node_info y output; un store con columnas rígidas necesita migrar.
`,
  },
  vertex: {
    name: 'VertexAiSessionService',
    where: 'Sessions de Agent Runtime (administrado por Google).',
    persists: 'Sí. Sin esquema que mantener; se borra con el agente o con delete_session.',
    when: 'Producción en Google Cloud. Es lo que usa un agente desplegado en Agent Runtime.',
    code: `import vertexai
from google.adk.sessions import VertexAiSessionService

# 1) Un Agent Runtime "vacío" sirve como almacén (o usa el ID del agente desplegado)
client = vertexai.Client(project="${PROJECT_ID}", location="${LOCATION}")
engine = client.agent_engines.create(config={"display_name": "andes-memory-store"})
agent_engine_id = engine.api_resource.name.split("/")[-1]      # ${REASONING_ENGINE_ID}

# 2) El mismo Runner, otro servicio
session_service = VertexAiSessionService(project="${PROJECT_ID}", location="${LOCATION}", agent_engine_id=agent_engine_id)
runner = Runner(agent=root_agent, app_name="andes_ops", session_service=session_service)
session = await session_service.create_session(app_name="andes_ops", user_id="cus_7781")   # session_id opcional
`,
  },
}

export const CODE_ADK_WEB = `# adk web con sesiones y memoria administradas por Agent Runtime
adk web --port 8000 \\
  --session_service_uri="agentengine://${REASONING_ENGINE_ID}" \\
  --memory_service_uri="agentengine://${REASONING_ENGINE_ID}"
`

/* ----------------------------- Memory Bank ----------------------------- */

export const CODE_MEMORY = `from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import preload_memory

async def save_session_to_memory(callback_context: CallbackContext):
    await callback_context.add_session_to_memory()     # Memory Bank extrae hechos en segundo plano

root_agent = Agent(
    name="andes_ops",
    model=MODEL_ROOT,
    instruction="""Eres Andi, coordinador de operaciones de Andes Market.
Usuario: {user:name?} (rol: {user:role?}). Si la memoria trae preferencias del usuario, respétalas.
...""",
    tools=[preload_memory],                            # trae memorias relevantes al inicio de cada turno
    sub_agents=[pedidos_agent, devoluciones_agent, analitica_agent],
    after_agent_callback=save_session_to_memory,
)
`

export const CODE_MEMORY_SERVICE = `from google.adk.memory import VertexAiMemoryBankService

memory_service = VertexAiMemoryBankService(
    project="${PROJECT_ID}",
    location="${LOCATION}",
    agent_engine_id="${REASONING_ENGINE_ID}",
)
runner = Runner(agent=root_agent, app_name="andes_ops", session_service=session_service, memory_service=memory_service)
`

export const MEMORY_OBJECTS = [
  {
    name: `projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}/memories/mem-7f21c0`,
    scope: { agent_name: AGENT_NAME, user: CUSTOMER.id },
    fact: 'Prefiere retiro en tienda en vez de despacho a domicilio.',
  },
  {
    name: `projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}/memories/mem-7f21c1`,
    scope: { agent_name: AGENT_NAME, user: CUSTOMER.id },
    fact: 'Vive en Valparaíso.',
  },
  {
    name: `projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}/memories/mem-7f21c2`,
    scope: { agent_name: AGENT_NAME, user: CUSTOMER.id },
    fact: 'Compra equipamiento de trekking (zapatillas Cordillera talla 41).',
  },
]

export const CONV1_EVENTS: AdkEvent[] = [
  {
    id: 'm1',
    author: 'user',
    content: { role: 'user', parts: [{ text: 'Hola, soy Camila. Para el pedido 5102 prefiero retiro en tienda, vivo en Valparaíso y el despacho siempre llega tarde.' }] },
    t: 0,
  },
  {
    id: 'm2',
    author: 'pedidos_agent',
    content: { role: 'model', parts: [{ function_call: { name: 'get_order', args: { order_id: '5102' } } }] },
    t: 900,
  },
  {
    id: 'm3',
    author: 'pedidos_agent',
    content: { role: 'user', parts: [{ function_response: { name: 'get_order', response: { status: 'success', order_id: '5102', state: 'preparando', total_clp: 65970 } } }] },
    t: 980,
  },
  {
    id: 'm4',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ text: 'Perfecto, Camila. El pedido 5102 está en preparación; lo dejo marcado para retiro en la tienda de Valparaíso. Te aviso cuando esté listo.' }] },
    actions: { state_delta: { last_order_id: '5102', 'user:preferred_delivery': 'retiro_en_tienda' } },
    t: 1900,
  },
]

export const CONV2_EVENTS: AdkEvent[] = [
  { id: 'n1', author: 'user', content: { role: 'user', parts: [{ text: 'Quiero comprar la mochila 30L, ¿cómo la recibo?' }] }, t: 0 },
  {
    id: 'n2',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ function_call: { name: 'preload_memory', args: {} } }] },
    t: 40,
  },
  {
    id: 'n3',
    author: 'andes_ops',
    content: {
      role: 'user',
      parts: [
        {
          function_response: {
            name: 'preload_memory',
            response: { memories: MEMORY_OBJECTS.map((m) => m.fact) },
          },
        },
      ],
    },
    t: 210,
  },
  {
    id: 'n4',
    author: 'andes_ops',
    content: {
      role: 'model',
      parts: [{ text: 'Como la última vez preferiste retiro en tienda, puedo dejar la mochila 30L lista para retirar en la tienda de Valparaíso en cuanto haya stock (reposición el 18 de noviembre). ¿Te la reservo así?' }],
    },
    t: 1500,
  },
]

export type MemoryStep = { title: string; body: string; phase: 'conv1' | 'save' | 'generate' | 'later' | 'conv2' | 'answer'; upTo1?: number; upTo2?: number; memories?: number }

export const MEMORY_STEPS: MemoryStep[] = [
  {
    title: 'Conversación 1 · lunes',
    body: 'Camila cuenta cosas útiles sin que nadie se las pida: prefiere retiro en tienda, vive en Valparaíso. Quedan en los eventos de la sesión y, de paso, la tool escribe user:preferred_delivery en el estado.',
    phase: 'conv1',
    upTo1: 4,
  },
  {
    title: 'after_agent_callback → add_session_to_memory()',
    body: 'La memoria NO se guarda sola. En andes_prod/agent.py, el callback que corre al terminar cada turno del raíz envía la sesión a Memory Bank. La llamada vuelve enseguida: la generación es asíncrona.',
    phase: 'save',
    upTo1: 4,
  },
  {
    title: 'Memory Bank extrae y consolida hechos',
    body: 'Un LLM lee la conversación y produce "memorias": frases cortas con lo relevante, dentro del scope {agent_name: andes_ops, user: cus_7781}. Si más adelante Camila cambia de preferencia, la memoria se actualiza en vez de duplicarse (consolidación). Cada memoria tiene TTL y revisiones.',
    phase: 'generate',
    upTo1: 4,
    memories: 3,
  },
  {
    title: 'Tres semanas después · sesión nueva',
    body: 'La sesión del lunes ya no importa: es otra conversación (session_id distinto). Lo único que cruza entre sesiones es el estado user:/app: y las memorias.',
    phase: 'later',
    memories: 3,
  },
  {
    title: 'Conversación 2 · preload_memory recupera lo relevante',
    body: 'preload_memory corre automáticamente al inicio del turno: busca por similitud dentro del scope del usuario y mete las memorias en el contexto del modelo (la alternativa load_memory se llama solo cuando el agente lo decide).',
    phase: 'conv2',
    upTo2: 3,
    memories: 3,
  },
  {
    title: 'Respuesta personalizada',
    body: 'Andi propone retiro en Valparaíso sin preguntar. El costo: una generación por sesión guardada y una recuperación por turno (Memory Bank cobra por operación), más los tokens de las memorias en el prompt.',
    phase: 'answer',
    upTo2: 4,
    memories: 3,
  },
]
