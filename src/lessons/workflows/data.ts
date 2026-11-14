import type { AdkEvent } from '../../sim/scenario'
import { runTool } from '../../sim/scenario'

/* ----------------------------- Lab 1: delegación LLM ----------------------------- */

const ORDER_4790 = runTool('get_order_status', { order_id: '4790' })

/** Eventos de "Quiero devolver el pedido 4790" con el coordinador de andes_workflow/agent.py.
    Los argumentos de las herramientas de delegación que inyecta ADK están simplificados. */
export const DELEGATION_EVENTS: AdkEvent[] = [
  { id: 'd1', author: 'user', content: { role: 'user', parts: [{ text: 'Quiero devolver el pedido 4790, el polar llegó con un hoyo.' }] }, t: 0 },
  {
    id: 'd2',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ function_call: { name: 'devoluciones_agent', args: { request: 'Devolución del pedido 4790: polar con un hoyo' } } }] },
    t: 760,
    usage: { prompt: 690, candidates: 24 },
  },
  {
    id: 'd3',
    author: 'devoluciones_agent',
    content: { role: 'model', parts: [{ function_call: { name: 'get_order', args: { order_id: '4790' } } }] },
    t: 1480,
    usage: { prompt: 540, candidates: 16 },
  },
  {
    id: 'd4',
    author: 'devoluciones_agent',
    content: { role: 'user', parts: [{ function_response: { name: 'get_order', response: ORDER_4790 } }] },
    t: 1560,
  },
  {
    id: 'd5',
    author: 'devoluciones_agent',
    content: {
      role: 'model',
      parts: [{ text: 'Confirmo: pedido 4790, Polar Patagonia M, $29.990, entregado el 30 de octubre (dentro de los 30 días). ¿Inicio el reembolso completo por producto dañado?' }],
    },
    t: 2300,
    usage: { prompt: 720, candidates: 58 },
  },
  { id: 'd6', author: 'user', content: { role: 'user', parts: [{ text: 'Sí, por favor.' }] }, t: 9000 },
  {
    id: 'd7',
    author: 'devoluciones_agent',
    content: { role: 'model', parts: [{ function_call: { name: 'request_refund', args: { order_id: '4790', amount_clp: 29990, reason: 'producto dañado' } } }] },
    t: 9700,
    usage: { prompt: 790, candidates: 31 },
  },
  {
    id: 'd8',
    author: 'devoluciones_agent',
    content: { role: 'user', parts: [{ function_response: { name: 'request_refund', response: { status: 'success', refund_id: 'rf_4790_2931', order_id: '4790', amount_clp: 29990 } } }] },
    actions: { state_delta: { 'temp:last_refund_id': 'rf_4790_2931' } },
    t: 9760,
  },
  {
    id: 'd9',
    author: 'devoluciones_agent',
    content: { role: 'model', parts: [{ function_call: { name: 'finish_task', args: {} } }, { text: 'Reembolso rf_4790_2931 por $29.990 iniciado para el pedido 4790.' }] },
    t: 10500,
    usage: { prompt: 860, candidates: 40 },
  },
  {
    id: 'd10',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ text: 'Listo: inicié el reembolso de $29.990 del pedido 4790 por producto dañado (ref. rf_4790_2931). Verás el abono en 5 a 10 días hábiles.' }] },
    t: 11300,
    usage: { prompt: 910, candidates: 52 },
  },
]

export type DelegationStep = { title: string; body: string; upTo: number; active: string[]; flows: string[] }

export const DELEGATION_STEPS: DelegationStep[] = [
  {
    title: 'Llega la petición al coordinador',
    body: 'El raíz andes_ops (gemini-4-hydrogen) no tiene herramientas de negocio: su instrucción le dice que delegue. ADK le inyectó una herramienta por cada sub-agente, con el nombre del sub-agente y su description como descripción.',
    upTo: 1,
    active: ['root'],
    flows: ['user>root'],
  },
  {
    title: 'Elige devoluciones_agent por su description',
    body: '"Gestiona devoluciones y reembolsos de pedidos entregados dentro de los 30 días" encaja con "devolver" y "llegó con un hoyo". El modelo emite un function_call llamado devoluciones_agent: así se ve la delegación en los eventos.',
    upTo: 2,
    active: ['root', 'returns'],
    flows: ['root>returns'],
  },
  {
    title: 'El sub-agente trabaja con sus propias herramientas',
    body: 'devoluciones_agent (gemini-3.8-flash) corre en su propia rama de la sesión y solo ve sus eventos. Verifica el pedido con get_order (MCP Toolbox → Cloud SQL).',
    upTo: 4,
    active: ['returns', 'toolbox'],
    flows: ['returns>toolbox'],
  },
  {
    title: 'mode="task": puede pedir una aclaración',
    body: 'En modo task el sub-agente interactúa con el usuario si necesita confirmar algo. Aquí confirma monto y motivo antes de ejecutar un reembolso. En modo single_turn esto no sería posible.',
    upTo: 6,
    active: ['returns'],
    flows: ['returns>user', 'user>returns'],
  },
  {
    title: 'Ejecuta request_refund',
    body: 'El monto ($29.990) está bajo el umbral de $50.000, así que require_confirmation devuelve False y la función corre sin pausa. La herramienta escribe temp:last_refund_id, que se descarta al terminar la invocación.',
    upTo: 8,
    active: ['returns', 'refund'],
    flows: ['returns>refund'],
  },
  {
    title: 'finish_task devuelve el control al coordinador',
    body: 'Cuando el sub-agente termina llama finish_task (también inyectado por ADK). En modo chat habría que llamar transfer_to_agent explícitamente; en task el retorno es automático.',
    upTo: 9,
    active: ['returns', 'root'],
    flows: ['returns>root'],
  },
  {
    title: 'El coordinador redacta la respuesta final',
    body: 'andes_ops recibe el resultado y responde al usuario. En la pestaña Events de adk web verás exactamente esta secuencia: una llamada a devoluciones_agent, las herramientas del sub-agente, finish_task y el texto final.',
    upTo: 10,
    active: ['root'],
    flows: ['root>user'],
  },
]

