import type { AdkEvent } from '../../sim/scenario'

/* ------------------------------------------------------------------------ */
/* Código mostrado (coincide con examples/andes_data/tools.py)               */
/* ------------------------------------------------------------------------ */

export const MCP_CODE = `import os

from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

carrier_tools = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url=os.environ.get("CARRIER_MCP_URL", "http://127.0.0.1:8081/mcp"),
        headers={"X-API-Key": os.environ.get("CARRIER_API_KEY", "dev-key-andesexpress")},
        timeout=10,
    ),
    # Siempre filtra: expón solo lo que el agente necesita.
    tool_filter=["track_shipment"],
)

root_agent = Agent(
    name="andes_ops",
    model="gemini-3.8-flash",
    instruction=INSTRUCTION,
    tools=[db_tools, carrier_tools, refund_tool],
)
`

export const MCP_SERVER_CODE = `from mcp.server.fastmcp import FastMCP

mcp = FastMCP("andesexpress", host="127.0.0.1", port=8081)


@mcp.tool()
def track_shipment(tracking: str) -> dict:
    """Devuelve el último evento y la fecha estimada de entrega de un envío de AndesExpress."""
    data = SHIPMENTS.get(tracking.strip().upper())
    if data is None:
        return {"status": "error", "error_message": f"Código de seguimiento desconocido: {tracking}"}
    return {"status": "success", "tracking": tracking.upper(), **data}


@mcp.tool()
def list_service_points(city: str) -> dict:
    """Lista puntos de retiro de AndesExpress en una ciudad."""
    ...


if __name__ == "__main__":
    mcp.run(transport="streamable-http")   # http://127.0.0.1:8081/mcp
`

export const CONFIRM_CODE = `from google.adk.tools import FunctionTool, ToolContext

from andes_common import ORDERS, REFUND_POLICY


def needs_approval(order_id: str, amount_clp: int, reason: str) -> bool:
    """Decide si request_refund requiere confirmación: solo sobre el umbral de la política."""
    return amount_clp > REFUND_POLICY["auto_approve_max_clp"]


def request_refund(order_id: str, amount_clp: int, reason: str, tool_context: ToolContext) -> dict:
    """Inicia un reembolso para un pedido.

    Montos hasta $50.000 se aprueban automáticamente. Sobre ese monto, ADK
    pausa y pide confirmación a un humano antes de ejecutar esta función.
    """
    order = ORDERS.get(order_id)
    if order is None:
        return {"status": "error", "error_message": f"No existe el pedido {order_id}."}
    if amount_clp > order["total_clp"]:
        return {"status": "error", "error_message": f"El monto supera el total del pedido ({order['total_clp']})."}

    refund_id = f"rf_{order_id}_{abs(hash(reason)) % 10_000:04d}"
    tool_context.state["temp:last_refund_id"] = refund_id
    return {"status": "success", "refund_id": refund_id, "order_id": order_id, "amount_clp": amount_clp}


# require_confirmation acepta True/False o una función con los mismos argumentos que la tool.
refund_tool = FunctionTool(request_refund, require_confirmation=needs_approval)
`

export const LONG_RUNNING_CODE = `from google.adk.tools import LongRunningFunctionTool

def start_bulk_export(customer_id: str) -> dict:
    """Lanza una exportación larga y devuelve un ticket; el agente se pausa."""
    return {"status": "pending", "ticket_id": "exp_1182"}

export_tool = LongRunningFunctionTool(func=start_bulk_export)
# El cliente consulta el progreso y envía un FunctionResponse intermedio o final.
`

export const AGENT_TOOL_CODE = `from google.adk.agents import Agent
from google.adk.tools import AgentTool

resumidor = Agent(name="resumidor", model="gemini-3.5-flash-lite",
                  instruction="Resume en 3 líneas el texto que recibes.")

root_agent = Agent(
    name="andes_ops",
    model="gemini-3.8-flash",
    tools=[AgentTool(agent=resumidor)],   # el raíz lo invoca como una función más
)
`

export const APP_INTEGRATION_CODE = `from google.adk.tools.application_integration_tool.application_integration_toolset import ApplicationIntegrationToolset

crm_tools = ApplicationIntegrationToolset(
    project="andes-market-prod",
    location="us-central1",
    connection="salesforce-crm",          # conexión creada en Integration Connectors
    entity_operations={"Case": ["GET", "LIST"]},
    actions=[],
    tool_name_prefix="crm",
    tool_instructions="Casos de soporte del CRM. Solo lectura.",
)
`

export const BIGQUERY_CODE = `import google.auth
from google.adk.integrations.bigquery import BigQueryCredentialsConfig, BigQueryToolset
from google.adk.integrations.bigquery.config import BigQueryToolConfig, WriteMode

creds, _ = google.auth.default()
bq_tools = BigQueryToolset(
    credentials_config=BigQueryCredentialsConfig(credentials=creds),
    bigquery_tool_config=BigQueryToolConfig(write_mode=WriteMode.BLOCKED),  # solo lectura
)
`

