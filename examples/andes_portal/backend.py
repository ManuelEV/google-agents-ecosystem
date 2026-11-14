"""Backend del portal de soporte de Andes Market, alojado FUERA de Google Cloud (p. ej. AWS).

Integra al mismo agente desplegado en Agent Runtime (andes_prod) de tres formas:

  POST /chat                       chat con streaming (SSE) y sesión persistente por cliente
  POST /tickets/{id}/summary       botón «Resumir con Andi»: una consulta, sesión nueva, respuesta completa
  POST /tickets/{id}/resolve       tu app orquesta: tres pasos, una sesión por ticket, un paso en paralelo
  POST /events/shipment-delayed    evento (webhook de logística): nadie al frente, user_id de sistema

Correr:   uvicorn andes_portal.backend:app --port 8090
Auth hacia Google: Workload Identity Federation (ver wif_setup.sh). GOOGLE_APPLICATION_CREDENTIALS
apunta al archivo de configuración (sin llaves); el SDK lo usa solo.
Variables: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, AGENT_ENGINE_ID, LOGISTICS_WEBHOOK_SECRET.
"""

import asyncio
import json
import os

import vertexai
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
ENGINE_ID = os.environ["AGENT_ENGINE_ID"]
RESOURCE = f"projects/{PROJECT}/locations/{LOCATION}/reasoningEngines/{ENGINE_ID}"

app = FastAPI(title="Andes Market · portal de soporte")

# Un solo cliente por proceso. Las credenciales salen de GOOGLE_APPLICATION_CREDENTIALS (WIF).
_client = vertexai.Client(project=PROJECT, location=LOCATION)
andi = _client.agent_engines.get(name=RESOURCE)


# ---------------------------------------------------------------------------
# Identidad del usuario del portal. ESTE backend decide quién es el usuario; el
# agente confía en user_id y en user:customer_id (guardrail only_own_orders).
# ---------------------------------------------------------------------------
# Reemplaza por tu validación real (Cognito, Auth0, tu propio JWT…).
PORTAL_TOKENS = {"demo-camila": {"customer_id": "cus_7781", "role": "customer"}}


def current_user(authorization: str = Header(...)) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    user = PORTAL_TOKENS.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="sesión del portal inválida")
    return user


async def new_session(user: dict) -> str:
    """Sesión administrada en Agent Runtime con el estado que leen los guardrails."""
    session = await andi.async_create_session(
        user_id=user["customer_id"],
        state={"user:customer_id": user["customer_id"], "user:role": user["role"]},
    )
    return session["id"]


async def ask_in_session(user: dict, session_id: str, message: str) -> str:
    """Un turno más en una sesión existente; devuelve el último texto del agente."""
    final = ""
    async for ev in andi.async_stream_query(user_id=user["customer_id"], session_id=session_id, message=message):
        for part in ev.get("content", {}).get("parts", []):
            if "text" in part and ev.get("author") != "user":
                final = part["text"]
    return final


async def ask_once(user: dict, message: str) -> str:
    """Una consulta sin historial: sesión nueva y solo nos quedamos con el último texto del agente."""
    return await ask_in_session(user, await new_session(user), message)


# ---------------------------------------------------------------------------
# 1) Chat: streaming hacia el widget. El frontend guarda session_id y lo reenvía.
# ---------------------------------------------------------------------------
class ChatIn(BaseModel):
    message: str
    session_id: str | None = None


@app.post("/chat")
async def chat(body: ChatIn, user: dict = Depends(current_user)):
    session_id = body.session_id or await new_session(user)

    async def events():
        yield f"event: session\ndata: {session_id}\n\n"
        async for ev in andi.async_stream_query(user_id=user["customer_id"], session_id=session_id, message=body.message):
            for part in ev.get("content", {}).get("parts", []):
                if "function_call" in part:
                    yield f"event: tool\ndata: {json.dumps({'name': part['function_call']['name']})}\n\n"
                elif "text" in part and ev.get("author") != "user":
                    yield f"data: {json.dumps({'author': ev.get('author'), 'text': part['text']})}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# 2) Botón: «Resumir con Andi» en la vista de un ticket. Sin chat, sin historial.
