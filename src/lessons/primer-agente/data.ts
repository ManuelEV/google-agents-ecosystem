import { cmd, dim, ok, out, warn, type TermLine } from '../../components/Terminal'
import type { AdkEvent } from '../../sim/scenario'
import { AGENT_NAME, orderById, runTool } from '../../sim/scenario'

/* Código idéntico a examples/andes_hello/agent.py (sin el docstring de módulo). */
export const AGENT_CODE = `from google.adk.agents import Agent
from google.adk.tools import ToolContext

from andes_common import ORDERS, ROOT_INSTRUCTION

MODEL = "gemini-3.8-flash"  # Flash GA más reciente (nov-2026). Alias de la doc: "gemini-flash-latest".


def get_order_status(order_id: str, tool_context: ToolContext) -> dict:
    """Devuelve el estado, los ítems y el seguimiento de un pedido de Andes Market.

    Úsala cuando el usuario pregunte por un pedido concreto.

    Args:
        order_id: Número del pedido, por ejemplo "4821".

    Returns:
        dict con status "success" y los datos del pedido, o status "error" con
        error_message si el pedido no existe.
    """
    order = ORDERS.get(order_id.strip())
    if order is None:
        return {"status": "error", "error_message": f"No existe el pedido {order_id}. Pide al usuario que verifique el número."}

    # Estado de sesión: sin prefijo = vive en esta conversación.
    tool_context.state["last_order_id"] = order_id
    return {
        "status": "success",
        "order_id": order["order_id"],
        "state": order["state"],
        "items": [f'{i["qty"]}× {i["name"]}' for i in order["items"]],
        "total_clp": order["total_clp"],
        "carrier": order["carrier"],
        "tracking": order["tracking"],
        "eta": order["eta"],
    }


root_agent = Agent(
    name="andes_ops",
    model=MODEL,
    description="Agente de operaciones de Andes Market: pedidos, envíos y devoluciones.",
    instruction=ROOT_INSTRUCTION,
    tools=[get_order_status],
)
`

export const FUNC_CODE = `def get_order_status(order_id: str, tool_context: ToolContext) -> dict:
    """Devuelve el estado, los ítems y el seguimiento de un pedido de Andes Market.

    Úsala cuando el usuario pregunte por un pedido concreto.

    Args:
        order_id: Número del pedido, por ejemplo "4821".

    Returns:
        dict con status "success" y los datos del pedido, o status "error" con
        error_message si el pedido no existe.
    """
    ...
`

/* Partes de la anatomía: qué líneas del código resalta cada una. */
export type AnatomyPart = { id: string; label: string; desc: string; needles: string[]; tone: 'model' | 'tool' | 'user' | 'data' | 'system' | 'memory' }
export const ANATOMY: AnatomyPart[] = [
  { id: 'name', label: 'name', desc: 'Identificador único. Lo usan la delegación entre agentes y adk web. Debe ser un identificador Python válido; "user" está reservado.', needles: ['name="andes_ops"'], tone: 'model' },
  { id: 'model', label: 'model', desc: 'String del modelo (o un BaseLlm). Si un sub-agente no lo define, hereda el del ancestro más cercano.', needles: ['MODEL = "gemini-3.8-flash"', 'model=MODEL'], tone: 'model' },
  { id: 'description', label: 'description', desc: 'Para otros agentes, no para el usuario: con ella un coordinador decide cuándo delegar aquí. Sé específico.', needles: ['description="Agente'], tone: 'system' },
  { id: 'instruction', label: 'instruction', desc: 'El system prompt: persona, reglas, cuándo usar cada herramienta, formato. Admite {clave} para inyectar estado de sesión.', needles: ['instruction=ROOT_INSTRUCTION'], tone: 'user' },
  { id: 'tools', label: 'tools', desc: 'Una lista de funciones Python. ADK las envuelve en FunctionTool automáticamente: nombre + type hints + docstring → esquema para Gemini.', needles: ['tools=[get_order_status]', 'def get_order_status'], tone: 'tool' },
  { id: 'return', label: 'return dict + status', desc: 'La herramienta devuelve un dict con "status". Si falla, "error_message" legible: el modelo lo lee y decide qué decir. No lances excepciones para errores de negocio.', needles: ['"status": "error"', '"status": "success"'], tone: 'data' },
  { id: 'ctx', label: 'tool_context', desc: 'Un parámetro anotado como ToolContext se detecta por tipo, se oculta al modelo y te da state, actions y artefactos.', needles: ['tool_context: ToolContext', 'tool_context.state["last_order_id"]'], tone: 'memory' },
]

