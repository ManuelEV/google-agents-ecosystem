import { useMemo, useState } from 'react'
import { Box, Cloud, Container, Copy, FileCode, Fingerprint, HardDrive, Terminal as TerminalIcon, User } from 'lucide-react'
import { Callout, Checklist, KeyIdeas, Lab, Panel, Section, Segmented, Sources, Tabs, Term } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleDisclaimer, ConsoleField, ConsoleStatus, ConsoleTable, Focus, GcpConsole } from '../../components/Console'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { EventList, ChatBubbles } from '../../components/Events'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { ArchDiagram } from '../../components/Arch'
import { Narration, PlayerBar, type StepInfo } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { AGENT_DISPLAY, FIRST_RUN_EVENTS, LOCATION, PROJECT_NUMBER, REASONING_ENGINE_ID, SESSION_EXAMPLE, STAGING_BUCKET } from '../../sim/scenario'
import { CODE_CONFIG, CODE_QUERY, CODE_REST, CODE_SDK_CREATE, DEPLOY_WAYS, RESOURCE_NAME, TERM_DEPLOY } from './data'
import './lesson.css'

const NAV = [
  { id: 'dashboard', label: 'Panel' },
  { id: 'models', label: 'Model Garden' },
  { id: 'studio', label: 'Agent Studio' },
  { id: 'runtime', label: 'Agent Runtime' },
  { id: 'sessions', label: 'Sessions y Memory Bank' },
  { id: 'eval', label: 'Evaluación' },
]

