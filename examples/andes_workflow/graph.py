"""Alternativa determinista: Workflow (grafo) de ADK 2.0 con router y humano en el circuito.

En lugar de dejar que el coordinador "decida" con delegación LLM, un agente
barato clasifica, una función Python RUTEA (determinista, testeable) y el
especialista correspondiente responde. Las devoluciones grandes pasan por un
nodo que pausa el grafo con RequestInput hasta que un supervisor responde.

Para usarlo con adk web, cambia en __init__.py:  from . import graph as agent
"""

from google.adk import Agent, Event, Workflow
from google.adk.events import RequestInput

from andes_common import ROOT_INSTRUCTION
from andes_data.tools import carrier_tools, db_tools, refund_tool

MODEL_LITE = "gemini-3.5-flash-lite"
MODEL_WORKER = "gemini-3.8-flash"

# 1) Clasificador: devuelve SOLO una etiqueta. Barato y rápido.
triage = Agent(
    name="triage",
    model=MODEL_LITE,
    include_contents="none",  # no necesita historial: solo el mensaje actual
    instruction="""Clasifica el mensaje del usuario en UNA etiqueta y responde solo con ella:
PEDIDOS (estado de pedido o envío), DEVOLUCIONES (reembolso, devolución, producto dañado),
ANALITICA (ventas, stock, reportes internos) u OTRO.""",
)


# 2) Router: función Python pura. Event(route=...) elige la arista.
def route(node_input: str):
    label = (node_input or "").strip().upper()
    if label not in {"PEDIDOS", "DEVOLUCIONES", "ANALITICA"}:
        label = "OTRO"
    return Event(route=label, output=label)


# 3) Especialistas (nodos agente)
pedidos = Agent(
    name="pedidos_agent",
    model=MODEL_WORKER,
    instruction=ROOT_INSTRUCTION + "\nSolo pedidos y envíos. Usa get_order y track_shipment.",
    tools=[db_tools, carrier_tools],
)

devoluciones = Agent(
    name="devoluciones_agent",
    model=MODEL_WORKER,
    instruction=ROOT_INSTRUCTION + "\nSolo devoluciones. Verifica el pedido y llama request_refund con monto y motivo.",
    tools=[db_tools, refund_tool],
    output_key="refund_summary",  # guarda la respuesta final en session.state["refund_summary"]
)

analitica = Agent(
    name="analitica_agent",
    model=MODEL_WORKER,
    instruction=ROOT_INSTRUCTION + "\nSolo analítica interna. Usa daily_sales y get_stock.",
    tools=[db_tools],
)


# 4) Humano en el circuito: el nodo pausa el workflow hasta que llegue la respuesta.
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
