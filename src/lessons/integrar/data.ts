import type { StepInfo } from '../../components/Player'
import type { FlowEdge, FlowNode } from '../../components/Flow'
import { blank, cmd, comment, ok, out, type TermLine } from '../../components/Terminal'
import { CUSTOMER, LOCATION, PROJECT_ID, PROJECT_NUMBER, REASONING_ENGINE_ID } from '../../sim/scenario'
import type { Lang } from '../../components/Code'

export const RESOURCE = `projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}`
export const QUERY_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/${RESOURCE}:streamQuery?alt=sse`

/* ------------------------------------------------------------------------ */
/* Lab 1 · Cuatro puertas, una misma casa                                    */
/* ------------------------------------------------------------------------ */
export type DoorId = 'ge' | 'chat' | 'button' | 'event'
export type Door = {
  id: DoorId
  label: string
  who: string
  auth: string
  userId: string
  session: string
  answer: string
  file: string
  flows: string[]
  active: string[]
}

export const DOORS: Door[] = [
  {
    id: 'ge',
    label: 'Gemini Enterprise',
    who: 'Empleados de Andes Market, desde la app web de Gemini Enterprise o su extensión de Chrome.',
    auth: 'Gemini Enterprise, con la identidad corporativa de Google del empleado (ya la tiene, no configuras nada).',
    userId: 'La identidad corporativa. Gemini Enterprise la pasa al runtime; Sessions y Memory Bank la usan como user_id.',
    session: 'La administra Gemini Enterprise: cada conversación de la app es una sesión.',
    answer: 'Streaming en la interfaz de Gemini Enterprise.',
    file: 'examples/andes_prod/register_gemini_enterprise.sh',
    flows: ['ge>gw', 'gw>agent'],
    active: ['ge', 'gw', 'agent'],
  },
  {
    id: 'chat',
    label: 'Chat en tu portal',
    who: 'Clientes como Camila, en soporte.andesmarket.cl (alojado en AWS). Gemini Enterprise no participa.',
    auth: 'Tu backend, con un principal federado de IAM (Workload Identity Federation) y el rol roles/aiplatform.user.',
    userId: 'Lo decide tu backend a partir de la sesión del portal (Cognito, Auth0, JWT propio) y lo fija como user_id + user:customer_id. Nunca viene del navegador.',
    session: 'Tu backend llama async_create_session una vez y reenvía el session_id en cada turno para conservar historial y memoria.',
    answer: 'Eventos SSE de Agent Runtime → tu backend los traduce → SSE o WebSocket hacia el widget.',
    file: 'examples/andes_portal/backend.py · widget.js',
    flows: ['portal>backend', 'backend>gw', 'gw>agent'],
    active: ['portal', 'backend', 'gw', 'agent'],
  },
  {
    id: 'button',
    label: 'Botón en una pantalla',
    who: 'Un agente de soporte humano que, en la vista de un ticket, pulsa «Resumir con Andi».',
    auth: 'Igual que el chat: tu backend con el principal federado.',
    userId: 'El usuario del portal que pulsó el botón; sigue aplicando only_own_orders si es cliente, o rol staff si es del equipo.',
    session: 'Sesión nueva por clic (no hay conversación): el backend recoge el último texto del agente y responde JSON.',
    answer: 'Una respuesta completa, sin streaming: el backend espera el final y la devuelve.',
    file: 'examples/andes_portal/backend.py · /tickets/{id}/summary',
    flows: ['portal>backend', 'backend>gw', 'gw>agent'],
    active: ['portal', 'backend', 'gw', 'agent'],
  },
  {
    id: 'event',
    label: 'Evento sin nadie al frente',
    who: 'El transportista avisa un retraso (webhook) o un evento de EventBridge; una Lambda llama al agente.',
    auth: 'La Lambda, con el mismo principal federado (su rol de ejecución de AWS).',
    userId: 'Un principal de sistema (system:logistics) con rol staff en el estado: el agente puede consultar cualquier pedido, y queda auditado así.',
    session: 'Sesión nueva por evento. Idempotencia y reintentos son responsabilidad de tu cola.',
    answer: 'El agente devuelve un borrador o decisión; tu plataforma lo publica (SNS, email, push). El agente también puede llamar a tu API como tool.',
    file: 'examples/andes_portal/lambda_handler.py',
    flows: ['queue>backend', 'backend>gw', 'gw>agent'],
    active: ['queue', 'backend', 'gw', 'agent'],
  },
]

export const DOOR_NODES: FlowNode[] = [
  { id: 'ge', x: 100, y: 60, w: 150, h: 56, label: 'Gemini Enterprise', sub: 'empleados', tone: 'user' },
  { id: 'portal', x: 100, y: 150, w: 150, h: 56, label: 'Portal de soporte', sub: 'clientes · AWS', tone: 'user', cls: 'is-outside' },
  { id: 'queue', x: 100, y: 240, w: 150, h: 56, label: 'EventBridge / webhook', sub: 'sin usuario', tone: 'system', cls: 'is-outside' },
  { id: 'backend', x: 330, y: 195, w: 150, h: 62, label: 'Tu backend', sub: 'AWS · principal federado', tone: 'system', cls: 'is-outside' },
  { id: 'gw', x: 560, y: 150, w: 160, h: 70, label: 'Agent Gateway', sub: 'IAM + Model Armor', tone: 'guard', badge: 'administrado' },
  { id: 'agent', x: 790, y: 150, w: 160, h: 70, label: 'andes_ops', sub: 'Agent Runtime', tone: 'model' },
]
export const DOOR_EDGES: FlowEdge[] = [
  { from: 'ge', to: 'gw' },
  { from: 'portal', to: 'backend' },
  { from: 'queue', to: 'backend' },
  { from: 'backend', to: 'gw' },
  { from: 'gw', to: 'agent' },
]

/* ------------------------------------------------------------------------ */
/* Lab 2 · El chat, paso a paso                                              */
/* ------------------------------------------------------------------------ */
export const CHAT_NODES: FlowNode[] = [
  { id: 'widget', x: 90, y: 160, w: 130, h: 62, label: CUSTOMER.name.split(' ')[0], sub: 'widget · navegador', tone: 'user', cls: 'is-outside' },
  { id: 'backend', x: 300, y: 160, w: 160, h: 66, label: 'Backend del portal', sub: 'AWS · FastAPI', tone: 'system', cls: 'is-outside' },
  { id: 'sts', x: 300, y: 45, w: 160, h: 52, label: 'STS de Google', sub: 'token federado (WIF)', tone: 'guard' },
  { id: 'gw', x: 520, y: 160, w: 160, h: 66, label: 'Agent Gateway', sub: 'IAM + Model Armor', tone: 'guard' },
  { id: 'agent', x: 740, y: 160, w: 160, h: 70, label: 'andes_ops', sub: 'Agent Runtime', tone: 'model' },
  { id: 'tools', x: 910, y: 80, w: 130, h: 56, label: 'Toolbox', sub: 'Cloud SQL', tone: 'tool' },
  { id: 'sessions', x: 910, y: 240, w: 130, h: 56, label: 'Sessions', sub: '+ Memory Bank', tone: 'memory' },
]
export const CHAT_EDGES: FlowEdge[] = [
  { from: 'widget', to: 'backend' },
  { from: 'backend', to: 'sts', dashed: true },
  { from: 'backend', to: 'gw' },
  { from: 'gw', to: 'agent' },
  { from: 'agent', to: 'tools' },
  { from: 'agent', to: 'sessions' },
]

export type ChatStep = StepInfo & { flows: string[]; active: string[]; code: string; lang: Lang; codeTitle: string }

const CODE_WIDGET = `// examples/andes_portal/widget.js
const res = await fetch(\`\${BACKEND}/chat\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${portalToken}\` },
  body: JSON.stringify({ message: text, session_id: sessionId }),
})
// el widget NO conoce el proyecto de Google ni el ID del agente`

const CODE_USER = `# examples/andes_portal/backend.py
def current_user(authorization: str = Header(...)) -> dict:
    token = authorization.removeprefix("Bearer ").strip()
    user = PORTAL_TOKENS.get(token)      # tu validación real: Cognito, Auth0, JWT propio…
    if not user:
        raise HTTPException(status_code=401, detail="sesión del portal inválida")
    return user

async def new_session(user: dict) -> str:
    session = await andi.async_create_session(
        user_id=user["customer_id"],
        state={"user:customer_id": user["customer_id"], "user:role": user["role"]},
    )
    return session["id"]`

const CODE_CREDS = `# En el contenedor del backend (ECS/EC2/Lambda) no hay llave JSON:
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-wif.json

# gcp-wif.json (generado por wif_setup.sh) solo dice CÓMO obtener un token:
#   type: external_account · credential_source.environment_id: aws1
# google-auth toma las credenciales temporales del rol IAM de AWS,
# las presenta a https://sts.googleapis.com/v1/token y recibe un
# access token de Google de corta vida para el principal federado.`

const HTTP_QUERY = `POST ${QUERY_URL}
Authorization: Bearer <token federado del backend>
Content-Type: application/json

{
  "class_method": "async_stream_query",
  "input": {
    "user_id": "${CUSTOMER.id}",
    "session_id": "6137521909875261440",
    "message": "¿Dónde está mi pedido 4821?"
  }
}`

const GATE_TEXT = `IAM       ¿El principal federado tiene
          roles/aiplatform.user sobre ${PROJECT_ID}?     ✓
Armor     ¿El prompt pasa la plantilla andes-prompt
          (jailbreak, PII, …)?                             ✓
Registry  Toolbox y el MCP del transportista están
(salida)  registrados y permitidos para este agente        ✓`

const EVENT_CALL = `{ "author": "andes_ops",
  "content": { "role": "model", "parts": [
    { "function_call": { "name": "get_order", "args": { "order_id": "4821" } } } ] },
  "actions": { "state_delta": {} }, "invocation_id": "e-4f1c…" }`

const SSE_GOOGLE = `data: {"author":"user","content":{"role":"user","parts":[{"text":"¿Dónde está mi pedido 4821?"}]}}

data: {"author":"andes_ops","content":{"parts":[{"function_call":{"name":"get_order","args":{"order_id":"4821"}}}]}}

data: {"author":"andes_ops","content":{"parts":[{"function_response":{"name":"get_order","response":{"status":"en_ruta","carrier":"AndesExpress","tracking":"AX-88213-CL"}}}]}}

data: {"author":"andes_ops","content":{"parts":[{"text":"Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL). Llega el 14 de noviembre."}]},"usage_metadata":{"total_token_count":1480}}`

const SSE_WIDGET = `event: session
data: 6137521909875261440

event: tool
data: {"name": "get_order"}

data: {"author": "andes_ops", "text": "Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL). Llega el 14 de noviembre."}

event: done
data: {}`

export const CHAT_STEPS: ChatStep[] = [
  {
    title: 'Camila escribe en el widget',
    body: 'El widget del portal manda el texto a TU backend con la cookie o el token de sesión del portal. No sabe que detrás hay Google: no conoce el proyecto, el ID del agente ni tiene credenciales.',
    flows: ['widget>backend'],
    active: ['widget', 'backend'],
    code: CODE_WIDGET,
    lang: 'js',
    codeTitle: 'examples/andes_portal/widget.js',
  },
  {
    title: 'El backend decide quién es el usuario',
    body: 'Valida la sesión del portal y convierte eso en user_id = cus_7781 y estado user:customer_id / user:role. El guardrail only_own_orders de la lección de seguridad confía en estos valores, así que jamás los aceptes del navegador.',
    flows: [],
    active: ['backend'],
    code: CODE_USER,
    lang: 'python',
    codeTitle: 'examples/andes_portal/backend.py',
  },
  {
    title: 'Credenciales de Google sin llaves',
    body: 'google-auth intercambia las credenciales temporales del rol IAM de AWS por un token de Google en Security Token Service (Workload Identity Federation). Ocurre solo, en la primera llamada, y se renueva antes de expirar.',
    flows: ['backend>sts', 'sts>backend'],
    active: ['backend', 'sts'],
    code: CODE_CREDS,
    lang: 'bash',
    codeTitle: 'entorno del backend',
  },
  {
    title: 'POST :streamQuery',
    body: 'La misma llamada REST que viste en la lección de despliegue: class_method async_stream_query, user_id, session_id y message. El backend reenvía el session_id que devolvió async_create_session en el primer turno.',
    flows: ['backend>gw'],
    active: ['backend', 'gw'],
    code: HTTP_QUERY,
    lang: 'http',
    codeTitle: 'REST · Agent Runtime',
  },
  {
    title: 'Agent Gateway: IAM y Model Armor',
    body: 'Agent Runtime está detrás del gateway administrado, venga quien venga. Autentica la credencial entrante (¿tiene roles/aiplatform.user?) e inspecciona el prompt con Model Armor antes de que tu código ADK lo vea. Esto es lo que NO cambia respecto de Gemini Enterprise.',
    flows: ['gw>agent'],
    active: ['gw'],
    code: GATE_TEXT,
    lang: 'text',
    codeTitle: 'políticas del gateway (resumen)',
  },
  {
    title: 'El agente trabaja como siempre',
    body: 'Lee la sesión y la memoria del usuario cus_7781, llama a get_order por Toolbox con su Agent Identity, pasa por LoggingPlugin y callbacks. Nada en el agente sabe ni le importa que la llamada vino de AWS.',
    flows: ['agent>sessions', 'agent>tools'],
    active: ['agent', 'tools', 'sessions'],
    code: EVENT_CALL,
    lang: 'json',
    codeTitle: 'evento ADK · function_call',
  },
  {
    title: 'Eventos SSE de vuelta',
    body: 'Agent Runtime devuelve cada evento como una línea data: en el stream. Tu backend ve function_call, function_response y el texto final; decide cuáles mostrar.',
    flows: ['agent>gw', 'gw>backend'],
    active: ['agent', 'gw', 'backend'],
    code: SSE_GOOGLE,
    lang: 'text',
    codeTitle: 'SSE · de Google a tu backend',
  },
  {
    title: 'El backend traduce y el widget muestra',
    body: 'El backend reemite un SSE propio y más simple: session (para que el widget lo guarde), tool (para mostrar «consultando pedido…»), el texto y done. El contrato con tu frontend es tuyo; el de Google queda encapsulado.',
    flows: ['backend>widget'],
    active: ['backend', 'widget'],
    code: SSE_WIDGET,
    lang: 'text',
    codeTitle: 'SSE · de tu backend al widget',
  },
]

/* ------------------------------------------------------------------------ */
/* Lab 3 · Portal simulado: chat, botón, evento                              */
/* ------------------------------------------------------------------------ */
export const CODE_CHAT_ENDPOINT = `@app.post("/chat")
async def chat(body: ChatIn, user: dict = Depends(current_user)):
    session_id = body.session_id or await new_session(user)

    async def events():
        yield f"event: session\\ndata: {session_id}\\n\\n"
        async for ev in andi.async_stream_query(user_id=user["customer_id"], session_id=session_id, message=body.message):
            for part in ev.get("content", {}).get("parts", []):
                if "function_call" in part:
                    yield f"event: tool\\ndata: {json.dumps({'name': part['function_call']['name']})}\\n\\n"
                elif "text" in part and ev.get("author") != "user":
                    yield f"data: {json.dumps({'author': ev.get('author'), 'text': part['text']})}\\n\\n"
        yield "event: done\\ndata: {}\\n\\n"

    return StreamingResponse(events(), media_type="text/event-stream")`

export const CODE_BUTTON = `async def ask_in_session(user: dict, session_id: str, message: str) -> str:
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


@app.post("/tickets/{ticket_id}/summary")
async def ticket_summary(ticket_id: str, user: dict = Depends(current_user)):
    ticket = TICKETS.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404)
    prompt = (
        "Resume este ticket de soporte en tres líneas y propone el siguiente paso. "
        f"Pedido: {ticket['order_id']}. Mensaje del cliente: {ticket['text']}"
    )
    return {"ticket_id": ticket_id, "summary": await ask_once(user, prompt)}`

export const CODE_EVENT = `@app.post("/events/shipment-delayed")
async def shipment_delayed(ev: ShipmentDelayed, x_webhook_secret: str = Header(...)):
    if x_webhook_secret != os.environ["LOGISTICS_WEBHOOK_SECRET"]:
        raise HTTPException(status_code=401)
    system = {"customer_id": "system:logistics", "role": "staff"}  # staff: el guardrail deja consultar cualquier pedido
    message = json.dumps({"event": "shipment.delayed", **ev.model_dump()})
    draft = await ask_once(system, f"Redacta el aviso al cliente para este evento y dime a quién enviarlo: {message}")
    # notify_customer(ev.order_id, draft)  → email, push, WhatsApp… lo que use tu portal
    return {"order_id": ev.order_id, "draft": draft}`

export const CODE_LAMBDA = `# examples/andes_portal/lambda_handler.py · sin SDK: google-auth + requests contra la REST API
_creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
_http = AuthorizedSession(_creds)  # renueva el token sola

def handler(event, context):
    detail = event["detail"]  # {"order_id": "4821", "tracking": "AX-88213-CL", "new_eta": "2026-11-16"}
    body = {"class_method": "async_stream_query",
            "input": {"user_id": "system:logistics",
                      "message": "Redacta el aviso al cliente para este evento y dime a quién enviarlo: " + json.dumps({"event": "shipment.delayed", **detail})}}
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
    return {"order_id": detail["order_id"], "draft": final}`

export const CHAT_ANSWER = 'Tu pedido 4821 (Zapatillas trekking Cordillera 41) va en ruta con AndesExpress, seguimiento AX-88213-CL. Entrega estimada: 14 de noviembre. ¿Quieres que te avise si cambia?'
export const TICKET = { id: 'T-3310', order: '4821', from: CUSTOMER.name, text: 'Hola, mi pedido 4821 lleva 3 días «en ruta». ¿Llega antes del viernes? Lo necesito para un regalo.' }
export const TICKET_SUMMARY =
  'Camila Rojas (cus_7781, plus) pregunta si el pedido 4821 llega antes del viernes; lo necesita para un regalo. Estado real: en ruta con AndesExpress, AX-88213-CL, entrega estimada 14-nov (jueves). Siguiente paso: confirmarle la fecha y ofrecer aviso automático si el transportista reporta retraso.'
export const EVENT_LOG: { t: string; tone: 'system' | 'model' | 'tool' | 'ok' | 'user' }[] = [
  { t: 'EventBridge · shipment.delayed {order_id: 4821, tracking: AX-88213-CL, new_eta: 2026-11-16}', tone: 'system' },
  { t: 'Lambda andes-shipment-delayed → POST :streamQuery (user_id: system:logistics, rol staff)', tone: 'system' },
  { t: 'andes_ops → get_order(4821) · get_customer(cus_7781)', tone: 'tool' },
  { t: 'andes_ops: «Borrador listo. Enviar a camila.rojas@example.cl: tu pedido 4821 llegará el 16 de noviembre en vez del 14…»', tone: 'model' },
  { t: 'Portal → SES: email enviado · ticket T-3310 actualizado con el nuevo ETA', tone: 'ok' },
]

/* ------------------------------------------------------------------------ */
/* Lab 4 · Terminal: Workload Identity Federation                            */
/* ------------------------------------------------------------------------ */
const POOL_PATH = `projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/andes-aws`
export const WIF_LINES: TermLine[] = [
  comment('# examples/andes_portal/wif_setup.sh · una vez, con permisos de administrador IAM en el proyecto'),
  cmd('gcloud iam workload-identity-pools create andes-aws --location=global --display-name="Cargas en AWS"'),
  ok('Created workload identity pool [andes-aws].'),
  cmd(
    `gcloud iam workload-identity-pools providers create-aws aws-portal --location=global --workload-identity-pool=andes-aws --account-id=123456789012 --attribute-mapping="google.subject=assertion.arn,attribute.aws_role=assertion.arn.extract('assumed-role/{role}/')"`,
  ),
  ok('Created workload identity pool provider [aws-portal].'),
  blank(),
  comment('# El rol lo recibe QUIEN LLAMA al agente (el backend). Al agente nunca le des roles/aiplatform.user: usa su Agent Identity.'),
  cmd(`gcloud projects add-iam-policy-binding ${PROJECT_ID} --role=roles/aiplatform.user --member="principalSet://iam.googleapis.com/${POOL_PATH}/attribute.aws_role/andes-portal-backend"`),
  out(`Updated IAM policy for project [${PROJECT_ID}].`),
  blank(),
  cmd(`gcloud iam workload-identity-pools create-cred-config ${POOL_PATH}/providers/aws-portal --aws --enable-imdsv2 --output-file=gcp-wif.json`),
  ok('Created credential configuration file [gcp-wif.json].'),
  cmd('cat gcp-wif.json'),
  out(`{ "type": "external_account",`),
  out(`  "audience": "//iam.googleapis.com/${POOL_PATH}/providers/aws-portal",`),
  out('  "subject_token_type": "urn:ietf:params:aws:token-type:aws4_request",'),
  out('  "token_url": "https://sts.googleapis.com/v1/token",'),
  out('  "credential_source": { "environment_id": "aws1", "regional_cred_verification_url": "https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15", … } }'),
  comment('# sin private_key: no hay secreto que rotar ni que se filtre en un repo'),
  blank(),
  cmd('export GOOGLE_APPLICATION_CREDENTIALS=$PWD/gcp-wif.json && uvicorn andes_portal.backend:app --port 8090'),
  ok('INFO:     Uvicorn running on http://0.0.0.0:8090'),
  cmd(`curl -N -H "Authorization: Bearer demo-camila" -H "Content-Type: application/json" -d '{"message":"¿Dónde está mi pedido 4821?"}' http://localhost:8090/chat`),
  out('event: session'),
  out('data: 6137521909875261440'),
  out('event: tool'),
  out('data: {"name": "get_order"}'),
  out('data: {"author": "andes_ops", "text": "Tu pedido 4821 va en ruta con AndesExpress (AX-88213-CL). Llega el 14 de noviembre."}'),
  out('event: done'),
]

/* ------------------------------------------------------------------------ */
/* Lab 5 · Cuatro formas de orquestar                                        */
/* ------------------------------------------------------------------------ */
export type OrchId = 'agent' | 'app' | 'a2a' | 'events'
export type Orch = {
  id: OrchId
  label: string
  summary: string
  when: string
  pros: string[]
  cons: string[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  flows: string[]
  height: number
}

export const ORCH: Orch[] = [
  {
    id: 'agent',
    label: 'El agente orquesta',
    summary:
      'Tu app manda un mensaje y recibe una respuesta. Dentro de Google, el coordinador andes_ops decide a qué sub-agente delegar, qué tools llamar y cuándo pedir aprobación. Es lo que construiste en la lección de workflows; desde fuera se ve como una sola llamada.',
    when: 'Conversaciones abiertas y tareas donde el camino depende del mensaje (chat de soporte, asistente interno).',
    pros: ['Una llamada, un contrato: :streamQuery.', 'Sesión y Memory Bank conservan el contexto entre turnos.', 'Gobernanza completa: gateway, Model Armor, identidad, trazas.'],
    cons: ['Menos determinista: el LLM elige la ruta.', 'La latencia suma cada salto interno.', 'Para cambiar el flujo hay que redesplegar el agente (o usar Workflow con rutas).'],
    nodes: [
      { id: 'app', x: 100, y: 120, w: 140, h: 62, label: 'Tu app', sub: 'AWS · 1 llamada', tone: 'system', cls: 'is-outside' },
      { id: 'root', x: 370, y: 120, w: 170, h: 70, label: 'andes_ops (raíz)', sub: 'coordinador · gemini-4-hydrogen', tone: 'model' },
      { id: 'ped', x: 660, y: 40, w: 160, label: 'pedidos_agent', sub: 'mode="task"', tone: 'model' },
      { id: 'dev', x: 660, y: 120, w: 160, label: 'devoluciones_agent', sub: 'aprobación HITL', tone: 'model' },
      { id: 'log', x: 660, y: 200, w: 160, label: 'logistica_agent', sub: 'otro equipo · A2A', tone: 'tool', cls: 'is-outside' },
    ],
    edges: [
      { from: 'app', to: 'root', label: 'streamQuery' },
      { from: 'root', to: 'ped' },
      { from: 'root', to: 'dev' },
      { from: 'root', to: 'log', dashed: true },
    ],
    flows: ['app>root', 'root>ped', 'root>dev', 'root>log'],
    height: 250,
  },
  {
    id: 'app',
    label: 'Tu app orquesta',
    summary:
      'El proceso vive en tu plataforma (Step Functions, Temporal, un cron, tu propio código) y el agente es un paso más entre pasos que no son LLM. Cada paso con Andi es una consulta única (ask_once); si dos pasos deben compartir contexto, reenvías el mismo session_id.',
    when: 'Procesos con pasos fijos y auditables: conciliaciones, campañas, flujos de ticket, lotes nocturnos.',
    pros: ['Determinista y visible en tus herramientas (reintentos, timeouts, compensaciones).', 'Mezclas pasos LLM con pasos tradicionales sin tocar el agente.', 'Puedes usar agentes distintos por paso.'],
    cons: ['N llamadas, N sesiones (o pasas session_id a mano).', 'El estado del proceso lo guardas tú.', 'Tienta a hacer prompts «de un solo paso» que replican lógica que ya tiene el agente.'],
    nodes: [
      { id: 'sf', x: 110, y: 120, w: 170, h: 66, label: 'Step Functions', sub: 'o Temporal, cron, tu código', tone: 'system', cls: 'is-outside' },
      { id: 's1', x: 340, y: 40, w: 170, label: '1 · consultar pedido', sub: 'API propia (sin LLM)', tone: 'data', cls: 'is-outside' },
      { id: 's2', x: 560, y: 40, w: 170, label: '2 · Andi: redactar aviso', sub: 'ask_once · sesión nueva', tone: 'model' },
      { id: 's3', x: 560, y: 200, w: 170, label: '3 · enviar email', sub: 'SES (sin LLM)', tone: 'tool', cls: 'is-outside' },
      { id: 's4', x: 340, y: 200, w: 170, label: '4 · Andi: clasificar respuesta', sub: 'ask_once', tone: 'model' },
    ],
    edges: [
      { from: 'sf', to: 's1' },
      { from: 's1', to: 's2' },
      { from: 's2', to: 's3' },
      { from: 's3', to: 's4' },
      { from: 's4', to: 'sf', dashed: true },
    ],
    flows: ['sf>s1', 's1>s2', 's2>s3', 's3>s4', 's4>sf'],
    height: 250,
  },
  {
    id: 'a2a',
    label: 'Agentes entre nubes (A2A)',
    summary:
      'Tu portal ya tiene su propio agente (Bedrock AgentCore, LangGraph, lo que sea). En vez de llamar a la REST API, lo tratas como colega: expones a Andi con to_a2a (lección anterior) y tu agente lo consume con un cliente A2A; o al revés, Andi consume el tuyo con RemoteA2aAgent.',
    when: 'Cuando ambos lados ya son agentes y cada equipo mantiene el suyo con su stack.',
    pros: ['Protocolo abierto; ninguno de los dos depende del SDK del otro.', 'Descubrimiento por Agent Card; tareas con estado y streaming.', 'Cada agente conserva su gobernanza y su identidad.'],
    cons: ['Dos planos de gobierno: lo que pasa en AWS no lo ve Agent Gateway.', 'El contexto no viaja: cada mensaje debe ser autocontenido.', 'Si expones a Andi por A2A en Cloud Run, pierdes el gateway administrado (nov-2026).'],
    nodes: [
      { id: 'aws', x: 130, y: 130, w: 180, h: 66, label: 'Agente del portal', sub: 'Bedrock AgentCore · AWS', tone: 'model', cls: 'is-outside' },
      { id: 'card', x: 470, y: 40, w: 190, h: 52, label: 'Agent Card', sub: '/.well-known/agent-card.json', tone: 'system' },
      { id: 'andi', x: 470, y: 150, w: 190, h: 66, label: 'andes_ops · to_a2a', sub: 'Cloud Run / Agent Runtime', tone: 'model' },
      { id: 'tools', x: 760, y: 150, w: 150, label: 'Toolbox · MCP', sub: 'con Agent Identity', tone: 'tool' },
    ],
    edges: [
      { from: 'aws', to: 'card', dashed: true, label: 'GET card' },
      { from: 'aws', to: 'andi', label: 'message/send' },
      { from: 'andi', to: 'tools' },
    ],
    flows: ['aws>card', 'aws>andi', 'andi>tools'],
    height: 230,
  },
  {
    id: 'events',
    label: 'Por eventos, en ambos sentidos',
    summary:
      'Nadie escribe. Un evento de tu plataforma dispara al agente (EventBridge → Lambda → :streamQuery) y, al revés, el agente llama a tu API como tool (webhook notify_portal) cuando decide algo. La salida pasa por Agent Gateway: registra tu endpoint en Agent Registry para que el gateway la deje salir.',
    when: 'Automatizaciones operativas: retrasos, alertas, resúmenes nocturnos, enriquecer tickets al crearse.',
    pros: ['Desacoplado y asíncrono; reintentos y colas de tu lado.', 'Escala sin usuarios: el agente es un trabajador más.', 'El agente puede iniciar acciones hacia tu plataforma de forma gobernada.'],
    cons: ['Sin humano al frente: usa principal de sistema y guardrails estrictos.', 'Idempotencia: el mismo evento puede llegar dos veces.', 'Cuesta tokens por evento; filtra antes de llamar.'],
    nodes: [
      { id: 'eb', x: 100, y: 60, w: 150, h: 56, label: 'EventBridge', sub: 'shipment.delayed', tone: 'system', cls: 'is-outside' },
      { id: 'lam', x: 320, y: 60, w: 150, h: 56, label: 'Lambda', sub: 'rol federado', tone: 'system', cls: 'is-outside' },
      { id: 'andi', x: 560, y: 130, w: 170, h: 70, label: 'andes_ops', sub: 'Agent Runtime', tone: 'model' },
      { id: 'api', x: 320, y: 200, w: 150, h: 56, label: 'API del portal', sub: 'tool notify_portal', tone: 'tool', cls: 'is-outside', badge: 'Registry' },
      { id: 'cam', x: 100, y: 200, w: 150, h: 56, label: CUSTOMER.name.split(' ')[0], sub: 'email / push', tone: 'user', cls: 'is-outside' },
    ],
    edges: [
      { from: 'eb', to: 'lam' },
      { from: 'lam', to: 'andi', label: 'streamQuery' },
      { from: 'andi', to: 'api', label: 'webhook (gateway)', dashed: true },
      { from: 'api', to: 'cam' },
    ],
    flows: ['eb>lam', 'lam>andi', 'andi>api', 'api>cam'],
    height: 260,
  },
]

/* ------------------------------------------------------------------------ */
/* Lab 5b · Tu app orquesta, paso a paso (API, gateway, Sessions, Memory)    */
/* ------------------------------------------------------------------------ */
export const PROC_NODES: FlowNode[] = [
  { id: 'orch', x: 110, y: 170, w: 170, h: 70, label: 'Tu orquestador', sub: 'Step Functions · AWS', tone: 'system', cls: 'is-outside' },
  { id: 'gw', x: 340, y: 170, w: 160, h: 66, label: 'Agent Gateway', sub: 'IAM + Model Armor', tone: 'guard' },
  { id: 'agent', x: 570, y: 170, w: 170, h: 70, label: 'andes_ops', sub: 'Agent Runtime (runner)', tone: 'model' },
  { id: 'gemini', x: 570, y: 50, w: 150, h: 52, label: 'Gemini', sub: 'gemini-4-hydrogen', tone: 'model' },
  { id: 'tools', x: 810, y: 60, w: 150, h: 56, label: 'Toolbox', sub: 'Cloud SQL · principal://', tone: 'tool' },
  { id: 'sessions', x: 810, y: 170, w: 150, h: 56, label: 'Sessions', sub: 'eventos + estado', tone: 'data' },
  { id: 'memory', x: 810, y: 280, w: 150, h: 56, label: 'Memory Bank', sub: 'hechos por usuario', tone: 'memory' },
]
export const PROC_EDGES: FlowEdge[] = [
  { from: 'orch', to: 'gw' },
  { from: 'gw', to: 'agent' },
  { from: 'agent', to: 'gemini' },
  { from: 'agent', to: 'tools' },
  { from: 'agent', to: 'sessions' },
  { from: 'agent', to: 'memory' },
]

export type ProcStep = StepInfo & {
  flows: string[]
  active: string[]
  code: string
  lang: Lang
  codeTitle: string
  /** estado de Sessions que se muestra a la derecha */
  session?: { id: string; events: number; state: Record<string, unknown>; changed?: string[]; note?: string }
  /** hechos en Memory Bank (los nuevos se marcan) */
  memories: { text: string; fresh?: boolean }[]
}

const S1 = '6137521909875261440'
const S2 = '6137529988112000512'
const BASE_STATE = { 'user:customer_id': CUSTOMER.id, 'user:role': 'customer' }
const MEM_OLD = { text: `${CUSTOMER.id}: prefiere avisos por email, no SMS (sesión del 3-nov)` }

export const PROC_STEPS: ProcStep[] = [
  {
    title: 'Arranca el proceso del ticket T-3310',
    body: 'Tu orquestador (Step Functions, Temporal, un worker) crea la instancia del proceso y mira si ya existe una sesión para este ticket. No existe: el proceso es nuevo. Memory Bank ya guarda hechos de Camila de conversaciones anteriores.',
    flows: [],
    active: ['orch'],
    code: `# examples/andes_portal/backend.py · /tickets/{ticket_id}/resolve
session_id = PROCESS_SESSIONS.get(ticket_id) or await new_session(user)
PROCESS_SESSIONS[ticket_id] = session_id   # en la vida real: tu DB o el estado de Step Functions`,
    lang: 'python',
    codeTitle: 'paso 0 · la sesión del proceso',
    memories: [MEM_OLD],
  },
  {
    title: 'Crea la sesión del proceso (API de Agent Runtime)',
    body: 'async_create_session viaja como POST :query con class_method. El gateway autentica el principal federado; el runtime crea en Sessions una sesión vacía con el estado inicial que leerán los guardrails. Devuelve el id: ese es el hilo que compartirán los pasos 1 y 2.',
    flows: ['orch>gw', 'gw>agent', 'agent>sessions'],
    active: ['orch', 'gw', 'agent', 'sessions'],
    code: `POST ${RESOURCE.replace('projects/', 'https://us-central1-aiplatform.googleapis.com/v1/projects/')}:query
{ "class_method": "async_create_session",
  "input": { "user_id": "${CUSTOMER.id}",
             "state": { "user:customer_id": "${CUSTOMER.id}", "user:role": "customer" } } }

← { "output": { "id": "${S1}", "app_name": "${REASONING_ENGINE_ID}",
                "user_id": "${CUSTOMER.id}", "state": { … }, "events": [], "last_update_time": 1763121600.2 } }`,
    lang: 'http',
    codeTitle: 'REST · :query (método no streaming)',
    session: { id: S1, events: 0, state: BASE_STATE, changed: ['user:customer_id', 'user:role'] },
    memories: [MEM_OLD],
  },
  {
    title: 'Paso 1 · investigar: :streamQuery con session_id',
    body: 'Primer turno del proceso. Tu orquestador manda el mensaje con la sesión S. En el gateway: ¿tiene roles/aiplatform.user el principal federado? ¿pasa el prompt la plantilla de Model Armor? Recién entonces entra al runtime.',
    flows: ['orch>gw'],
    active: ['orch', 'gw'],
    code: `POST …/reasoningEngines/${REASONING_ENGINE_ID}:streamQuery?alt=sse
{ "class_method": "async_stream_query",
  "input": { "user_id": "${CUSTOMER.id}", "session_id": "${S1}",
             "message": "Investiga el estado del pedido 4821 y resume en una línea qué pasa." } }`,
    lang: 'http',
    codeTitle: 'REST · :streamQuery',
    session: { id: S1, events: 0, state: BASE_STATE },
    memories: [MEM_OLD],
  },
  {
    title: 'El runner carga la sesión y consulta Memory Bank',
    body: 'Dentro del runtime, el runner de ADK lee la sesión S (vacía) y agrega el mensaje del usuario como primer evento. La tool preload_memory consulta Memory Bank con el user_id y, si hay hechos relevantes, los inyecta en el contexto: Andi ya sabe que Camila prefiere email.',
    flows: ['gw>agent', 'agent>sessions', 'agent>memory'],
    active: ['agent', 'sessions', 'memory'],
    code: `# examples/andes_prod/agent.py (el agente desplegado)
root_agent = Agent(
    name="andes_ops",
    tools=[preload_memory, get_order, …],      # preload_memory: Memory Bank → contexto, cada turno
    before_tool_callback=only_own_orders,      # lee user:customer_id del estado de la sesión
    after_agent_callback=save_session_to_memory,
)
# memoria recuperada para user_id=${CUSTOMER.id}:
#   "prefiere avisos por email, no SMS"`,
    lang: 'python',
    codeTitle: 'preload_memory · VertexAiMemoryBankService',
    session: { id: S1, events: 1, state: BASE_STATE, note: '1 evento: el mensaje del paso 1' },
    memories: [MEM_OLD],
  },
  {
    title: 'Tools con Agent Identity; todo queda en la sesión',
    body: 'Gemini decide llamar a get_order; el agente la ejecuta vía Toolbox con su propia identidad (principal://…), y cada paso (function_call, function_response, texto) se persiste como evento en Sessions. La tool escribió last_order_id en el estado con ToolContext.',
    flows: ['agent>gemini', 'agent>tools', 'agent>sessions'],
    active: ['agent', 'gemini', 'tools', 'sessions'],
    code: `{ "author": "andes_ops", "content": { "parts": [ { "function_call": { "name": "get_order", "args": { "order_id": "4821" } } } ] } }
{ "author": "andes_ops", "content": { "parts": [ { "function_response": { "name": "get_order",
      "response": { "status": "en_ruta", "carrier": "AndesExpress", "tracking": "AX-88213-CL", "eta": "2026-11-14" } } } ] },
  "actions": { "state_delta": { "last_order_id": "4821" } } }`,
    lang: 'json',
    codeTitle: 'eventos persistidos en la sesión S',
    session: { id: S1, events: 3, state: { ...BASE_STATE, last_order_id: '4821' }, changed: ['last_order_id'] },
    memories: [MEM_OLD],
  },
  {
    title: 'Respuesta del paso 1; el orquestador guarda session_id',
    body: 'El texto final vuelve por SSE. Tu orquestador guarda el resultado y el session_id en SU estado del proceso (junto al ticket). Si el worker muere y otro retoma, encuentra la misma sesión. Observa: la sesión ya tiene 4 eventos que el paso 2 podrá leer.',
    flows: ['agent>gw', 'gw>orch'],
    active: ['agent', 'gw', 'orch'],
    code: `findings = await ask_in_session(user, session_id,
    f"Investiga el estado del pedido {ticket['order_id']} y resume en una línea qué pasa.")
# → "El 4821 va en ruta con AndesExpress (AX-88213-CL), entrega estimada 14-nov; sin incidencias."`,
    lang: 'python',
    codeTitle: 'paso 1 · resultado',
    session: { id: S1, events: 4, state: { ...BASE_STATE, last_order_id: '4821' }, note: '4 eventos: mensaje, call, response, texto' },
    memories: [MEM_OLD],
  },
  {
    title: 'Paso 2 · misma sesión: no repite las tools',
    body: 'Segundo turno con el mismo session_id. El runner carga los 4 eventos anteriores y los manda a Gemini como contexto: Andi ya sabe el estado del pedido y redacta la respuesta sin volver a llamar a get_order. Si hubieras creado otra sesión, habría que repetir la consulta (y pagarla).',
    flows: ['orch>gw', 'gw>agent', 'agent>sessions', 'agent>gemini'],
    active: ['orch', 'gw', 'agent', 'sessions', 'gemini'],
    code: `reply = await ask_in_session(user, session_id,
    f"Con lo que encontraste, redacta la respuesta al cliente a este mensaje: {ticket['text']}")
# contexto que ve Gemini: [memoria: prefiere email] + 4 eventos del paso 1 + este mensaje
# → "Hola Camila, tu pedido 4821 va en ruta y llega el jueves 14, antes del viernes…"`,
    lang: 'python',
    codeTitle: 'paso 2 · reutiliza la sesión',
    session: { id: S1, events: 6, state: { ...BASE_STATE, last_order_id: '4821' }, note: '6 eventos: + mensaje y texto del paso 2 (sin tools)' },
    memories: [MEM_OLD],
  },
  {
    title: 'after_agent_callback → Memory Bank aprende',
    body: 'Al terminar cada turno del raíz, save_session_to_memory manda la sesión a Memory Bank. Google extrae hechos con un LLM, los consolida con los anteriores y los deja disponibles para cualquier sesión futura de cus_7781, venga del portal, de Gemini Enterprise o de un evento. Es asíncrono: no frena la respuesta.',
    flows: ['agent>memory'],
    active: ['agent', 'memory'],
    code: `async def save_session_to_memory(callback_context: CallbackContext):
    await callback_context.add_session_to_memory()   # Memory Bank: extrae + consolida hechos del usuario

# Memory Bank (scope app_name + user_id=${CUSTOMER.id}) después de este turno:
#   • prefiere avisos por email, no SMS
#   • necesita el pedido 4821 antes del viernes 15-nov (es un regalo)   ← nuevo`,
    lang: 'python',
    codeTitle: 'examples/andes_prod/agent.py · memoria',
    session: { id: S1, events: 6, state: { ...BASE_STATE, last_order_id: '4821' } },
    memories: [MEM_OLD, { text: `${CUSTOMER.id}: necesita el pedido 4821 antes del viernes 15-nov (regalo)`, fresh: true }],
  },
  {
    title: 'Paso 3 · independiente: sesión nueva, en paralelo',
    body: 'Clasificar el tono del mensaje no necesita nada del paso 1. Sesión nueva (S2) y asyncio.gather para correrlo junto al paso 2. Regla: un turno en vuelo por sesión; lo paralelo va en sesiones distintas. Y el paso queda reproducible por sí solo en un evalset.',
    flows: ['orch>gw', 'gw>agent', 'agent>sessions'],
    active: ['orch', 'gw', 'agent', 'sessions'],
    code: `reply, sentiment = await asyncio.gather(
    ask_in_session(user, session_id, "Con lo que encontraste, redacta …"),   # sesión S  (paso 2)
    ask_once(user, "Clasifica el tono de este mensaje … Responde solo la palabra: …"),  # sesión S2 (paso 3)
)`,
    lang: 'python',
    codeTitle: 'paso 3 · sesión nueva + paralelo',
    session: { id: S2, events: 2, state: BASE_STATE, changed: ['user:customer_id', 'user:role'], note: 'S2: 2 eventos, sin contexto del ticket' },
    memories: [MEM_OLD, { text: `${CUSTOMER.id}: necesita el pedido 4821 antes del viernes 15-nov (regalo)` }],
  },
  {
    title: 'Cierre: lo durable no vive en la sesión',
    body: 'Tu orquestador guarda findings, reply y sentiment en tu base de datos y responde. La sesión S puede expirar o borrarse (async_delete_session): lo que importa ya está en tu DB (resultados) y en Memory Bank (hechos de Camila). En Cloud Trace verás tres invocaciones, dos con la misma sesión.',
    flows: ['gw>orch'],
    active: ['orch'],
    code: `{ "ticket_id": "T-3310", "session_id": "${S1}",
  "findings": "El 4821 va en ruta con AndesExpress (AX-88213-CL), entrega estimada 14-nov; sin incidencias.",
  "reply": "Hola Camila, tu pedido 4821 va en ruta y llega el jueves 14, antes del viernes. …",
  "sentiment": "neutro" }`,
    lang: 'json',
    codeTitle: 'respuesta de /tickets/T-3310/resolve',
    session: { id: S1, events: 6, state: { ...BASE_STATE, last_order_id: '4821' }, note: 'puede expirar o borrarse' },
    memories: [MEM_OLD, { text: `${CUSTOMER.id}: necesita el pedido 4821 antes del viernes 15-nov (regalo)` }],
  },
]

export const SESSION_RULES: { k: string; v: string }[] = [
  { k: 'Una sesión por instancia del proceso', v: 'Un ticket, una corrida nocturna, una solicitud. No una por paso (pierdes contexto y pagas tools repetidas) ni una global (crece sin límite y confunde al modelo).' },
  { k: 'Reutiliza cuando el paso siguiente necesita lo anterior', v: 'Guarda el session_id en el estado de tu orquestador junto al id del proceso. Si un worker muere, el siguiente encuentra la misma sesión.' },
  { k: 'Pasa los datos en el mensaje', v: 'Tu orquestador ya tiene el pedido, el ETA, el texto del cliente: ponlos en el prompt en vez de confiar en que «están en la sesión». Cada paso queda reproducible y evaluable con adk eval.' },
  { k: 'Un turno en vuelo por sesión', v: 'Dos consultas concurrentes sobre la misma sesión entrelazan eventos. Lo paralelo va en sesiones distintas (asyncio.gather con ask_once).' },
  { k: 'Reintentos agregan, no sobrescriben', v: 'Repetir un paso sobre la misma sesión añade otro turno. Haz el paso idempotente de tu lado o usa sesión nueva en el reintento.' },
  { k: 'Lo durable, fuera de la sesión', v: 'Resultados → tu base de datos. Hechos del usuario → Memory Bank (add_session_to_memory) y estado user:. La sesión puede expirar o borrarse.' },
]

/* ------------------------------------------------------------------------ */
/* Lab 6 · ¿Qué sigue aplicando?                                             */
/* ------------------------------------------------------------------------ */
export type GovRow = { piece: string; ge: string; app: string; applies: 'yes' | 'no' | 'diff' }
export const GOVERNANCE: GovRow[] = [
  { piece: 'Agent Gateway (entrada)', ge: 'Autentica la identidad corporativa del empleado e inspecciona el prompt.', app: 'Autentica el principal federado de tu backend (IAM) e inspecciona el prompt. Mismo gateway: es del runtime, no de la app.', applies: 'yes' },
  { piece: 'Model Armor', ge: 'Por política del gateway o por tu ModelArmorPlugin.', app: 'Idéntico. El plugin va dentro del agente; no sabe quién llamó.', applies: 'yes' },
  { piece: 'Agent Identity', ge: 'El agente llama a Toolbox, MCP y APIs con su principal://…', app: 'Idéntico: la identidad es del agente, no de quien lo invoca.', applies: 'yes' },
  { piece: 'Agent Gateway (salida) + Registry', ge: 'Solo tools y servidores MCP registrados; deny por defecto.', app: 'Idéntico. Si el agente debe llamar a TU API (webhook), regístrala como endpoint externo.', applies: 'yes' },
  { piece: 'Sessions y Memory Bank', ge: 'user_id = identidad corporativa; Gemini Enterprise crea las sesiones.', app: 'user_id = el que fija tu backend (cliente del portal, o system:…). Tú creas y reenvías session_id.', applies: 'yes' },
  { piece: 'Plugins, callbacks, Cloud Trace, adk eval', ge: 'Sí.', app: 'Sí: viven en el código del agente y en el runtime.', applies: 'yes' },
  { piece: 'Quién es el usuario final', ge: 'Google lo sabe (cuenta corporativa); OAuth «Authorizations» para actuar en su nombre.', app: 'Google no lo conoce: es un cliente de tu portal. El agente solo ve user_id y el estado que tú pusiste.', applies: 'diff' },
  { piece: 'Galería, descripción, cuota de registro', ge: 'Registras el agente; el LLM de Gemini Enterprise lo elige por su descripción.', app: 'No participa. Tu app llama al agente directamente; no hay registro ni cuota.', applies: 'no' },
  { piece: 'Licencias y costo', ge: 'Licencia Gemini Enterprise por usuario (Standard/Plus/Frontline).', app: 'Pagas consumo de Agent Runtime y tokens de Gemini en tu proyecto; sin licencia por cliente.', applies: 'diff' },
]
