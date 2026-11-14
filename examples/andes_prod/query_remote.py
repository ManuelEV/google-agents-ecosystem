"""Consultar el agente desplegado en Agent Runtime.

    python -m andes_prod.query_remote "¿Dónde está mi pedido 4821?"

Variables: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, AGENT_ENGINE_ID (reasoningEngines/<ID>).

Usa el SDK `google-cloud-aiplatform[agent_engines]` (vertexai.Client). En el SDK 2.0.1+
el mismo cliente se llama `agentplatform.Client()` y el módulo `agent_engines` pasa a
`runtimes` (client.runtimes.get / create); los métodos del agente no cambian.
"""

import asyncio
import os
import sys

import vertexai

PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
ENGINE_ID = os.environ["AGENT_ENGINE_ID"]
RESOURCE = f"projects/{PROJECT}/locations/{LOCATION}/reasoningEngines/{ENGINE_ID}"


async def main(message: str, user_id: str = "cus_7781") -> None:
    client = vertexai.Client(project=PROJECT, location=LOCATION)
    remote_agent = client.agent_engines.get(name=RESOURCE)

    # Sesión administrada (Sessions). Si omites session_id, Agent Runtime crea una.
    session = await remote_agent.async_create_session(user_id=user_id)
    session_id = session["id"]
    print(f"session={session_id}")

    async for event in remote_agent.async_stream_query(user_id=user_id, session_id=session_id, message=message):
        # Cada evento es un dict con author, content.parts (text / function_call / function_response), actions…
        for part in event.get("content", {}).get("parts", []):
            if "function_call" in part:
                print(f"→ tool {part['function_call']['name']}({part['function_call']['args']})")
            elif "function_response" in part:
                print(f"← {part['function_response']['name']}: {part['function_response']['response']}")
            elif "text" in part:
                print(f"[{event.get('author')}] {part['text']}")


if __name__ == "__main__":
    asyncio.run(main(" ".join(sys.argv[1:]) or "¿Dónde está mi pedido 4821?"))
