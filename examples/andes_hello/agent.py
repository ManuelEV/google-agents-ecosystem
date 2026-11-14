"""andes_hello · Tu primer agente con ADK.

Un solo LlmAgent con una herramienta de función. Correr desde examples/:

    adk web --port 8000      # UI de desarrollo
    adk run andes_hello      # terminal

Lo importante:
- ADK convierte la función Python en una FunctionDeclaration de Gemini usando
  el nombre, los type hints y el docstring. El docstring ES la descripción que
  lee el modelo: escríbelo para él.
- La herramienta devuelve un dict con "status". Si algo falla, explica en
  "error_message" (el modelo lo lee y decide qué decirle al usuario).
- `tool_context: ToolContext` se detecta por tipo, se oculta al modelo y da
  acceso al estado de la sesión.
"""

from google.adk.agents import Agent
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
