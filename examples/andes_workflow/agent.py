"""andes_workflow · Coordinador + sub-agentes (workflow colaborativo de ADK 2.x).

El agente raíz NO resuelve nada por sí mismo: decide a quién delegar. ADK
inyecta automáticamente una herramienta de delegación por cada sub-agente
(con el nombre del sub-agente), así que la "ruta" la elige el modelo a partir
de las `description` de los sub-agentes. Por eso las descripciones importan.

    mode="task"  → el sub-agente puede pedir aclaraciones al usuario y vuelve
                   solo al coordinador cuando llama finish_task.
    (chat es el modo por defecto: vuelve solo si llama transfer_to_agent)

Alternativa determinista con grafo y router: ver graph.py.
"""

from google.adk.agents import Agent

from andes_common import ROOT_INSTRUCTION
from andes_data.tools import carrier_tools, db_tools, refund_tool

MODEL_ROOT = "gemini-4-hydrogen"   # orquesta: conviene un modelo más capaz
MODEL_WORKER = "gemini-3.8-flash"  # especialistas: rápidos y baratos

pedidos_agent = Agent(
    name="pedidos_agent",
    model=MODEL_WORKER,
    mode="task",
    description="Responde preguntas sobre el estado de pedidos y envíos: dónde está, cuándo llega, qué incluye.",
    instruction=ROOT_INSTRUCTION + "\nSolo pedidos y envíos. Usa get_order y, si hay código de seguimiento, track_shipment.",
    tools=[db_tools, carrier_tools],
)

devoluciones_agent = Agent(
    name="devoluciones_agent",
    model=MODEL_WORKER,
    mode="task",
    description="Gestiona devoluciones y reembolsos de pedidos entregados dentro de los 30 días.",
    instruction=ROOT_INSTRUCTION
    + "\nSolo devoluciones. Verifica el pedido con get_order, confirma monto y motivo con el usuario y llama request_refund. "
    "Si el reembolso supera $50.000 explica que un supervisor debe aprobarlo (ADK pedirá la confirmación).",
    tools=[db_tools, refund_tool],
)

analitica_agent = Agent(
    name="analitica_agent",
    model=MODEL_WORKER,
    mode="task",
    description="Para el equipo interno: ventas por día, stock por SKU y resúmenes operativos.",
    instruction=ROOT_INSTRUCTION + "\nSolo analítica interna. Usa daily_sales y get_stock. Presenta tablas cortas.",
    tools=[db_tools],
)

root_agent = Agent(
    name="andes_ops",
    model=MODEL_ROOT,
    description="Coordinador de operaciones de Andes Market.",
    instruction="""Eres Andi, coordinador de operaciones de Andes Market.
No respondas preguntas de negocio tú mismo: delega en el sub-agente adecuado según su descripción.
- Pedidos y envíos → pedidos_agent
- Devoluciones y reembolsos → devoluciones_agent
- Ventas, stock y reportes internos → analitica_agent
Si la consulta no encaja en ninguno, pide una aclaración breve.""",
    sub_agents=[pedidos_agent, devoluciones_agent, analitica_agent],
)