/* ----------------------------- Lab 2: grafo ----------------------------- */

export type GraphScenario = 'pedidos' | 'devoluciones' | 'analitica'

export const GRAPH_SCENARIOS: Record<GraphScenario, { message: string; label: string; specialist: string; result: string }> = {
  pedidos: {
    message: '¿Dónde está mi pedido 4821?',
    label: 'PEDIDOS',
    specialist: 'pedidos',
    result: 'Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL). Entrega estimada: 14 de noviembre.',
  },
  devoluciones: {
    message: 'Reembolsa $65.000 del pedido 5102, llegó incompleto.',
    label: 'DEVOLUCIONES',
    specialist: 'devoluciones',
    result: 'Solicitud de reembolso de $65.000 para el pedido 5102 registrada (producto incompleto).',
  },
  analitica: {
    message: '¿Cuánto vendimos los últimos 7 días?',
    label: 'ANALITICA',
    specialist: 'analitica',
    result: 'Ventas últimos 7 días: $1.248.760 en 19 pedidos. Mejor día: 12-nov ($312.900).',
  },
}

export type GraphStep = { title: string; body: string; nodes: string[]; edges: string[]; pause?: boolean; final?: boolean }

export function graphSteps(s: GraphScenario): GraphStep[] {
  const sc = GRAPH_SCENARIOS[s]
  const steps: GraphStep[] = [
    {
      title: 'START → triage',
      body: `El mensaje "${sc.message}" entra por START. El primer nodo es triage: un Agent con gemini-3.5-flash-lite e include_contents="none" que solo devuelve una etiqueta. Barato y rápido.`,
      nodes: ['start', 'triage'],
      edges: ['start>triage'],
    },
    {
      title: `triage responde "${sc.label}"`,
      body: 'La salida del nodo (el texto del agente) pasa como node_input al siguiente nodo. No hace falta escribir en session.state para mover datos entre nodos.',
      nodes: ['triage', 'route'],
      edges: ['triage>route'],
    },
    {
      title: 'route() elige la arista',
      body: `Una función Python pura normaliza la etiqueta y devuelve Event(route="${sc.label}"). El dict de la arista mapea cada ruta a un nodo. Es determinista: puedes testearlo con pytest sin modelo.`,
      nodes: ['route', sc.specialist],
      edges: [`route>${sc.specialist}`],
    },
    {
      title: `${sc.specialist}_agent resuelve`,
      body: 'El especialista (gemini-3.8-flash) usa sus herramientas de MCP Toolbox y responde. Como agente dentro del grafo sí ve la conversación del usuario.',
      nodes: [sc.specialist],
      edges: [],
    },
  ]
  if (s === 'devoluciones') {
    steps.push(
      {
        title: 'supervisor_review hace yield RequestInput: el grafo se PAUSA',
        body: 'El nodo pide una decisión humana con RequestInput(message=..., payload=...). ADK persiste el estado y la invocación queda interrumpida hasta que llegue la respuesta. Decide tú con los botones.',
        nodes: ['devoluciones', 'review'],
        edges: ['devoluciones>review'],
        pause: true,
      },
      {
        title: 'Se reanuda con la respuesta del supervisor',
        body: 'La respuesta llega como resultado del yield; el nodo emite Event(message=...) con el veredicto. Como el nodo tiene rerun_on_resume por defecto en False para hojas, no se re-ejecuta: continúa desde el yield.',
        nodes: ['review', 'end'],
        edges: ['review>end'],
        final: true,
      },
    )
  } else {
    steps.push({
      title: 'Fin del workflow',
      body: 'El último nodo devuelve la respuesta al usuario. Sin ciclos: el grafo siempre termina. Si agregaras una arista de vuelta (p. ej. reintentar), ADK exige que el ciclo tenga al menos una arista ruteada y NO lo acota solo.',
      nodes: [sc.specialist, 'end'],
      edges: [`${sc.specialist}>end`],
      final: true,
    })
  }
  return steps
}

/* ----------------------------- Lab 3: modos ----------------------------- */

export type Mode = 'chat' | 'task' | 'single_turn'

