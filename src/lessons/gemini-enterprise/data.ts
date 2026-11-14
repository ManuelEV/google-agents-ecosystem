import type { StepInfo } from '../../components/Player'
import { LOCATION, PROJECT_ID, REASONING_ENGINE_ID } from '../../sim/scenario'

export const RESOURCE_PATH = `projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}`
export const APP_ID = 'andes-empleados_1762440100'

export type RegScreen = 'apps' | 'agents-empty' | 'add' | 'auth' | 'configure' | 'created' | 'gallery'
export type RegStep = StepInfo & { screen: RegScreen; focus?: string }

/* Pasos exactos de la documentación (register-and-manage-an-adk-agent), nov-2026. */
export const REG_STEPS: RegStep[] = [
  {
    title: 'Abre la app de Gemini Enterprise',
    body: 'En la consola de Google Cloud, página Gemini Enterprise. Verás las apps de tu organización; cada app es un espacio con sus fuentes de datos y sus agentes. Haz clic en el nombre de la app donde vivirá Andi.',
    screen: 'apps',
    focus: 'app',
  },
  {
    title: 'Agents → Add agent',
    body: 'Dentro de la app, la sección Agents lista los agentes ya registrados (aún ninguno). El botón Add agent abre el panel con los tipos disponibles. Necesitas el rol Gemini Enterprise Admin (discoveryengine.agentspaceAdmin) y la Discovery Engine API habilitada.',
    screen: 'agents-empty',
    focus: 'add',
  },
  {
    title: 'Elige «Custom agent via Agent Runtime»',
    body: 'El panel Add an agent ofrece tres caminos: un agente tuyo en Agent Runtime (nuestro caso), un agente A2A alojado en cualquier parte, o agentes de partners desde el Marketplace. Haz clic en Add junto a Custom agent via Agent Runtime.',
    screen: 'add',
    focus: 'runtime',
  },
  {
    title: 'Authorizations (opcional)',
    body: 'Si el agente debe actuar en nombre del usuario sobre recursos de Google Cloud (por ejemplo leer su Drive), aquí agregas un cliente OAuth: Authorization name, Client ID, Client secret, Token URI y Authorization URI. Andi usa su propia identidad y Toolbox, así que no lo necesita: Next.',
    screen: 'auth',
    focus: 'next',
  },
  {
    title: 'Configura el agente',
    body: 'Tres campos: Agent name (lo que ven los empleados), Describe your agent (¡lo lee el LLM de Gemini Enterprise para decidir cuándo invocarlo!) y Agent Runtime resource path: projects/PROJECT_ID/locations/LOCATION/reasoningEngines/RESOURCE_ID, el que imprimió adk deploy. Create.',
    screen: 'configure',
    focus: 'create',
  },
  {
    title: 'Registrado',
    body: 'El agente aparece en la lista con estado ENABLED. Editar: clic en el nombre → Edit → cambia nombre, descripción o la ruta del reasoning engine → Save. Cada registro consume una unidad de la cuota diaria de creación de agentes.',
    screen: 'created',
  },
  {
    title: 'Camila lo encuentra en la galería',
    body: 'En la app web de Gemini Enterprise, los empleados ven Andi en la galería de agentes y le hablan con su identidad corporativa. La pregunta viaja Gemini Enterprise → Agent Gateway → Agent Runtime → tu código ADK.',
    screen: 'gallery',
  },
]

export const REST_REGISTER = `# examples/andes_prod/register_gemini_enterprise.sh (resumen)
ENDPOINT_LOCATION=global   # us | eu | global

curl -X POST \\
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \\
  -H "Content-Type: application/json" \\
  "https://\${ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/global/collections/default_collection/engines/${APP_ID}/assistants/default_assistant/agents" \\
  -d '{
    "displayName": "Andi · Operaciones",
    "description": "Consulta pedidos, envíos, devoluciones y stock de Andes Market.",
    "adkAgentDefinition": {
      "provisionedReasoningEngine": {
        "reasoningEngine": "${RESOURCE_PATH}"
      }
    }
  }'
# Respuesta: { "name": ".../agents/AGENT_ID", "state": "ENABLED", ... }
`

