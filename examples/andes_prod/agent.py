"""andes_prod · El agente listo para Agent Runtime.

Suma sobre andes_workflow:
- App + plugins: LoggingPlugin (trazabilidad) y ModelArmorPlugin (prompt injection,
  jailbreak, datos sensibles) aplicados a TODOS los agentes sin duplicar callbacks.
- Memoria de largo plazo con Memory Bank: preload_memory trae lo que se sabe del
  usuario al inicio de cada turno; after_agent_callback guarda la sesión.
- before_tool_callback como guardrail: un cliente solo consulta SUS pedidos.
- Identidad propia del agente (Agent Identity) vía .agent_engine_config.json.

Despliegue: ver deploy.sh. Consulta remota: query_remote.py.
"""

import os
from typing import Optional

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.apps import App
from google.adk.plugins import LoggingPlugin
from google.adk.tools import preload_memory
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext

from andes_common import ORDERS
from andes_workflow.agent import analitica_agent, devoluciones_agent, pedidos_agent

MODEL_ROOT = "gemini-4-hydrogen"


# ---------------------------------------------------------------------------
# Guardrail en código: política en el ToolContext, no en los argumentos del modelo.
# ---------------------------------------------------------------------------
def only_own_orders(tool: BaseTool, args: dict, tool_context: ToolContext) -> Optional[dict]:
    """Un cliente externo solo puede consultar pedidos de su customer_id (que viene de la sesión)."""
    if tool.name not in {"get_order", "request_refund"}:
        return None  # None = seguir con la ejecución normal
    role = tool_context.state.get("user:role", "customer")
    if role == "staff":
        return None
    order = ORDERS.get(str(args.get("order_id", "")))
    if order and order["customer_id"] != tool_context.state.get("user:customer_id"):
        # Devolver un dict reemplaza el resultado de la herramienta (la tool NO se ejecuta).
        return {"status": "error", "error_message": "Ese pedido no pertenece a este cliente."}
    return None


# ---------------------------------------------------------------------------
# Memoria: guardar la sesión en Memory Bank al terminar cada turno del raíz.
# ---------------------------------------------------------------------------
async def save_session_to_memory(callback_context: CallbackContext):
    await callback_context.add_session_to_memory()


root_agent = Agent(
    name="andes_ops",
    model=MODEL_ROOT,
    description="Coordinador de operaciones de Andes Market.",
    instruction="""Eres Andi, coordinador de operaciones de Andes Market.
Usuario: {user:name?} (rol: {user:role?}). Si la memoria trae preferencias del usuario, respétalas.
No respondas preguntas de negocio tú mismo: delega según la descripción de cada sub-agente.
Si la consulta no encaja en ninguno, pide una aclaración breve.""",
    tools=[preload_memory],
    sub_agents=[pedidos_agent, devoluciones_agent, analitica_agent],
    before_tool_callback=only_own_orders,
    after_agent_callback=save_session_to_memory,
)


# ---------------------------------------------------------------------------
# App: plugins compartidos por todos los agentes del árbol.
# ---------------------------------------------------------------------------
plugins = [LoggingPlugin()]

if os.environ.get("MODEL_ARMOR_PROMPT_TEMPLATE"):
    # Requiere Model Armor API habilitada, plantillas creadas y ADK >= 2.8 (pip install 'google-adk[gcp]').
    from google.adk.integrations.model_armor import ModelArmorConfig, ModelArmorPlugin

    plugins.append(
        ModelArmorPlugin(
            config=ModelArmorConfig(
                prompt_template_name=os.environ["MODEL_ARMOR_PROMPT_TEMPLATE"],
                response_template_name=os.environ.get("MODEL_ARMOR_RESPONSE_TEMPLATE") or None,
                input_blocked_message="No puedo ayudar con esa solicitud.",
                output_blocked_message="No puedo mostrar esa respuesta.",
                block_on_screening_failure=True,
            )
        )
    )

app = App(name="andes_ops", root_agent=root_agent, plugins=plugins)