/* Mapeo función → FunctionDeclaration. */
export type MapRow = { id: string; label: string; pyNeedles: string[]; jsonNeedles: string[]; note: string }
export const MAPPING: MapRow[] = [
  { id: 'name', label: 'nombre de la función → name', pyNeedles: ['def get_order_status'], jsonNeedles: ['"name"'], note: 'El nombre de la función es el nombre de la herramienta que verá el modelo. Elige verbos claros: get_, search_, request_.' },
  { id: 'desc', label: 'docstring → description', pyNeedles: ['"""Devuelve', 'Úsala cuando'], jsonNeedles: ['"description"'], note: 'La primera parte del docstring es la descripción. Es lo único que el modelo lee para decidir SI llamarla: escribe para él, incluyendo cuándo usarla.' },
  { id: 'params', label: 'type hints → parameters', pyNeedles: ['order_id: str'], jsonNeedles: ['"properties"', '"order_id"', '"type": "STRING"'], note: 'order_id: str se convierte en una propiedad STRING. La sección Args del docstring aporta la descripción del parámetro.' },
  { id: 'required', label: 'sin default → required', pyNeedles: ['order_id: str'], jsonNeedles: ['"required"'], note: 'Un parámetro con tipo y sin valor por defecto es obligatorio. Optional[...] solo no basta: necesita = None para ser opcional.' },
  { id: 'hidden', label: 'ToolContext → se oculta', pyNeedles: ['tool_context: ToolContext'], jsonNeedles: [], note: 'tool_context no aparece en el esquema: ADK lo detecta por tipo y lo inyecta al ejecutar. El modelo nunca lo ve.' },
]

/* Lab principal: pasos de la invocación sincronizados con eventos, chat, estado y diagrama. */
export type RunStep = {
  title: string
  body: string
  /** cuántos eventos de FIRST_RUN_EVENTS son visibles */
  events: number
  /** chat visible */
  chat: { role: 'user' | 'agent'; text: string }[]
  typing?: boolean
  state: Record<string, unknown>
  changed?: string[]
  flows: string[]
  active?: string[]
  codeNeedles?: string[]
}
const FINAL_TEXT = 'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. La entrega estimada es el 14 de noviembre.'
const BASE_STATE = { 'user:name': 'Camila', 'user:tier': 'plus' }
export const RUN_STEPS: RunStep[] = [
  {
    title: 'Camila escribe en adk web',
    body: 'adk web levanta un servidor local con el chat y los paneles de depuración. El mensaje se convierte en types.Content(role="user") y entra al Runner como new_message. Es el evento 1, autor "user".',
    events: 1,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    state: BASE_STATE,
    flows: ['user>runner'],
    codeNeedles: ['new_message=content'],
  },
  {
    title: 'El Runner carga la sesión y llama al agente',
    body: 'El Runner pide la sesión al SessionService (en adk web, en memoria), agrega el evento del usuario al historial y le pasa el control a andes_ops. El estado ya traía datos del usuario (user:name, user:tier).',
    events: 1,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    typing: true,
    state: BASE_STATE,
    flows: ['runner>session', 'runner>agent'],
    codeNeedles: ['session_service.create_session'],
  },
  {
    title: 'call_llm: instrucción + historial + herramientas → Gemini',
    body: 'El agente arma la petición: ROOT_INSTRUCTION como system instruction, los eventos de la sesión como contents y la FunctionDeclaration de get_order_status en tools. ~412 tokens de entrada.',
    events: 1,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    typing: true,
    state: BASE_STATE,
    flows: ['agent>gemini'],
    codeNeedles: ['runner.run_async('],
  },
  {
    title: 'Gemini responde con un function_call',
    body: 'El modelo no escribe texto: devuelve una parte function_call con name="get_order_status" y args={"order_id": "4821"}. ADK lo registra como evento 2 (autor andes_ops, rol model).',
    events: 2,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    typing: true,
    state: BASE_STATE,
    flows: ['gemini>agent'],
    codeNeedles: ['part.function_call'],
  },
  {
    title: 'ADK ejecuta la función Python',
    body: 'ADK valida los argumentos contra el esquema, inyecta tool_context y llama a get_order_status("4821"). La función escribe tool_context.state["last_order_id"] y devuelve el dict con status "success".',
    events: 2,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    typing: true,
    state: BASE_STATE,
    flows: ['agent>tool'],
    codeNeedles: ['tool_context.state["last_order_id"]'],
  },
  {
    title: 'function_response: el resultado vuelve al historial',
    body: 'El dict se envuelve en una parte function_response (evento 3). Fíjate en el rol: es "user" aunque el autor sea andes_ops, porque para Gemini el resultado de una herramienta llega "desde fuera" del modelo.',
    events: 3,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    typing: true,
    state: BASE_STATE,
    flows: ['tool>agent'],
    codeNeedles: ['part.function_response'],
  },
  {
    title: 'Segunda call_llm con el resultado',
    body: 'El agente vuelve a llamar a Gemini con todo el historial (ahora incluye call + response). ~498 tokens de entrada. Esta vez el modelo tiene lo que necesita y redacta.',
    events: 3,
    chat: [{ role: 'user', text: '¿Dónde está mi pedido 4821?' }],
    typing: true,
    state: BASE_STATE,
    flows: ['agent>gemini', 'gemini>agent'],
    codeNeedles: ['runner.run_async('],
  },
  {
    title: 'Respuesta final + state_delta',
    body: 'Evento 4: texto para Camila. is_final_response() es True. El cambio de estado que hizo la herramienta viaja en actions.state_delta y el SessionService lo persiste: last_order_id = "4821" queda disponible para el siguiente turno.',
    events: 4,
    chat: [
      { role: 'user', text: '¿Dónde está mi pedido 4821?' },
      { role: 'agent', text: FINAL_TEXT },
    ],
    state: { ...BASE_STATE, last_order_id: '4821' },
    changed: ['last_order_id'],
    flows: ['agent>runner', 'runner>session', 'runner>user'],
    codeNeedles: ['event.is_final_response()', 'state_delta'],
  },
]