export const AGENT_CARD = `{
  "protocolVersion": "0.3.0",
  "name": "andes_ops",
  "description": "Operaciones de Andes Market: pedidos, envíos, devoluciones y stock.",
  "url": "https://andes-ops-a2a-xxxxx-uc.a.run.app",
  "version": "1.0.0",
  "capabilities": { "streaming": true },
  "skills": [
    {
      "id": "order-status",
      "name": "Estado de pedidos",
      "description": "Dónde está un pedido y cuándo llega.",
      "tags": ["pedidos"]
    },
    {
      "id": "refunds",
      "name": "Devoluciones",
      "description": "Inicia reembolsos con aprobación.",
      "tags": ["devoluciones"]
    }
  ],
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "iconUrl": "https://andes.example.cl/andi.png"
}`

export type CardField = { id: string; needles: string[]; label: string; body: string; required: boolean }

export const CARD_FIELDS: CardField[] = [
  { id: 'protocol', needles: ['"protocolVersion"'], label: 'protocolVersion', body: 'Gemini Enterprise soporta A2A v0.3 con streaming. Si tu SDK es 1.x, usa el paquete de compatibilidad (a2a.compat.v0_3 en Python).', required: true },
  { id: 'name', needles: ['"name": "andes_ops"', '"description": "Operaciones'], label: 'name · description', body: 'Identidad del agente. La descripción la lee el orquestador remoto para decidir si delega.', required: true },
  { id: 'url', needles: ['"url"'], label: 'url', body: 'Dónde recibe mensajes JSON-RPC (message/send). Si va detrás de un proxy de autenticación, pon la URL del proxy. En Cloud Run con .run.app autenticado, da roles/run.invoker al service agent de Discovery Engine.', required: true },
  { id: 'version', needles: ['"version": "1.0.0"'], label: 'version', body: 'Versión de tu agente (no del protocolo).', required: true },
  { id: 'cap', needles: ['"capabilities"'], label: 'capabilities', body: 'streaming: true permite respuestas incrementales. Aquí también irían extensions (p. ej. la de metadatos de autor para la galería).', required: true },
  { id: 'skills', needles: ['"skills"', '"id": "order-status"', '"id": "refunds"'], label: 'skills[]', body: 'Qué sabe hacer, con id, name, description y tags. Es el "menú" que ven humanos y agentes.', required: true },
  { id: 'modes', needles: ['"defaultInputModes"', '"defaultOutputModes"'], label: 'defaultInputModes · defaultOutputModes', body: 'Tipos MIME que acepta y produce. text/plain para empezar.', required: true },
  { id: 'icon', needles: ['"iconUrl"'], label: 'iconUrl (opcional)', body: 'Imagen para la galería. Gemini Enterprise IGNORA securitySchemes y security del card: no soporta API keys ni headers estáticos.', required: false },
]

export const A2A_EXPOSE = `# examples/andes_prod/a2a_server.py
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from google.adk.a2a.utils.agent_to_a2a import to_a2a

from .agent import root_agent

card = AgentCard(
    name="andes_ops",
    description="Operaciones de Andes Market: pedidos, envíos, devoluciones y stock.",
    url="http://localhost:8001",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=True),
    skills=[AgentSkill(id="order-status", name="Estado de pedidos", description="Dónde está un pedido.", tags=["pedidos"])],
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
)

a2a_app = to_a2a(root_agent, port=8001, agent_card=card)
# uvicorn andes_prod.a2a_server:a2a_app --host 0.0.0.0 --port 8001
# card: http://localhost:8001/.well-known/agent-card.json
`

export const A2A_CONSUME = `# examples/andes_prod/logistics_remote.py
from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH, RemoteA2aAgent

logistics_agent = RemoteA2aAgent(
    name="logistica_agent",
    description="Agente del equipo de logística: reprograma entregas y gestiona incidencias.",
    agent_card=f"https://logistica.andes.example.cl{AGENT_CARD_WELL_KNOWN_PATH}",
    use_legacy=False,
)

# y en el coordinador:
root_agent = Agent(..., sub_agents=[pedidos_agent, devoluciones_agent, analitica_agent, logistics_agent])
`

