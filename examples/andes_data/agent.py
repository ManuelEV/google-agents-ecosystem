"""andes_data · Datos dentro y fuera de Google.

    pedidos  → Cloud SQL para PostgreSQL (dentro de Google)     vía MCP Toolbox
    stock    → Postgres del ERP, on-prem o en otra nube (fuera)  vía MCP Toolbox
    ventas   → BigQuery (dentro)                                 vía MCP Toolbox
    envíos   → API REST del transportista (fuera)                vía servidor MCP propio
    reembolso→ función Python con confirmación humana

Correr (desde examples/, ver README.md de esta carpeta para levantar Docker,
Toolbox y el servidor MCP del transportista):

    adk web --port 8000
"""

from google.adk.agents import Agent

from andes_common import ROOT_INSTRUCTION

from .tools import carrier_tools, db_tools, refund_tool

MODEL = "gemini-3.8-flash"

INSTRUCTION = (
    ROOT_INSTRUCTION
    + """
Herramientas disponibles y cuándo usarlas:
- get_order / search_orders_by_customer: datos de pedidos (base de pedidos).
- get_stock: stock por SKU en bodegas (ERP). Si stock es 0, informa la fecha de reposición si existe.
- daily_sales: ventas agregadas por día (solo para el equipo interno).
- track_shipment: último evento del transportista; úsala solo si el pedido tiene código de seguimiento.
- request_refund: inicia un reembolso. Antes de llamarla, confirma con el usuario el monto y el motivo.
"""
)

root_agent = Agent(
    name="andes_ops",
    model=MODEL,
    description="Agente de operaciones de Andes Market con acceso a pedidos, inventario, ventas y transportista.",
    instruction=INSTRUCTION,
    tools=[db_tools, carrier_tools, refund_tool],
)
