"""Herramientas de andes_data.

Tres tipos de herramienta conviven en el mismo agente:

1. Funciones Python (request_refund) — para lógica de negocio propia.
2. McpToolset → servidor MCP externo (API del transportista AndesExpress).
3. ToolboxToolset → MCP Toolbox for Databases, que expone consultas SQL
   declaradas en toolbox/tools.yaml contra Cloud SQL (dentro de Google),
   un Postgres on-prem (fuera de Google) y BigQuery.
"""

import os

from google.adk.tools import FunctionTool, ToolContext
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from google.adk.tools.toolbox_toolset import ToolboxToolset

from andes_common import ORDERS, REFUND_POLICY

# ---------------------------------------------------------------------------
# 1) Función con confirmación humana
# ---------------------------------------------------------------------------


def needs_approval(order_id: str, amount_clp: int, reason: str) -> bool:
    """Decide si request_refund requiere confirmación: solo sobre el umbral de la política."""
    return amount_clp > REFUND_POLICY["auto_approve_max_clp"]


def request_refund(order_id: str, amount_clp: int, reason: str, tool_context: ToolContext) -> dict:
    """Inicia un reembolso para un pedido.

    Montos hasta $50.000 se aprueban automáticamente. Sobre ese monto, ADK
    pausa y pide confirmación a un humano antes de ejecutar esta función.

    Args:
        order_id: Número del pedido.
        amount_clp: Monto a reembolsar en pesos chilenos (entero).
        reason: Motivo breve indicado por el cliente.
    """
    order = ORDERS.get(order_id)
    if order is None:
        return {"status": "error", "error_message": f"No existe el pedido {order_id}."}
    if amount_clp > order["total_clp"]:
        return {"status": "error", "error_message": f"El monto supera el total del pedido ({order['total_clp']})."}

    refund_id = f"rf_{order_id}_{abs(hash(reason)) % 10_000:04d}"
    tool_context.state["temp:last_refund_id"] = refund_id  # temp: se descarta al terminar la invocación
    return {"status": "success", "refund_id": refund_id, "order_id": order_id, "amount_clp": amount_clp}


# require_confirmation acepta True/False o una función con los mismos argumentos que la tool.
refund_tool = FunctionTool(request_refund, require_confirmation=needs_approval)


# ---------------------------------------------------------------------------
# 2) Servidor MCP externo: API del transportista (ver carrier_mcp/server.py)
# ---------------------------------------------------------------------------

carrier_tools = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url=os.environ.get("CARRIER_MCP_URL", "http://127.0.0.1:8081/mcp"),
        headers={"X-API-Key": os.environ.get("CARRIER_API_KEY", "dev-key-andesexpress")},
        timeout=10,
    ),
    # Siempre filtra: expón solo lo que el agente necesita.
    tool_filter=["track_shipment"],
)


# ---------------------------------------------------------------------------
# 3) MCP Toolbox for Databases (Cloud SQL + Postgres on-prem + BigQuery)
# ---------------------------------------------------------------------------

db_tools = ToolboxToolset(
    server_url=os.environ.get("TOOLBOX_URL", "http://127.0.0.1:5000"),
    # En producción (Cloud Run / Agent Runtime) autentica contra Toolbox con la identidad del workload:
    #   from toolbox_core import CredentialStrategy  (paquete instalado por google-adk[toolbox])
    #   credentials=CredentialStrategy.workload_identity(target_audience=TOOLBOX_URL)
    toolset_name="andes_ops",
)