# ---------------------------------------------------------------------------
TICKETS = {  # en la vida real: tu base de datos del portal
    "T-3310": {"order_id": "4821", "text": "Hola, mi pedido 4821 lleva 3 días 'en ruta'. ¿Llega antes del viernes? Lo necesito para un regalo."},
}


@app.post("/tickets/{ticket_id}/summary")
async def ticket_summary(ticket_id: str, user: dict = Depends(current_user)):
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404)
    prompt = (
        "Resume este ticket de soporte en tres líneas y propone el siguiente paso. "
        f"Pedido: {ticket['order_id']}. Mensaje del cliente: {ticket['text']}"
    )
    return {"ticket_id": ticket_id, "summary": await ask_once(user, prompt)}


# ---------------------------------------------------------------------------
# 4) Tu app orquesta: un proceso de varios pasos con el agente como un paso más.
#    Regla: UNA sesión por instancia del proceso (el ticket). Los pasos que
#    comparten contexto reenvían el mismo session_id; los independientes usan
#    sesión nueva y pueden correr en paralelo. Lo que debe sobrevivir al proceso
#    va a tu base de datos o a Memory Bank, no a la sesión.
# ---------------------------------------------------------------------------
PROCESS_SESSIONS: dict[str, str] = {}  # ticket_id → session_id (en la vida real: tu DB o el estado de Step Functions)


@app.post("/tickets/{ticket_id}/resolve")
async def ticket_resolve(ticket_id: str, user: dict = Depends(current_user)):
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404)

    # Paso 0 · la sesión del proceso. Si el proceso se reanuda (reintento, otro worker), se reutiliza.
    session_id = PROCESS_SESSIONS.get(ticket_id) or await new_session(user)
    PROCESS_SESSIONS[ticket_id] = session_id

    # Paso 1 · investigar: el agente llama a sus tools; eventos y estado quedan en la sesión.
    findings = await ask_in_session(user, session_id, f"Investiga el estado del pedido {ticket['order_id']} y resume en una línea qué pasa.")

    # Paso 2 · redactar, MISMA sesión: ya sabe lo del paso 1 y no repite las tools.
    # Paso 3 · clasificar el tono: independiente → sesión nueva, y en paralelo con el paso 2.
    reply, sentiment = await asyncio.gather(
        ask_in_session(user, session_id, f"Con lo que encontraste, redacta la respuesta al cliente a este mensaje: {ticket['text']}"),
        ask_once(user, f"Clasifica el tono de este mensaje como positivo, neutro o negativo. Responde solo la palabra: {ticket['text']}"),
    )
    # Lo durable va a TU base de datos; la sesión puede expirar (o borrarla: andi.async_delete_session).
    return {"ticket_id": ticket_id, "session_id": session_id, "findings": findings, "reply": reply, "sentiment": sentiment}


# ---------------------------------------------------------------------------
# 3) Evento: el transportista avisa un retraso. Nadie escribe; el agente decide
#    qué hacer con sus tools y el resultado vuelve a TU plataforma.
# ---------------------------------------------------------------------------
class ShipmentDelayed(BaseModel):
    order_id: str
    tracking: str
    new_eta: str


@app.post("/events/shipment-delayed")
async def shipment_delayed(ev: ShipmentDelayed, x_webhook_secret: str = Header(...)):
    if x_webhook_secret != os.environ["LOGISTICS_WEBHOOK_SECRET"]:
        raise HTTPException(status_code=401)
    system = {"customer_id": "system:logistics", "role": "staff"}  # staff: el guardrail deja consultar cualquier pedido
    message = json.dumps({"event": "shipment.delayed", **ev.model_dump()})
    draft = await ask_once(system, f"Redacta el aviso al cliente para este evento y dime a quién enviarlo: {message}")
    # notify_customer(ev.order_id, draft)  → email, push, WhatsApp… lo que use tu portal
    return {"order_id": ev.order_id, "draft": draft}