export const MODES: Record<Mode, { title: string; interaction: string; back: string; parallel: string; when: string }> = {
  chat: {
    title: 'chat (por defecto)',
    interaction: 'Interacción completa con el usuario: el sub-agente se queda conversando.',
    back: 'Manual: debe llamar transfer_to_agent para devolver el control al padre.',
    parallel: 'No.',
    when: 'Cuando el sub-agente "toma" la conversación por un rato (p. ej. un asistente de devoluciones que guía varios pasos).',
  },
  task: {
    title: 'task',
    interaction: 'Puede pedir aclaraciones al usuario.',
    back: 'Automático al llamar finish_task.',
    parallel: 'No.',
    when: 'Tareas acotadas que a veces necesitan confirmar algo. Debe ser hoja (sin sub-agentes); desactivado dentro de grafos en 2.0.0.',
  },
  single_turn: {
    title: 'single_turn',
    interaction: 'Ninguna: recibe la petición y devuelve un resultado.',
    back: 'Automático con el resultado.',
    parallel: 'Sí: varios single_turn pueden correr a la vez.',
    when: 'Especialistas puros (clasificar, buscar, resumir). Se puede exponer como herramienta inline.',
  },
}

/* ----------------------------- Lab 4: editor de descriptions ----------------------------- */

export const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  pedidos_agent: 'Responde preguntas sobre el estado de pedidos y envíos: dónde está, cuándo llega, qué incluye.',
  devoluciones_agent: 'Gestiona devoluciones y reembolsos de pedidos entregados dentro de los 30 días.',
  analitica_agent: 'Para el equipo interno: ventas por día, stock por SKU y resúmenes operativos.',
}

export const SAMPLE_MESSAGES = [
  '¿Cuándo llega mi pedido 5102?',
  'Quiero devolver unas zapatillas que me quedaron chicas.',
  '¿Cuánto stock queda de MOCH-30L-AZ?',
  'Necesito el reporte de ventas de la semana.',
]

/* ----------------------------- Código ----------------------------- */

export const CODE_COORDINATOR = `pedidos_agent = Agent(
    name="pedidos_agent",
    model=MODEL_WORKER,            # gemini-3.8-flash
    mode="task",                   # vuelve solo al coordinador con finish_task
    description="Responde preguntas sobre el estado de pedidos y envíos: dónde está, cuándo llega, qué incluye.",
    instruction=ROOT_INSTRUCTION + "\\nSolo pedidos y envíos. Usa get_order y, si hay código de seguimiento, track_shipment.",
    tools=[db_tools, carrier_tools],
)

devoluciones_agent = Agent(
    name="devoluciones_agent",
    model=MODEL_WORKER,
    mode="task",
    description="Gestiona devoluciones y reembolsos de pedidos entregados dentro de los 30 días.",
    instruction=ROOT_INSTRUCTION + "\\nSolo devoluciones. Verifica el pedido con get_order, confirma monto y motivo ...",
    tools=[db_tools, refund_tool],
)

root_agent = Agent(
    name="andes_ops",
    model=MODEL_ROOT,              # gemini-4-hydrogen: orquesta
    description="Coordinador de operaciones de Andes Market.",
    instruction="""Eres Andi, coordinador de operaciones de Andes Market.
No respondas preguntas de negocio tú mismo: delega en el sub-agente adecuado según su descripción.
- Pedidos y envíos → pedidos_agent
- Devoluciones y reembolsos → devoluciones_agent
- Ventas, stock y reportes internos → analitica_agent
Si la consulta no encaja en ninguno, pide una aclaración breve.""",
    sub_agents=[pedidos_agent, devoluciones_agent, analitica_agent],   # ADK inyecta una tool por cada uno
)
`

export const CODE_GRAPH = `from google.adk import Agent, Event, Workflow
from google.adk.events import RequestInput

triage = Agent(
    name="triage",
    model=MODEL_LITE,              # gemini-3.5-flash-lite
    include_contents="none",       # no necesita historial
    instruction="Clasifica el mensaje en UNA etiqueta: PEDIDOS, DEVOLUCIONES, ANALITICA u OTRO.",
)

def route(node_input: str):
    label = (node_input or "").strip().upper()
    if label not in {"PEDIDOS", "DEVOLUCIONES", "ANALITICA"}:
        label = "OTRO"
    return Event(route=label, output=label)

async def supervisor_review(node_input: str):
    reply = yield RequestInput(
        message="Un supervisor debe revisar esta devolución. ¿Aprobar? (sí/no)",
        payload={"refund_summary": node_input},
    )
    decision = str(reply).strip().lower()
    yield Event(message="Devolución aprobada por supervisor." if decision.startswith("s") else "Devolución rechazada por supervisor.")

def otro(node_input: str):
    return Event(message="Puedo ayudarte con pedidos, devoluciones o reportes internos. ¿Cuál necesitas?")

root_agent = Workflow(
    name="andes_ops",
    edges=[
        ("START", triage, route),
        (route, {"PEDIDOS": pedidos, "DEVOLUCIONES": devoluciones, "ANALITICA": analitica, "OTRO": otro}),
        (devoluciones, supervisor_review),
    ],
)
`
