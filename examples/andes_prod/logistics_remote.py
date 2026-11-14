"""Consumir un agente A2A de otro equipo (logística) como sub-agente.

El equipo de logística publica su agente con una Agent Card; nosotros solo
necesitamos la URL de la card. ADK lo trata como un sub-agente más.
"""

import os

from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH, RemoteA2aAgent

logistics_agent = RemoteA2aAgent(
    name="logistica_agent",
    description="Agente del equipo de logística: reprograma entregas y gestiona incidencias con transportistas.",
    agent_card=os.environ.get("LOGISTICS_A2A_CARD", f"http://localhost:8002{AGENT_CARD_WELL_KNOWN_PATH}"),
    use_legacy=False,  # integración ADK-A2A nueva (envía la extensión ADK al agente remoto)
)

# Uso: añadirlo a sub_agents del coordinador:
#   root_agent = Agent(..., sub_agents=[pedidos_agent, devoluciones_agent, analitica_agent, logistics_agent])
