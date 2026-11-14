# andes_portal · integrar a Andi en una app que vive fuera de Google

El portal de soporte de Andes Market corre en AWS. No usa Gemini Enterprise (eso es para empleados): su backend llama **directo al agente desplegado en Agent Runtime** (`andes_prod`) y expone tres integraciones.

| Archivo | Para qué |
|---|---|
| `backend.py` | FastAPI con `/chat` (SSE, sesión persistente), `/tickets/{id}/summary` (botón, una consulta), `/tickets/{id}/resolve` (tu app orquesta: tres pasos, una sesión por ticket, un paso en paralelo) y `/events/shipment-delayed` (webhook, usuario de sistema). |
| `widget.js` | Widget de chat vanilla que consume `/chat` por streaming y conserva `session_id`. |
| `lambda_handler.py` | La integración por evento como Lambda de EventBridge, con la REST API (`:streamQuery?alt=sse`) y google-auth, sin SDK. |
| `wif_setup.sh` | Workload Identity Federation: rol IAM de AWS → `roles/aiplatform.user`, sin llaves JSON. |

## Correr en local (con tus credenciales de gcloud)

```bash
export GOOGLE_CLOUD_PROJECT=andes-market-prod GOOGLE_CLOUD_LOCATION=us-central1 AGENT_ENGINE_ID=<ID de adk deploy>
export LOGISTICS_WEBHOOK_SECRET=dev
gcloud auth application-default login          # en AWS esto lo reemplaza gcp-wif.json
uvicorn andes_portal.backend:app --port 8090

curl -N -H "Authorization: Bearer demo-camila" -H "Content-Type: application/json" \
  -d '{"message":"¿Dónde está mi pedido 4821?"}' http://localhost:8090/chat
curl -X POST -H "Authorization: Bearer demo-camila" http://localhost:8090/tickets/T-3310/summary
curl -X POST -H "Authorization: Bearer demo-camila" http://localhost:8090/tickets/T-3310/resolve
curl -X POST -H "X-Webhook-Secret: dev" -H "Content-Type: application/json" \
  -d '{"order_id":"4821","tracking":"AX-88213-CL","new_eta":"2026-11-16"}' http://localhost:8090/events/shipment-delayed
```

## En AWS

1. `bash andes_portal/wif_setup.sh` (una vez) → `gcp-wif.json`.
2. Despliega el backend (ECS, Lambda, EC2) con el rol IAM `andes-portal-backend` y `GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-wif.json`.
3. Nada más: `google-auth` cambia las credenciales temporales del rol por un token de Google en cada llamada.

La documentación oficial de WIF describe EC2 (metadata IMDSv2); en Lambda/ECS `google-auth` toma las credenciales de las variables `AWS_*` del entorno de ejecución. Pruébalo en tu cuenta antes de dar por hecho el camino.

## Sesiones cuando tu app orquesta

- **Una sesión por instancia del proceso** (un ticket, una corrida), no una por paso ni una global.
- Reutiliza el `session_id` cuando el paso siguiente necesita lo que el agente ya hizo; guárdalo en el estado de tu orquestador junto al id del proceso.
- Pasa los datos en el mensaje en vez de confiar en que "están en la sesión": cada paso queda reproducible y evaluable con `adk eval`.
- Un turno en vuelo por sesión; los pasos en paralelo usan sesiones distintas.
- Un reintento sobre la misma sesión agrega otro turno, no lo sobrescribe: haz el paso idempotente o usa sesión nueva.
- Lo que debe sobrevivir al proceso va a tu base de datos (resultados) o a Memory Bank (hechos del usuario), no a la sesión.

## Qué sigue aplicando aunque llames desde AWS

Todo lo del módulo *Gobernar*: Agent Gateway administrado en Agent Runtime (autentica la credencial entrante e inspecciona el prompt), Model Armor (plugin o política), Agent Identity (es del agente, no de quien llama), Sessions y Memory Bank, plugins, Cloud Trace. Lo único que cambia es la **puerta**: quien autentica es tu backend con IAM (principal federado) y quien dice *quién es el usuario* eres tú (`user_id` + `user:customer_id` en el estado de la sesión). Nunca aceptes el `user_id` desde el navegador.