/* ------------------------------------------------------------------------ */
/* Lab MCP · pasos del handshake simplificado                                */
/* ------------------------------------------------------------------------ */

export type McpStep = {
  title: string
  body: string
  flows: string[]
  active?: string[]
  code: string
  codeTitle: string
  lang: 'json' | 'python' | 'text'
}

export const MCP_STEPS: McpStep[] = [
  {
    title: 'Se construye el McpToolset (sin conectar)',
    body: 'Al crear el agente, McpToolset solo guarda la URL, los headers y el tool_filter. No abre ninguna conexión: lo hará la primera vez que el agente necesite sus herramientas. Por eso conviene definirlo de forma sincrónica en agent.py.',
    flows: [],
    active: ['adk'],
    code: `carrier_tools = McpToolset(
    connection_params=StreamableHTTPConnectionParams(url="http://127.0.0.1:8081/mcp", headers={...}),
    tool_filter=["track_shipment"],
)`,
    codeTitle: 'agent.py · construcción',
    lang: 'python',
  },
  {
    title: 'Primer turno: ADK abre la sesión MCP',
    body: 'Llega la primera pregunta. Antes de llamar a Gemini, ADK necesita la lista de herramientas, así que el cliente MCP (dentro de ADK) envía initialize al servidor por Streamable HTTP, con el header X-API-Key que configuraste.',
    flows: ['adk>mcp'],
    code: `POST http://127.0.0.1:8081/mcp
X-API-Key: dev-key-andesexpress

{"jsonrpc": "2.0", "id": 1, "method": "initialize",
 "params": {"protocolVersion": "2025-11-25", "clientInfo": {"name": "google-adk"}}}`,
    codeTitle: 'JSON-RPC · initialize',
    lang: 'json',
  },
  {
    title: 'tools/list: el servidor publica todo lo que sabe hacer',
    body: 'El servidor FastMCP responde con las dos herramientas que definiste con @mcp.tool(): track_shipment y list_service_points, cada una con su inputSchema generado desde la firma Python.',
    flows: ['mcp>adk'],
    code: `{"jsonrpc": "2.0", "id": 2, "result": {"tools": [
  {"name": "track_shipment",
   "description": "Devuelve el último evento y la fecha estimada de entrega de un envío de AndesExpress.",
   "inputSchema": {"type": "object", "properties": {"tracking": {"type": "string"}}, "required": ["tracking"]}},
  {"name": "list_service_points",
   "description": "Lista puntos de retiro de AndesExpress en una ciudad.",
   "inputSchema": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}
]}}`,
    codeTitle: 'JSON-RPC · tools/list → resultado',
    lang: 'json',
  },
  {
    title: 'tool_filter deja pasar solo track_shipment',
    body: 'ADK descarta list_service_points porque no está en tool_filter. Lo que Gemini verá es una única FunctionDeclaration. Menos herramientas = menos superficie de ataque y menos confusión para el modelo.',
    flows: [],
    active: ['adk'],
    code: `{"name": "track_shipment",
 "description": "Devuelve el último evento y la fecha estimada de entrega de un envío de AndesExpress.",
 "parameters": {"type": "OBJECT", "properties": {"tracking": {"type": "STRING"}}, "required": ["tracking"]}}`,
    codeTitle: 'FunctionDeclaration enviada a Gemini (tras el filtro)',
    lang: 'json',
  },
  {
    title: 'Gemini decide llamar a la herramienta',
    body: 'Con la pregunta "¿dónde viene el 4821?" y el tracking AX-88213-CL que ya obtuvo del pedido, el modelo responde con un function_call. ADK lo recibe como un evento con author andes_ops.',
    flows: ['adk>gemini', 'gemini>adk'],
    code: `{"author": "andes_ops",
 "content": {"role": "model", "parts": [
   {"function_call": {"name": "track_shipment", "args": {"tracking": "AX-88213-CL"}}}]}}`,
    codeTitle: 'Evento ADK · function_call',
    lang: 'json',
  },
  {
    title: 'ADK traduce el function_call a tools/call',
    body: 'El cliente MCP de ADK empaqueta los argumentos en una llamada JSON-RPC tools/call y la envía al servidor. El servidor ejecuta tu función Python (que en la vida real pegaría a la API REST de AndesExpress).',
    flows: ['adk>mcp', 'mcp>api'],
    code: `{"jsonrpc": "2.0", "id": 3, "method": "tools/call",
 "params": {"name": "track_shipment", "arguments": {"tracking": "AX-88213-CL"}}}`,
    codeTitle: 'JSON-RPC · tools/call',
    lang: 'json',
  },
  {
    title: 'El resultado vuelve como function_response',
    body: 'El servidor devuelve el dict de tu función. ADK lo envuelve en un function_response y lo agrega al contexto de la sesión; Gemini lo verá en la siguiente llamada al modelo.',
    flows: ['api>mcp', 'mcp>adk'],
    code: `{"author": "andes_ops",
 "content": {"role": "user", "parts": [
   {"function_response": {"name": "track_shipment", "response": {
      "status": "success", "tracking": "AX-88213-CL",
      "last_event": "En reparto · Valparaíso", "eta": "2026-11-14",
      "updated_at": "2026-11-13T09:40:00-03:00"}}}]}}`,
    codeTitle: 'Evento ADK · function_response',
    lang: 'json',
  },
  {
    title: 'Gemini redacta la respuesta',
    body: 'Con el resultado en el contexto, el modelo genera el texto final. La sesión MCP queda abierta para los siguientes turnos; ADK la cierra al terminar el runner.',
    flows: ['adk>gemini', 'gemini>adk'],
    code: `Tu pedido 4821 está en reparto en Valparaíso (AndesExpress AX-88213-CL).
La entrega estimada es el 14 de noviembre.`,
    codeTitle: 'Respuesta final',
    lang: 'text',
  },
]