export type A2AStep = StepInfo & { flows: string[]; active?: string[]; code: string; lang: 'json' | 'http' | 'python' | 'text' }

export const A2A_STEPS: A2AStep[] = [
  {
    title: 'Camila pide reprogramar la entrega',
    body: '"Mi pedido 4821 llega el 14, ¿pueden dejarlo para el 16?" Reprogramar no es cosa de Andi: lo hace el equipo de logística, que tiene su propio agente (quizá en otro proyecto, otra nube o un proveedor).',
    flows: ['user>root'],
    code: 'Mi pedido 4821 llega el 14, ¿pueden dejarlo para el 16?',
    lang: 'text',
  },
  {
    title: 'ADK ya leyó la Agent Card',
    body: 'Al construir RemoteA2aAgent con la URL del card, ADK la descarga de /.well-known/agent-card.json y la convierte en la description de un sub-agente. El coordinador ve a logistica_agent como una opción más de delegación.',
    flows: ['root>card'],
    code: 'GET https://logistica.andes.example.cl/.well-known/agent-card.json\n\n200 OK\n{ "name": "logistica", "skills": [{ "id": "reschedule", "name": "Reprogramar entrega", ... }], "url": "https://logistica.andes.example.cl", "capabilities": { "streaming": true } }',
    lang: 'http',
  },
  {
    title: 'Gemini decide delegar',
    body: 'Con las descripciones de los cuatro sub-agentes en contexto, el modelo elige la herramienta de delegación de logistica_agent. Para ADK es un function_call normal; la diferencia está en cómo se ejecuta.',
    flows: ['root>gemini', 'gemini>root'],
    code: '{ "function_call": { "name": "logistica_agent", "args": { "request": "Reprogramar entrega del pedido 4821 (tracking AX-88213-CL) al 2026-11-16" } } }',
    lang: 'json',
  },
  {
    title: 'message/send por JSON-RPC',
    body: 'RemoteA2aAgent envía un mensaje A2A al url del card. Con use_legacy=False viaja además la extensión ADK (estado y contexto compartidos cuando el otro lado también es ADK).',
    flows: ['root>remote'],
    code: 'POST https://logistica.andes.example.cl\n{\n  "jsonrpc": "2.0", "id": "req-1",\n  "method": "message/send",\n  "params": { "message": { "role": "user", "parts": [{ "kind": "text", "text": "Reprogramar entrega del pedido 4821 (AX-88213-CL) al 2026-11-16" }], "messageId": "m-1" } }\n}',
    lang: 'http',
  },
  {
    title: 'El agente remoto trabaja: Task submitted → working',
    body: 'La respuesta es una Task con estados. Con streaming, Andi recibe actualizaciones mientras logística consulta a AndesExpress y cambia la fecha. Es su código, sus credenciales y sus herramientas: Andi solo ve el resultado.',
    flows: ['remote>carrier', 'carrier>remote'],
    code: '{ "result": { "id": "task-91", "status": { "state": "working" }, "contextId": "ctx-7" } }\n…\n{ "result": { "id": "task-91", "status": { "state": "completed" }, "artifacts": [{ "parts": [{ "kind": "text", "text": "Entrega AX-88213-CL reprogramada para el 2026-11-16, ventana 10:00-14:00." }] }] } }',
    lang: 'json',
  },
  {
    title: 'Andi responde con lo que dijo logística',
    body: 'El resultado de la Task vuelve como function_response y Gemini redacta la respuesta final. Para Camila fue una sola conversación; por detrás colaboraron dos equipos sin compartir código ni bases de datos.',
    flows: ['remote>root', 'root>user'],
    code: 'Listo, Camila: tu pedido 4821 quedó reprogramado para el 16 de noviembre, entre 10:00 y 14:00. Te llegará un aviso de AndesExpress el mismo día.',
    lang: 'text',
  },
]
