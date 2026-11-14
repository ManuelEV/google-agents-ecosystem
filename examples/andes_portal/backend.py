"""Backend del portal de soporte de Andes Market, alojado FUERA de Google Cloud (p. ej. AWS).

Integra al mismo agente desplegado en Agent Runtime (andes_prod) de tres formas:

  POST /chat                       chat con streaming (SSE) y sesión persistente por cliente
  POST /tickets/{id}/summary       botón «Resumir con Andi»: una consulta, sesión nueva, respuesta completa
  POST /events/shipment-delayed    evento (webhook de logística): nadie al frente, user_id de sistema

Correr:   uvicorn andes_portal.backend:app --port 8090
Auth hacia Google: Workload Identity Federation (ver wif_setup.sh). GOOGLE_APPLICATION_CREDENTIALS
apunta al archivo de configuración (sin llaves); el SDK lo usa solo.
Variables: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, AGENT_ENGINE_ID, LOGISTICS_WEBHOOK_SECRET.
"""

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


async def ask_once(user: dict, message: str) -> str:
    """Una consulta sin historial: sesión nueva y solo nos quedamos con el último texto del agente."""
    session_id = await new_session(user)
    final = ""
    async for ev in andi.async_stream_query(user_id=user["customer_id"], session_id=session_id, message=message):
        for part in ev.get("content", {}).get("parts", []):
            if "text" in part and ev.get("author") != "user":
                final = part["text"]
    return final


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
