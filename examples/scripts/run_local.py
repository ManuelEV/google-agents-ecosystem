"""Ejecuta un agente con el Runner de ADK e imprime los eventos crudos.

    python scripts/run_local.py andes_hello "¿Dónde está mi pedido 4821?"

Es lo mismo que hace `adk web` por debajo: un Runner, un SessionService y un
bucle sobre los eventos (function_call → function_response → texto final).
"""

import asyncio
import importlib
import sys

from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types


async def main(agent_dir: str, message: str) -> None:
    load_dotenv(f"{agent_dir}/.env")
    module = importlib.import_module(f"{agent_dir}.agent")
    root_agent = module.root_agent

    session_service = InMemorySessionService()
    runner = Runner(agent=root_agent, app_name=agent_dir, session_service=session_service)
    session = await session_service.create_session(
        app_name=agent_dir, user_id="cus_7781", state={"user:name": "Camila", "user:customer_id": "cus_7781", "user:role": "customer"}
    )

    content = types.Content(role="user", parts=[types.Part(text=message)])
    async for event in runner.run_async(user_id="cus_7781", session_id=session.id, new_message=content):
        for part in event.content.parts if event.content else []:
            if part.function_call:
                print(f"[{event.author}] → function_call {part.function_call.name} {dict(part.function_call.args)}")
            elif part.function_response:
                print(f"[{event.author}] ← function_response {part.function_response.name} {part.function_response.response}")
            elif part.text:
                tag = "FINAL" if event.is_final_response() else "text"
                print(f"[{event.author}] {tag}: {part.text}")
        if event.actions and event.actions.state_delta:
            print(f"   state_delta: {event.actions.state_delta}")

    final = await session_service.get_session(app_name=agent_dir, user_id="cus_7781", session_id=session.id)
    print("\nsession.state:", final.state)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("uso: python scripts/run_local.py <carpeta_agente> \"<mensaje>\"")
    asyncio.run(main(sys.argv[1], " ".join(sys.argv[2:])))