function ResourcePath() {
  return (
    <span className="dep-resource" title={RESOURCE_NAME}>
      <span className="seg">projects/{PROJECT_NUMBER}</span>
      <span className="seg">locations/{LOCATION}</span>
      <span className="seg">reasoningEngines/</span>
      <span className="seg is-id">{REASONING_ENGINE_ID}</span>
    </span>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 1 · Qué viaja en un despliegue                                        */
/* ------------------------------------------------------------------------ */
const SHIP_NODES: FlowNode[] = [
  { id: 'code', x: 90, y: 90, w: 150, label: 'andes_prod/', sub: 'agent.py · .env · config', tone: 'model', icon: FileCode },
  { id: 'cli', x: 300, y: 90, w: 150, label: 'adk deploy', sub: 'agent_engine', tone: 'system', icon: TerminalIcon },
  { id: 'bucket', x: 510, y: 90, w: 160, label: 'Bucket staging', sub: 'gs://…-agents-staging', tone: 'data', icon: HardDrive },
  { id: 'build', x: 720, y: 90, w: 150, label: 'Build', sub: 'contenedor + deps', tone: 'tool', icon: Container },
  { id: 'rt', x: 720, y: 230, w: 170, h: 64, label: 'Agent Runtime', sub: 'reasoningEngines/ID', tone: 'system', icon: Cloud },
  { id: 'id', x: 510, y: 230, w: 160, label: 'Agent Identity', sub: 'principal://…', tone: 'guard', icon: Fingerprint },
  { id: 'sess', x: 300, y: 230, w: 150, label: 'Sessions', sub: 'creadas con el agente', tone: 'data', icon: Box },
  { id: 'user', x: 90, y: 230, w: 150, label: 'Tu app / GE', sub: ':streamQuery', tone: 'user', icon: User },
]
const SHIP_EDGES: FlowEdge[] = [
  { from: 'code', to: 'cli' },
  { from: 'cli', to: 'bucket' },
  { from: 'bucket', to: 'build' },
  { from: 'build', to: 'rt' },
  { from: 'rt', to: 'id', dashed: true },
  { from: 'rt', to: 'sess', dashed: true },
  { from: 'user', to: 'rt', curve: 60 },
]
const SHIP_STEPS: (StepInfo & { flows: string[] })[] = [
  {
    title: 'Tu carpeta tal cual',
    body: 'agent.py (con root_agent o app), el .env con el backend Vertex y las URLs de tus servicios, y .agent_engine_config.json. Para Python, el paquete excluye el API server y la UI web de ADK: solo va tu agente y sus dependencias declaradas.',
    flows: ['code>cli'],
  },
  {
    title: 'adk deploy sube el código al bucket de staging',
    body: 'Por eso necesitas roles/storage.admin y un bucket en la misma región. El SDK hace lo mismo con config["staging_bucket"]. Las variantes "source files", Dockerfile o imagen de contenedor no usan bucket.',
    flows: ['cli>bucket'],
  },
  {
    title: 'La plataforma construye el contenedor',
    body: 'Instala los requirements (google-adk, google-cloud-aiplatform[agent_engines,adk]…) y empaqueta un servidor que expone :query y :streamQuery según el contrato del runtime. Es la parte lenta: varios minutos.',
    flows: ['bucket>build'],
  },
  {
    title: 'Nace el recurso reasoningEngines/ID',
    body: 'El nombre viejo (reasoning engine) sigue en la API. Con .agent_engine_config.json el agente recibe su propio principal IAM (Agent Identity) en vez de usar una service account; además se crea un recurso de sesiones administradas ligado al agente.',
    flows: ['build>rt', 'rt>id', 'rt>sess'],
  },
  {
    title: 'Cualquier cliente lo consulta por streaming',
    body: 'Tu backend, un script, Gemini Enterprise o la REST API llaman :streamQuery con user_id y message. El runtime escala instancias solo (min/max_instances configurables por SDK).',
    flows: ['user>rt'],
  },
]

function ShipLab() {
  const player = usePlayer(SHIP_STEPS.length, { interval: 3600 })
  const s = SHIP_STEPS[player.step]
  return (
    <Lab title="Qué viaja cuando despliegas" hint="Reproduce o salta de paso">
      <PlayerBar player={player} labels={SHIP_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={SHIP_NODES} edges={SHIP_EDGES} width={960} height={300} flows={s.flows} ariaLabel="Flujo de un despliegue en Agent Runtime" />
      <Narration steps={SHIP_STEPS} step={player.step} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Terminal: deploy.sh                                               */
/* ------------------------------------------------------------------------ */
const DEPLOY_PHASES = [
  { until: 'gcloud services enable', label: 'Autenticación' },
  { until: 'gcloud storage buckets create', label: 'APIs' },
  { until: 'cat andes_prod/.env', label: 'Bucket de staging' },
  { until: 'adk deploy agent_engine', label: '.env y config' },
  { until: 'export AGENT_ENGINE_ID', label: 'Despliegue' },
]
function DeployTerminalLab() {
  const player = useTerminalPlayer(TERM_DEPLOY)
  const phase = useMemo(() => {
    let p = 0
    TERM_DEPLOY.slice(0, player.upTo).forEach((l) => {
      if (l.kind !== 'cmd') return
      const idx = DEPLOY_PHASES.findIndex((ph) => l.text.startsWith(ph.until))
      if (idx >= 0) p = Math.max(p, idx + 1)
    })
    return p
  }, [player.upTo])
  return (
    <Lab title="deploy.sh, comando a comando" hint="Pulsa ▶" footer={<span className="small muted">Salida simulada a partir de la documentación; los tiempos reales de "Creating AgentEngine…" son de varios minutos.</span>}>
      <div className="dep-grid">
        <Terminal lines={TERM_DEPLOY} upTo={player.upTo} typed={player.typed} player={player} title="bash · examples/" maxHeight={480} />
        <div className="stack">
          <Panel title="Dónde vas" tone="system">
            <Checklist items={[...DEPLOY_PHASES.map((p) => p.label), 'ID guardado']} current={player.done ? DEPLOY_PHASES.length + 1 : phase} />
          </Panel>
          <Panel title="Los flags que importan" tone="tool" bodyStyle={{ fontSize: 13.5 }}>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)' }}>
              <li>
                <code>--project</code> / <code>--region</code>: dónde vive el recurso (la región debe soportar Agent Runtime, p. ej. us-central1).
              </li>
              <li>
                <code>--staging_bucket</code>: a dónde se sube el código antes del build.
              </li>
              <li>
                <code>--display_name</code>: el nombre que verás en la consola.
              </li>
              <li>
                <code>--otel_to_cloud</code>: trazas a Cloud Trace; por defecto sin contenido de mensajes.
              </li>
              <li>
                El último argumento es la <strong>carpeta</strong> del agente (<code>andes_prod</code>), igual que con <code>adk run</code>.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Consola: Agent Runtime                                            */
/* ------------------------------------------------------------------------ */
type CStep = StepInfo & { screen: 'list' | 'detail' | 'sessions' | 'copy'; focus?: string }
const CONSOLE_STEPS: CStep[] = [
  {
    title: 'La lista de agentes desplegados',
    body: 'Menú ☰ → Agent Platform → Agent Runtime. La consola sigue viviendo bajo la ruta vertex-ai/agents/agent-engines. Aquí ves el estado del despliegue (el LRO que imprimió adk deploy), la región y el tipo de identidad.',
    screen: 'list',
    focus: 'row',
  },
  {
    title: 'Detalle del agente: el resource path',
    body: 'Al abrir "Andi · Operaciones" tienes el nombre completo del recurso. El último segmento es el RESOURCE_ID que usarás en todas partes: SDK, REST, Sessions/Memory Bank y el registro en Gemini Enterprise.',
    screen: 'detail',
    focus: 'path',
  },
  {
    title: 'Copia el ID',
    body: 'Guárdalo como AGENT_ENGINE_ID en tu entorno. En el repo, query_remote.py y register_gemini_enterprise.sh lo leen de ahí.',
    screen: 'copy',
    focus: 'copy',
  },
  {
    title: 'Sesiones y memoria viven junto al agente',
    body: 'El despliegue creó también el recurso de sesiones administradas. En las pestañas Sessions y Memory Bank ves conversaciones por user_id y las memorias extraídas (las trabajas en la lección anterior). Logs y trazas se abren en Cloud Logging / Trace Explorer.',
    screen: 'sessions',
    focus: 'tab',
  },
]

function ConsoleScreen({ s }: { s: CStep }) {
  const f = (id: string) => s.focus === id
  if (s.screen === 'list')
    return (
      <GcpConsole title="Agent Runtime" url="vertex-ai/agents/agent-engines" nav={NAV} activeNav="runtime" crumbs={['Agent Platform', 'Agent Runtime']}>
        <div className="row">
          <ConsoleButton primary small>
            + Desplegar agente
          </ConsoleButton>
          <ConsoleField label="Filtro" placeholder="Filtrar por nombre o región" width={320} />
        </div>
        <Focus on={f('row')} style={{ display: 'block' }}>
          <ConsoleTable
            cols={['Nombre', 'Estado', 'Región', 'Identidad', 'Framework', 'Creado']}
            rows={[
              [<span className="gc-link">{AGENT_DISPLAY}</span>, <ConsoleStatus ok>Listo</ConsoleStatus>, LOCATION, 'Agent Identity', 'google-adk 2.14.1', '13 nov 2026, 11:42'],
              [<span className="gc-link">andes-memory-store</span>, <ConsoleStatus ok>Listo</ConsoleStatus>, LOCATION, 'Service account', '—', '12 nov 2026, 09:10'],
            ]}
            hl={0}
          />
        </Focus>
      </GcpConsole>
    )
  if (s.screen === 'detail' || s.screen === 'copy')
    return (
      <GcpConsole title={AGENT_DISPLAY} url={`vertex-ai/agents/agent-engines/${REASONING_ENGINE_ID}`} nav={NAV} activeNav="runtime" crumbs={['Agent Platform', 'Agent Runtime', AGENT_DISPLAY]} tabs={['Detalles', 'Sessions', 'Memory Bank', 'Logs']} activeTab="Detalles">
        <ConsoleCard title="Información del recurso">
          <Focus on={f('path')} style={{ display: 'block' }}>
            <ConsoleField label="Nombre del recurso" value={<ResourcePath />} hint="El último segmento es el RESOURCE_ID (AGENT_ENGINE_ID en los scripts del repo)." />
          </Focus>
          <div className="row">
            <ConsoleButton focus={f('copy')} icon={Copy} small>
              Copiar ID
            </ConsoleButton>
            <ConsoleButton small>Ver en Trace Explorer</ConsoleButton>
          </div>
          <ConsoleField label="Identidad" value={<span className="mono small">principal://…/{REASONING_ENGINE_ID}</span>} hint="identity_type: AGENT_IDENTITY (desde .agent_engine_config.json)" />
          <ConsoleField label="Estado" value={<ConsoleStatus ok>Listo · última operación finalizada</ConsoleStatus>} />
        </ConsoleCard>
        {s.screen === 'copy' && <ConsoleBanner tone="ok">ID copiado: {REASONING_ENGINE_ID}</ConsoleBanner>}
      </GcpConsole>
    )
  return (
    <GcpConsole title={AGENT_DISPLAY} url={`vertex-ai/agents/agent-engines/${REASONING_ENGINE_ID}`} nav={NAV} activeNav="runtime" crumbs={['Agent Platform', 'Agent Runtime', AGENT_DISPLAY]} tabs={['Detalles', 'Sessions', 'Memory Bank', 'Logs']} activeTab="Sessions">
      <Focus on={f('tab')} style={{ display: 'block' }}>
        <ConsoleTable
          cols={['ID de sesión', 'user_id', 'Eventos', 'Última actualización']}
          rows={[
            [<span className="mono small">{SESSION_EXAMPLE.id}</span>, SESSION_EXAMPLE.user_id, '4', '13 nov 2026, 12:03'],
            [<span className="mono small">7a2e5d10-91bb-4c6e-8a37-0f4d2b9e1c21</span>, 'cus_1032', '9', '13 nov 2026, 11:58'],
          ]}
          hl={0}
        />
      </Focus>
      <p>Memory Bank: 3 memorias para cus_7781 (scope andes_ops) · Logs: abrir en Cloud Logging.</p>
    </GcpConsole>
  )
}

function ConsoleLab() {
  const player = usePlayer(CONSOLE_STEPS.length, { interval: 5200 })
  const s = CONSOLE_STEPS[player.step]
  return (
    <Lab title="Lo que ves en la consola después del deploy" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={CONSOLE_STEPS.map((x) => x.title)} />
      <div className="dep-grid" style={{ marginTop: 12 }}>
        <div className="anim-fade" key={player.step}>
          <ConsoleScreen s={s} />
        </div>
        <Narration steps={CONSOLE_STEPS} step={player.step} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Consulta remota paso a paso                                       */
/* ------------------------------------------------------------------------ */
type QStep = StepInfo & { events: number; hl: string[]; chat: number; typing?: boolean }
const Q_STEPS: QStep[] = [
  {
    title: 'Obtener el agente remoto',
    body: 'vertexai.Client(project, location) y client.agent_engines.get(name=RESOURCE). No descarga nada: es un handle al recurso reasoningEngines/ID. Con el SDK 2.0.1+ la llamada es client.runtimes.get(name=…).',
    events: 0,
    hl: ['client = vertexai.Client', 'remote_agent = client.agent_engines.get'],
    chat: 0,
  },
  {
    title: 'Crear (o reutilizar) una sesión',
    body: 'async_create_session(user_id="cus_7781") crea una sesión administrada en Sessions y devuelve su id. Si la omites en la consulta, el runtime crea una nueva cada vez: pierdes el historial.',
    events: 0,
    hl: ['session = await remote_agent.async_create_session', 'session_id = session["id"]'],
    chat: 0,
  },
  {
    title: 'Enviar el mensaje por streaming',
    body: 'async_stream_query(user_id, session_id, message) abre un stream SSE. El primer evento es el mensaje del usuario ya persistido en la sesión.',
    events: 1,
    hl: ['async for event in remote_agent.async_stream_query'],
    chat: 1,
    typing: true,
  },
  {
    title: 'Llega el function_call',
    body: 'A los ~800 ms el modelo decide llamar get_order_status. El evento es un dict con author, content.parts y usage: lo mismo que veías en adk web, serializado.',
    events: 2,
    hl: ['if "function_call" in part'],
    chat: 1,
    typing: true,
  },
  {
    title: 'La herramienta se ejecutó dentro del runtime',
    body: 'Tu función Python corrió en el contenedor administrado y su resultado vuelve como function_response. Si la herramienta hablara con Toolbox o un MCP externo, el runtime necesitaría red hacia ellos (URLs en el .env).',
    events: 3,
    hl: ['elif "function_response" in part'],
    chat: 1,
    typing: true,
  },
  {
    title: 'Respuesta final y state_delta',
    body: 'El último evento trae el texto y actions.state_delta (last_order_id). Queda guardado en la sesión administrada: la siguiente consulta con el mismo session_id ya lo sabe.',
    events: 4,
    hl: ['elif "text" in part'],
    chat: 2,
  },
]

function QueryLab() {
  const player = usePlayer(Q_STEPS.length, { interval: 3600 })
  const s = Q_STEPS[player.step]
  const chat = [
    { role: 'user' as const, text: '¿Dónde está mi pedido 4821?' },
    { role: 'agent' as const, name: 'andes_ops', text: 'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. La entrega estimada es el 14 de noviembre.' },
  ].slice(0, s.chat)
  return (
    <Lab title="Consultar el agente desplegado" hint="Reproduce y sigue el código">
      <PlayerBar player={player} labels={Q_STEPS.map((x) => x.title)} />
      <div className="dep-query" style={{ marginTop: 12 }}>
        <Tabs
          tabs={[
            { id: 'py', label: 'SDK Python · query_remote.py', content: <Code code={CODE_QUERY} lang="python" title="examples/andes_prod/query_remote.py (resumido)" highlight={linesOf(CODE_QUERY, ...s.hl)} dim maxHeight={420} /> },
            { id: 'rest', label: 'REST · query_remote.sh', content: <Code code={CODE_REST} lang="bash" title="examples/andes_prod/query_remote.sh" highlight={linesOf(CODE_REST, ':streamQuery', 'class_method')} /> },
          ]}
        />
        <div className="stack">
          <Narration steps={Q_STEPS} step={player.step} />
          <Panel title="Lo que ve el usuario" tone="user">
            <ChatBubbles items={chat} typing={s.typing} />
          </Panel>
          <Panel title="Eventos del stream" tone="model" right={<span className="mono small">session {SESSION_EXAMPLE.id.slice(0, 8)}…</span>}>
            <EventList events={FIRST_RUN_EVENTS} upTo={s.events} showTiming showUsage empty="Esperando async_stream_query…" />
          </Panel>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · CLI vs SDK                                                        */
/* ------------------------------------------------------------------------ */
function HowLab() {
  const [how, setHow] = useState<'cli' | 'sdk' | 'config'>('cli')
  return (
    <Lab title="Tres archivos, dos caminos" hint="Cambia de vista">
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented
          options={[
            { value: 'cli', label: 'adk deploy (CLI)' },
            { value: 'sdk', label: 'SDK Python' },
            { value: 'config', label: '.agent_engine_config.json' },
          ]}
          value={how}
          onChange={setHow}
        />
      </div>
      <div key={how} className="anim-fade">
        {how === 'cli' && (
          <>
            <Code
              code={`adk deploy agent_engine \\
  --project=$GOOGLE_CLOUD_PROJECT \\
  --region=$GOOGLE_CLOUD_LOCATION \\
  --staging_bucket=${STAGING_BUCKET} \\
  --display_name="Andi · Operaciones" \\
  --otel_to_cloud \\
  andes_prod`}
              lang="bash"
              title="examples/andes_prod/deploy.sh (fragmento)"
            />
            <p className="dep-sdk-note">
              Alternativas que no cubre este tutorial: <code>adk deploy cloud_run</code> (el mismo agente en Cloud Run, tú administras el servicio) y{' '}
              <code>agents-cli deploy --agent-identity</code> (Agents CLI, preview, con Terraform y CI/CD incluidos).
            </p>
          </>
        )}
        {how === 'sdk' && (
          <Code code={CODE_SDK_CREATE} lang="python" title="SDK · vertexai.Client + agent_engines (quickstart ADK)" highlight={linesOf(CODE_SDK_CREATE, 'client.agent_engines.create', '"identity_type"', 'client.runtimes.create')} maxHeight={460} />
        )}
        {how === 'config' && (
          <>
            <Code code={CODE_CONFIG} lang="json" title="examples/andes_prod/.agent_engine_config.json" />
            <p className="dep-sdk-note">
              Si falta el archivo, el runtime usa una service account y los despliegues con infraestructura como código existentes siguen funcionando. Con{' '}
              <code>AGENT_IDENTITY</code> el agente recibe un principal propio (<code>principal://…</code>): lo verás en la lección de seguridad.
            </p>
          </>
        )}
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Agent Runtime: el mismo agente, hosting administrado">
        <p>
          <Term tip="Hosting administrado de agentes en la Gemini Enterprise Agent Platform; hasta abril de 2026 se llamó Vertex AI Agent Engine.">Agent Runtime</Term>{' '}
          (antes Agent Engine) ejecuta tu agente ADK sin que administres servidores: escala instancias, le da identidad propia, guarda sesiones y
          memoria, y expone dos métodos, <code>:query</code> y <code>:streamQuery</code>. En la API el recurso se llama{' '}
          <code>reasoningEngines/ID</code> y el comando de ADK sigue siendo <code>adk deploy agent_engine</code>: los nombres viejos persisten.
        </p>
        <p>Hay seis formas de llegar ahí. Este tutorial usa la primera, que es también la que usa la CLI de ADK.</p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Forma</th>
                <th>Lenguaje</th>
                <th>Cuándo</th>
                <th>Bucket de staging</th>
              </tr>
            </thead>
            <tbody>
              {DEPLOY_WAYS.map((w, i) => (
                <tr key={w.name} className={i === 0 ? 'is-hl' : ''}>
                  <td>
                    <strong>{w.name}</strong>
                  </td>
                  <td>{w.lang}</td>
                  <td>{w.when}</td>
                  <td>{w.bucket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ShipLab />
        <Callout tone="warn" title="Es un servicio de pago">
          Agent Runtime cobra por uso sobre un nivel gratuito; Sessions y Memory Bank cobran por operación. Para experimentar, borra el recurso al
          terminar (<code>remote_agent.delete(force=True)</code> elimina también las sesiones administradas).
        </Callout>
      </Section>

      <Section n={2} title="El despliegue, en el terminal">
        <p>
          El script <code>examples/andes_prod/deploy.sh</code> reúne lo que preparaste en la lección de proyecto (APIs, bucket) con el <code>.env</code>{' '}
          que viajará dentro del contenedor y el archivo de configuración que activa Agent Identity. Todo termina en una línea de salida que debes
          guardar.
        </p>
        <DeployTerminalLab />
        <HowLab />
      </Section>

      <Section n={3} title="En la consola">
        <p>
          La consola no es necesaria para desplegar, pero es donde confirmas el estado del LRO, encuentras el ID si lo perdiste y exploras sesiones,
          memorias y logs del agente.
        </p>
        <ConsoleLab />
        <Callout tone="info" title="Nombres de pestañas: a confirmar">
          La ruta <code>vertex-ai/agents/agent-engines</code> y la columna de estado salen de la documentación; el nombre exacto de las pestañas del
          detalle (Sessions, Memory Bank, Logs) es una aproximación de cómo la consola agrupa esos recursos en noviembre de 2026.
        </Callout>
      </Section>

      <Section n={4} title="Consultar al agente desplegado">
        <p>
          Desplegado el agente, cualquier cliente con permiso lo consulta: un script con el SDK, tu backend por REST, o Gemini Enterprise cuando lo
          registres. La secuencia es siempre la misma: obtener el recurso, crear una sesión para el usuario y abrir el stream de eventos.
        </p>
        <QueryLab />
        <Callout tone="tip" title="Dos generaciones del SDK conviven">
          La documentación del quickstart usa <code>vertexai.Client</code> + <code>client.agent_engines</code> (paquete{' '}
          <code>google-cloud-aiplatform[agent_engines,adk]</code>). El SDK 2.0.1+ renombra el módulo a <code>agentplatform</code> y{' '}
          <code>agent_engines</code> pasa a <code>runtimes</code> (<code>client.runtimes.create / get</code>). Los métodos del agente remoto
          (<code>async_create_session</code>, <code>async_stream_query</code>, <code>async_list_sessions</code>, <code>async_delete_session</code>) no
          cambian.
        </Callout>
        <Callout tone="warn" title="Errores típicos">
          <p>
            <strong>403 al consultar</strong>: tu usuario necesita <code>roles/aiplatform.user</code> (o un rol custom con <code>reasoningEngines.query</code>).
          </p>
          <p>
            <strong>El agente no llega a Toolbox / MCP</strong>: las URLs del <code>.env</code> deben ser alcanzables desde el runtime (servicios en Cloud Run
            con la identidad del agente autorizada), no <code>127.0.0.1</code>.
          </p>
          <p>
            <strong>Historial perdido</strong>: consultaste sin <code>session_id</code>; cada llamada abrió una sesión nueva.
          </p>
        </Callout>
      </Section>

      <Section n={5} title="Lo que agregamos a la arquitectura">
        <p>
          El agente, sus sesiones y su memoria dejan tu laptop y pasan a Agent Runtime. Lo que sigue (seguridad, evaluación, publicación) se apoya en
          ese recurso y en su ID.
        </p>
        <ArchDiagram stage={5} />
      </Section>

      <KeyIdeas
        items={[
          <>
            <code>adk deploy agent_engine --project --region --staging_bucket --display_name [--otel_to_cloud] &lt;carpeta&gt;</code> sube el código,
            construye el contenedor y crea <code>reasoningEngines/ID</code>. Guarda ese ID.
          </>,
          <>
            <code>.agent_engine_config.json</code> con <code>{'{"identity_type": "AGENT_IDENTITY"}'}</code> le da al agente su propio principal IAM.
          </>,
          <>
            Consulta: <code>client.agent_engines.get(name)</code> → <code>async_create_session(user_id)</code> → <code>async_stream_query(user_id, session_id, message)</code>.
            Por REST: <code>POST …/reasoningEngines/ID:streamQuery?alt=sse</code> con <code>class_method</code> e <code>input</code>.
          </>,
          <>Las URLs de tus herramientas (Toolbox, MCP) viajan en el <code>.env</code> y deben ser alcanzables desde el runtime.</>,
          <>El SDK 2.0.1+ renombra <code>agent_engines</code> a <code>runtimes</code>; los métodos del agente remoto no cambian.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · desplegar en Agent Runtime (comando y salida)', href: 'https://adk.dev/deploy/agent-runtime/deploy/' },
          { label: 'Agent Runtime · seis formas de desplegar y config del SDK', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/deploy-an-agent' },
          { label: 'Agent Runtime · quickstart con ADK (vertexai.Client, AdkApp, create, delete)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/quickstart-adk' },
          { label: 'Usar un agente ADK desplegado (sesiones, async_stream_query, REST)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-adk-agent' },
          { label: 'Agent Identity (identity_type y .agent_engine_config.json)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity' },
          { label: 'ADK · Cloud Trace (--otel_to_cloud)', href: 'https://adk.dev/integrations/cloud-trace/' },
        ]}
      />
    </>
  )
}