/* Código del bucle Runner (examples/scripts/run_local.py, recortado). */
export const RUNNER_CODE = `from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name="andes_hello", session_service=session_service)
session = await session_service.create_session(
    app_name="andes_hello", user_id="cus_7781", state={"user:name": "Camila", "user:tier": "plus"}
)

content = types.Content(role="user", parts=[types.Part(text="¿Dónde está mi pedido 4821?")])
async for event in runner.run_async(user_id="cus_7781", session_id=session.id, new_message=content):
    for part in event.content.parts if event.content else []:
        if part.function_call:
            print(f"[{event.author}] → function_call {part.function_call.name} {dict(part.function_call.args)}")
        elif part.function_response:
            print(f"[{event.author}] ← function_response {part.function_response.name} {part.function_response.response}")
        elif part.text:
            tag = "FINAL" if event.is_final_response() else "text"
            print(f"[{event.author}] {tag}: {part.text}")
    if event.actions and event.actions.state_delta:
        print(f"   state_delta: {event.actions.state_delta}")
`

/* Caso de error / variantes de pedido. */
export function buildRun(orderId: string): { events: AdkEvent[]; answer: string } {
  const resp = runTool('get_order_status', { order_id: orderId })
  const o = orderById(orderId)
  let answer: string
  if (resp.status === 'error') {
    answer = `No encuentro ningún pedido con el número ${orderId}. ¿Puedes verificarlo en tu correo de confirmación? Suele ser un número de cuatro cifras, como 4821.`
  } else if (o?.status === 'en_ruta') {
    answer = FINAL_TEXT
  } else if (o?.status === 'preparando') {
    answer = `Tu pedido ${orderId} (${o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}, $${o.total.toLocaleString('es-CL')}) está en preparación. Todavía no tiene transportista asignado; te avisaremos con el código de seguimiento cuando salga de bodega.`
  } else {
    answer = `Tu pedido ${orderId} (${o!.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}) ya fue entregado con AndesExpress (seguimiento ${o!.tracking}). Si algo llegó mal, puedo ayudarte con una devolución.`
  }
  const events: AdkEvent[] = [
    { id: 'u', author: 'user', content: { role: 'user', parts: [{ text: `¿Dónde está mi pedido ${orderId}?` }] } },
    { id: 'c', author: AGENT_NAME, content: { role: 'model', parts: [{ function_call: { name: 'get_order_status', args: { order_id: orderId } } }] } },
    { id: 'r', author: AGENT_NAME, content: { role: 'user', parts: [{ function_response: { name: 'get_order_status', response: resp } }] } },
    {
      id: 'f',
      author: AGENT_NAME,
      content: { role: 'model', parts: [{ text: answer }] },
      actions: resp.status === 'error' ? undefined : { state_delta: { last_order_id: orderId } },
    },
  ]
  return { events, answer }
}

export const TERM_RUN: TermLine[] = [
  cmd('adk web --port 8000'),
  out('INFO:     Started server process [48213]'),
  ok('INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)'),
  dim('# en el navegador: elige "andes_hello" en el desplegable y escribe. Pestañas Events / State / Trace a la derecha.'),
  warn('adk web es solo para desarrollo.'),
  cmd('adk run andes_hello'),
  out('Running agent andes_ops, type exit to exit.'),
  out('[user]: ¿Dónde está mi pedido 4821?'),
  dim('[andes_ops]: → get_order_status({"order_id": "4821"})'),
  ok('[andes_ops]: Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. La entrega estimada es el 14 de noviembre.'),
  cmd('python scripts/run_local.py andes_hello "¿Dónde está mi pedido 4821?"'),
  out('[user] text: ¿Dónde está mi pedido 4821?'),
  out("[andes_ops] → function_call get_order_status {'order_id': '4821'}"),
  out("[andes_ops] ← function_response get_order_status {'status': 'success', 'order_id': '4821', 'state': 'en_ruta', ...}"),
  ok('[andes_ops] FINAL: Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress…'),
  dim("   state_delta: {'last_order_id': '4821'}"),
  out("session.state: {'user:name': 'Camila', 'user:customer_id': 'cus_7781', 'user:role': 'customer', 'last_order_id': '4821'}"),
]