/* ------------------------------------------------------------------------ */
/* Lab confirmación · eventos                                                */
/* ------------------------------------------------------------------------ */

export const REFUND_CALL_ID = 'adk-5f1c2a'

export const CONFIRM_BASE_EVENTS: AdkEvent[] = [
  { id: 'c1', author: 'user', content: { role: 'user', parts: [{ text: 'Reembolsa $65.000 del pedido 5102, la mochila llegó dañada.' }] }, t: 0 },
  {
    id: 'c2',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ function_call: { name: 'request_refund', args: { order_id: '5102', amount_clp: 65000, reason: 'producto dañado' } } }] },
    t: 910,
    usage: { prompt: 1210, candidates: 34 },
  },
  {
    id: 'c3',
    author: 'andes_ops',
    content: {
      role: 'model',
      parts: [
        {
          function_call: {
            name: 'adk_request_confirmation',
            args: {
              originalFunctionCall: { id: REFUND_CALL_ID, name: 'request_refund', args: { order_id: '5102', amount_clp: 65000, reason: 'producto dañado' } },
              toolConfirmation: { hint: 'Un supervisor debe aprobar este reembolso (sobre $50.000).', confirmed: false },
            },
          },
        },
      ],
    },
    t: 925,
  },
]

export const CONFIRM_APPROVED_EVENTS: AdkEvent[] = [
  {
    id: 'c4a',
    author: 'user',
    content: { role: 'user', parts: [{ function_response: { name: 'adk_request_confirmation', response: { confirmed: true, payload: { approved_by: 'supervisor@andesmarket.cl' } } } }] },
    t: 41_200,
  },
  {
    id: 'c5a',
    author: 'andes_ops',
    content: { role: 'user', parts: [{ function_response: { name: 'request_refund', response: { status: 'success', refund_id: 'rf_5102_4471', order_id: '5102', amount_clp: 65000 } } }] },
    actions: { state_delta: { 'temp:last_refund_id': 'rf_5102_4471' } },
    t: 41_260,
  },
  {
    id: 'c6a',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ text: 'Listo: un supervisor aprobó el reembolso de $65.000 del pedido 5102 (ID rf_5102_4471). Verás el abono en 5 a 10 días hábiles.' }] },
    t: 42_100,
    usage: { prompt: 1402, candidates: 48 },
  },
]

export const CONFIRM_REJECTED_EVENTS: AdkEvent[] = [
  {
    id: 'c4r',
    author: 'user',
    content: { role: 'user', parts: [{ function_response: { name: 'adk_request_confirmation', response: { confirmed: false, payload: { note: 'Pedido aún en preparación: cancelar, no reembolsar.' } } } }] },
    t: 41_200,
  },
  {
    id: 'c5r',
    author: 'andes_ops',
    content: { role: 'user', parts: [{ function_response: { name: 'request_refund', response: { status: 'error', error_message: 'La ejecución de request_refund no fue confirmada por el usuario.' } } }] },
    t: 41_260,
  },
  {
    id: 'c6r',
    author: 'andes_ops',
    content: { role: 'model', parts: [{ text: 'El supervisor no aprobó el reembolso: el pedido 5102 todavía está en preparación, así que lo correcto es cancelarlo. ¿Quieres que lo cancele?' }] },
    t: 42_100,
    usage: { prompt: 1398, candidates: 52 },
  },
]

export const CONFIRM_CLIENT_CODE = `POST /run_sse
{
  "app_name": "andes_data", "user_id": "cus_7781", "session_id": "f1c9…",
  "new_message": {"role": "user", "parts": [{
    "function_response": {
      "id": "${REFUND_CALL_ID}",                     ← debe coincidir con el id del function_call
      "name": "adk_request_confirmation",
      "response": {"confirmed": true, "payload": {"approved_by": "supervisor@andesmarket.cl"}}
    }}]}
}`
