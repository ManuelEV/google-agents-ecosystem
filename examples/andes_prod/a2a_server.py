"""Exponer andes_ops por A2A para que agentes de OTROS equipos lo usen.

    pip install 'google-adk[a2a]'
    uvicorn andes_prod.a2a_server:a2a_app --host 0.0.0.0 --port 8001

La Agent Card queda en http://localhost:8001/.well-known/agent-card.json y es
lo que pegarías en Gemini Enterprise → Add agent → "Custom agent via A2A".
"""

from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from google.adk.a2a.utils.agent_to_a2a import to_a2a

from .agent import root_agent

card = AgentCard(
    name="andes_ops",
    description="Operaciones de Andes Market: pedidos, envíos, devoluciones y stock.",
    url="http://localhost:8001",  # en producción: la URL pública (Cloud Run / balanceador)
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=True),
    skills=[
        AgentSkill(id="order-status", name="Estado de pedidos", description="Dónde está un pedido y cuándo llega.", tags=["pedidos"]),
        AgentSkill(id="refunds", name="Devoluciones", description="Inicia reembolsos con aprobación.", tags=["devoluciones"]),
    ],
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
)

a2a_app = to_a2a(root_agent, port=8001, agent_card=card)
