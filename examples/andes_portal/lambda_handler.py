"""Función AWS Lambda disparada por EventBridge (evento `shipment.delayed`) que consulta a Andi.

Lo mismo que /events/shipment-delayed de backend.py, pero sin el SDK de Google: google-auth + requests
contra la REST API de Agent Runtime. Sirve desde cualquier lenguaje con HTTP y SSE.

Credenciales: GOOGLE_APPLICATION_CREDENTIALS apunta al archivo de Workload Identity Federation generado
con `--aws` (ver wif_setup.sh). google-auth lee las credenciales temporales del rol de ejecución de la
función desde las variables AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN / AWS_REGION
y las cambia por un token de Google en Security Token Service. Sin llaves JSON.
"""

import json
import os

import google.auth
from google.auth.transport.requests import AuthorizedSession

PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
ENGINE_ID = os.environ["AGENT_ENGINE_ID"]
URL = (
    f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}"
    f"/reasoningEngines/{ENGINE_ID}:streamQuery?alt=sse"
)

_creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
_http = AuthorizedSession(_creds)  # renueva el token sola


def handler(event, context):
    detail = event["detail"]  # {"order_id": "4821", "tracking": "AX-88213-CL", "new_eta": "2026-11-16"}
    body = {
        "class_method": "async_stream_query",
        "input": {
            "user_id": "system:logistics",
            "message": "Redacta el aviso al cliente para este evento y dime a quién enviarlo: "
            + json.dumps({"event": "shipment.delayed", **detail}),
        },
    }
    final = ""
    with _http.post(URL, json=body, stream=True, timeout=120) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if not line.startswith(b"data: "):
                continue
            ev = json.loads(line[6:])
            for part in ev.get("content", {}).get("parts", []):
                if "text" in part and ev.get("author") != "user":
                    final = part["text"]
    # Publica el resultado donde tu plataforma lo consuma (SNS, SQS, tu API de notificaciones).
    return {"order_id": detail["order_id"], "draft": final}
