import { useState } from 'react'
import { Bot, Brain, Layers, Network, Plug, Search, User } from 'lucide-react'
import { ArchDiagram } from '../../components/Arch'
import { Code, linesOf } from '../../components/Code'
import { ConsoleBanner, ConsoleButton, ConsoleCard, ConsoleDisclaimer, ConsoleField, ConsoleStatus, ConsoleSteps, ConsoleTable, Focus, GcpConsole } from '../../components/Console'
import { ChatBubbles } from '../../components/Events'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { Narration, PlayerBar } from '../../components/Player'
import { Callout, DocLink, KeyIdeas, Lab, Panel, Pill, Section, Sources, Tabs, Term } from '../../components/ui'
import { usePlayer } from '../../lib/hooks'
import { AGENT_DISPLAY, PROJECT_ID } from '../../sim/scenario'
import { A2A_CONSUME, A2A_EXPOSE, A2A_STEPS, AGENT_CARD, APP_ID, CARD_FIELDS, REG_STEPS, RESOURCE_PATH, REST_REGISTER, type RegStep } from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Registro en la consola, paso a paso                               */
/* ------------------------------------------------------------------------ */
const NAV = [
  { id: 'apps', label: 'Apps' },
  { id: 'agents', label: 'Agents' },
  { id: 'data', label: 'Data stores' },
  { id: 'auth', label: 'Authorizations' },
]
const DESCRIPTION = 'Consulta pedidos, envíos, devoluciones y stock de Andes Market. Úsalo para cualquier pregunta operativa de clientes o del equipo interno.'

function RegScreen({ s }: { s: RegStep }) {
  const f = (id: string) => s.focus === id
  const crumbsApp = ['Gemini Enterprise', 'Apps', 'andes-empleados']
  if (s.screen === 'apps')
    return (
      <GcpConsole product="Gemini Enterprise" title="Apps" url="gen-app-builder/engines" nav={NAV} activeNav="apps" crumbs={['Gemini Enterprise', 'Apps']}>
        <ConsoleTable
          cols={['Nombre', 'ID', 'Región']}
          rows={[
            [
              <Focus on={f('app')}>
                <span className="gc-link">andes-empleados</span>
              </Focus>,
              <span className="mono small">{APP_ID}</span>,
              'global',
            ],
            [<span className="gc-link">soporte-interno</span>, <span className="mono small">soporte_1759001200</span>, 'global'],
          ]}
          hl={0}
        />
      </GcpConsole>
    )
  if (s.screen === 'agents-empty')
    return (
      <GcpConsole product="Gemini Enterprise" title="andes-empleados" url={`gen-app-builder/engines/${APP_ID}/agents`} nav={NAV} activeNav="agents" crumbs={crumbsApp} tabs={['Overview', 'Agents', 'Data', 'Configurations']} activeTab="Agents">
        <div className="row">
          <ConsoleButton primary focus={f('add')}>
            Add agent
          </ConsoleButton>
        </div>
        <ConsoleTable cols={['Agent name', 'Type', 'State', 'Updated']} rows={[[<span className="muted">Sin agentes registrados todavía</span>, '', '', '']]} />
      </GcpConsole>
    )
  if (s.screen === 'add')
    return (
      <GcpConsole product="Gemini Enterprise" title="Add an agent" url={`gen-app-builder/engines/${APP_ID}/agents/add`} nav={NAV} activeNav="agents" crumbs={[...crumbsApp, 'Agents', 'Add agent']}>
        <p>Choose an agent type</p>
        <div className="ge-type">
          <Bot size={18} color="var(--gc-blue)" />
          <div style={{ flex: 1 }}>
            <div className="t">Custom agent via Agent Runtime</div>
            <div className="d">Un agente ADK desplegado en Agent Runtime de este u otro proyecto.</div>
          </div>
          <ConsoleButton primary small focus={f('runtime')}>
            Add
          </ConsoleButton>
        </div>
        <div className="ge-type">
          <Network size={18} color="var(--gc-blue)" />
          <div style={{ flex: 1 }}>
            <div className="t">Custom agent via A2A</div>
            <div className="d">Cualquier agente que exponga una Agent Card (A2A v0.3) y una URL alcanzable.</div>
          </div>
          <ConsoleButton small>Add</ConsoleButton>
        </div>
        <div className="ge-type">
          <Layers size={18} color="var(--gc-blue)" />
          <div style={{ flex: 1 }}>
            <div className="t">Agents via Marketplace</div>
            <div className="d">Agentes de partners publicados en Google Cloud Marketplace.</div>
          </div>
          <ConsoleButton small>Add</ConsoleButton>
        </div>
      </GcpConsole>
    )
  if (s.screen === 'auth')
    return (
      <GcpConsole product="Gemini Enterprise" title="Custom agent via Agent Runtime" url={`gen-app-builder/engines/${APP_ID}/agents/add/runtime`} nav={NAV} activeNav="agents" crumbs={[...crumbsApp, 'Agents', 'Add agent']}>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <ConsoleSteps steps={['Authorizations', 'Configure agent']} current={0} />
          <ConsoleCard title="Authorizations (optional)">
            <p>Solo si el agente accede a recursos de Google Cloud en nombre del usuario (OAuth web client con los redirect URIs de Gemini Enterprise).</p>
            <ConsoleButton small>+ Add authorization</ConsoleButton>
            <ConsoleField label="Authorization name" placeholder="p. ej. andes-drive" hint="El ID se genera del nombre y no se puede cambiar." />
            <ConsoleField label="Client ID" placeholder="…apps.googleusercontent.com" />
            <ConsoleField label="Client secret" placeholder="GOCSPX-…" />
          </ConsoleCard>
        </div>
        <div className="row">
          <ConsoleButton primary focus={f('next')}>
            Next
          </ConsoleButton>
          <ConsoleButton>Cancel</ConsoleButton>
        </div>
      </GcpConsole>
    )
  if (s.screen === 'configure')
    return (
      <GcpConsole product="Gemini Enterprise" title="Custom agent via Agent Runtime" url={`gen-app-builder/engines/${APP_ID}/agents/add/runtime`} nav={NAV} activeNav="agents" crumbs={[...crumbsApp, 'Agents', 'Add agent']}>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <ConsoleSteps steps={['Authorizations', 'Configure agent']} current={1} />
          <div className="stack" style={{ gap: 10 }}>
            <ConsoleField label="Agent name" value={AGENT_DISPLAY} required hint="Nombre visible en la app web de Gemini Enterprise." />
            <ConsoleField label="Describe your agent" value={DESCRIPTION} kind="textarea" required hint="El LLM lo usa para decidir cuándo invocar este agente. Sé concreto." />
            <ConsoleField label="Agent Runtime resource path" value={RESOURCE_PATH} kind="code" required hint="projects/PROJECT_ID/locations/LOCATION/reasoningEngines/RESOURCE_ID (lo imprimió adk deploy)." />
          </div>
        </div>
        <div className="row">
          <ConsoleButton primary focus={f('create')}>
            Create
          </ConsoleButton>
          <ConsoleButton>Back</ConsoleButton>
        </div>
      </GcpConsole>
    )
  if (s.screen === 'created')
    return (
      <GcpConsole product="Gemini Enterprise" title="andes-empleados" url={`gen-app-builder/engines/${APP_ID}/agents`} nav={NAV} activeNav="agents" crumbs={crumbsApp} tabs={['Overview', 'Agents', 'Data', 'Configurations']} activeTab="Agents">
        <ConsoleBanner tone="ok">Agent «{AGENT_DISPLAY}» created.</ConsoleBanner>
        <ConsoleTable
          cols={['Agent name', 'Type', 'State', 'Resource']}
          rows={[[<span className="gc-link">{AGENT_DISPLAY}</span>, 'Agent Runtime', <ConsoleStatus ok>ENABLED</ConsoleStatus>, <span className="mono small">…/reasoningEngines/4890128374650163200</span>]]}
          hl={0}
        />
        <div className="row">
          <ConsoleButton small>Edit</ConsoleButton>
          <ConsoleButton small>Delete</ConsoleButton>
        </div>
      </GcpConsole>
    )
  return <GalleryApp />
}

function GalleryApp() {
  return (
    <div className="ge-app" role="img" aria-label="Simulación de la app web de Gemini Enterprise con la galería de agentes">
      <div className="ge-app-top">
        <Layers size={18} color="var(--c-user)" /> Gemini Enterprise · Andes Market
        <span className="muted small" style={{ marginLeft: 'auto' }}>
          camila.rojas@…
        </span>
      </div>
      <div className="ge-app-body">
        <div className="ge-app-side">
          <div className="label">Agentes</div>
          <div className="ge-agent-card is-active">
            <span className="n">{AGENT_DISPLAY}</span>
            <span className="d">Pedidos, envíos, devoluciones y stock</span>
          </div>
          <div className="ge-agent-card">
            <span className="n">Asistente RR. HH.</span>
            <span className="d">Vacaciones, beneficios, políticas</span>
          </div>
          <div className="ge-agent-card">
            <span className="n">Buscar en la empresa</span>
            <span className="d">Drive, Confluence, tickets</span>
          </div>
        </div>
        <div className="ge-app-chat">
          <ChatBubbles
            items={[
              { role: 'user', text: '¿Dónde está mi pedido 4821?' },
              { role: 'agent', name: AGENT_DISPLAY, text: 'Tu pedido 4821 (Zapatillas trekking Cordillera 41, $69.990) va en ruta con AndesExpress, seguimiento AX-88213-CL. Entrega estimada: 14 de noviembre.' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function RegisterLab() {
  const player = usePlayer(REG_STEPS.length, { interval: 5600 })
  const s = REG_STEPS[player.step]
  return (
    <Lab title="Registrar a Andi en una app de Gemini Enterprise" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={REG_STEPS.map((x) => x.title)} />
      <div className="ge-reg" style={{ marginTop: 12 }}>
        <div className="anim-fade" key={player.step}>
          <RegScreen s={s} />
        </div>
        <Narration steps={REG_STEPS} step={player.step} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Agent Card                                                        */
/* ------------------------------------------------------------------------ */
function CardLab() {
  const [sel, setSel] = useState(CARD_FIELDS[5].id)
  const f = CARD_FIELDS.find((x) => x.id === sel)!
  return (
    <Lab title="La Agent Card: lo que exige Gemini Enterprise" hint="Haz clic en un campo">
      <div className="ge-card-lab">
        <div>
          {CARD_FIELDS.map((x) => (
            <button key={x.id} className={`ge-field${x.id === sel ? ' is-active' : ''}`} onClick={() => setSel(x.id)}>
              <code>{x.label}</code>
              {x.required ? <span className="req">requerido</span> : <span className="opt">opcional</span>}
              {x.id === sel && <p className="anim-fade">{x.body}</p>}
            </button>
          ))}
        </div>
        <Code code={AGENT_CARD} lang="json" title="GET /.well-known/agent-card.json" highlight={linesOf(AGENT_CARD, ...f.needles)} dim maxHeight={520} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Delegación A2A paso a paso                                        */
/* ------------------------------------------------------------------------ */
const NODES: FlowNode[] = [
  { id: 'user', x: 75, y: 170, w: 120, label: 'Camila', sub: 'Gemini Enterprise', tone: 'user', icon: User },
  { id: 'root', x: 270, y: 170, w: 160, h: 66, label: 'andes_ops', sub: 'ADK · Agent Runtime', tone: 'model', icon: Bot },
  { id: 'gemini', x: 270, y: 50, w: 140, label: 'Gemini', sub: 'gemini-4-hydrogen', tone: 'model', icon: Brain },
  { id: 'card', x: 610, y: 50, w: 190, h: 56, label: 'Agent Card', sub: '/.well-known/agent-card.json', tone: 'system', icon: Search },
  { id: 'remote', x: 610, y: 170, w: 170, h: 66, label: 'logistica_agent', sub: 'A2A · otro equipo', tone: 'tool', icon: Network, cls: 'is-outside' },
  { id: 'carrier', x: 860, y: 170, w: 160, label: 'AndesExpress', sub: 'API transportista', tone: 'data', icon: Plug, cls: 'is-outside' },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'root' },
  { from: 'root', to: 'gemini' },
  { from: 'root', to: 'card', dashed: true, label: 'GET card' },
  { from: 'root', to: 'remote', label: 'message/send' },
  { from: 'remote', to: 'carrier' },
]

function A2ALab() {
  const player = usePlayer(A2A_STEPS.length, { interval: 4600 })
  const s = A2A_STEPS[player.step]
  return (
    <Lab title="Andi delega en el agente de logística por A2A" hint="Reproduce o haz clic en un paso">
      <PlayerBar player={player} labels={A2A_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={NODES} edges={EDGES} width={960} height={260} flows={s.flows} ariaLabel="Delegación A2A entre el agente de Andes Market y el agente de logística" />
      <div className="ge-a2a">
        <Narration steps={A2A_STEPS} step={player.step} />
        <div className="anim-fade" key={player.step}>
          {s.lang === 'text' ? (
            <div className="ge-bubble" data-tone={player.step === 0 ? 'user' : 'model'}>
              {s.code}
            </div>
          ) : (
            <Code code={s.code} lang={s.lang} title={s.lang === 'http' ? 'HTTP' : 'JSON'} maxHeight={260} lineNumbers={false} />
          )}
        </div>
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Gemini Enterprise: donde la gente usa los agentes">
        <p>
          Hasta aquí Andi vive en Agent Runtime y solo lo alcanza quien tiene credenciales y conoce el <code>RESOURCE_ID</code>. <strong>Gemini Enterprise</strong>{' '}
          (hasta 2025, Agentspace) es la aplicación donde los empleados de la organización chatean, buscan en las fuentes conectadas y eligen agentes de una
          galería, con su identidad corporativa. Un administrador <em>registra</em> el agente en una app; desde ahí lo descubre todo el mundo.
        </p>
        <p>
          El registro es un asistente de dos pasos en la consola. Los nombres de pantalla de la simulación son los de la documentación de noviembre de
          2026; lo que no cambia es el dato clave: la ruta <code>projects/…/locations/…/reasoningEngines/ID</code> que imprimió <code>adk deploy</code>.
        </p>
        <RegisterLab />
        <Callout tone="warn" title="Cuotas y regiones">
          Cada registro consume una unidad de la cuota diaria de creación de agentes: <strong>1 por usuario y día</strong> con licencia Standard (10 con Plus, 0
          con Frontline). Un pipeline que registra muchas apps recibe <code>HTTP 429 RESOURCE_EXHAUSTED</code>. Además, una app en <code>us</code> solo acepta
          agentes en regiones <code>us-*</code>, y una en <code>eu</code> en <code>europe-*</code>; <code>global</code> acepta cualquiera.
        </Callout>
      </Section>

      <Section n={2} title="Lo mismo por API (para CI/CD)">
        <p>
          La consola llama a la Discovery Engine API. El script <code className="ge-break">examples/andes_prod/register_gemini_enterprise.sh</code> hace el POST con{' '}
          <code className="ge-break">adkAgentDefinition.provisionedReasoningEngine</code>; para actualizar usas PATCH y para borrar DELETE sobre el mismo recurso. Si el agente está
          en otro proyecto, antes concede al service agent de Gemini Enterprise permisos sobre el proyecto que lo hospeda.
        </p>
        <Tabs
          tabs={[
            { id: 'rest', label: 'REST', content: <Code code={REST_REGISTER} lang="bash" title="examples/andes_prod/register_gemini_enterprise.sh" highlight={linesOf(REST_REGISTER, 'provisionedReasoningEngine', 'reasoningEngine', 'default_assistant/agents')} /> },
            {
              id: 'cli',
              label: 'Agents CLI',
              content: (
                <div className="stack">
                  <Code code={`# Si desplegaste con Agents CLI, el deployment_metadata.json ya tiene el ID del runtime\nagents-cli publish gemini-enterprise`} lang="bash" title="bash" />
                  <span className="small muted">Agents CLI está en preview; para agentes A2A desplegados en Agent Runtime todavía no soporta el registro.</span>
                </div>
              ),
            },
          ]}
        />
      </Section>

      <Section n={3} title="A2A: agentes de distintos equipos que colaboran">
        <p>
          Andi no reprograma entregas: eso lo hace el equipo de logística con su propio agente, en su proyecto, con sus credenciales. El{' '}
          <Term tip="Agent-to-Agent: protocolo abierto (JSON-RPC sobre HTTP) para que agentes se descubran por Agent Card y se deleguen tareas con estados.">protocolo A2A</Term>{' '}
          permite que colaboren sin compartir código ni bases de datos. Dos piezas en ADK: <code>to_a2a()</code> para <strong>exponer</strong> tu agente y{' '}
          <code>RemoteA2aAgent</code> para <strong>consumir</strong> otro como si fuera un sub-agente.
        </p>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Code code={A2A_EXPOSE} lang="python" title="Exponer · examples/andes_prod/a2a_server.py" highlight={linesOf(A2A_EXPOSE, 'to_a2a(', 'AgentCard(')} maxHeight={420} />
          <Code code={A2A_CONSUME} lang="python" title="Consumir · examples/andes_prod/logistics_remote.py" highlight={linesOf(A2A_CONSUME, 'RemoteA2aAgent(', 'agent_card=', 'sub_agents=[')} maxHeight={420} />
        </div>
        <CardLab />
        <A2ALab />
        <Callout tone="info" title="Lo que no viaja por A2A">
          El agente remoto no ve tu sesión ni tu Memory Bank: recibe el mensaje y devuelve una Task. Si necesita contexto (número de pedido, tracking), tu
          coordinador debe ponerlo en el mensaje. Con <code>use_legacy=False</code> y ADK en ambos lados, la extensión ADK comparte más estado.
        </Callout>
      </Section>

      <Section n={4} title="Dos rutas para publicar: Agent Runtime o A2A">
        <p>
          Gemini Enterprise también registra agentes A2A alojados en cualquier parte (Cloud Run, GKE, otra nube): eliges <strong>Custom agent via A2A</strong>, pegas
          el JSON de la Agent Card y, si el agente actúa por el usuario o exige <code>Authorization</code>, configuras OAuth. Las diferencias importan para la
          seguridad.
        </p>
        <Tabs
          numbered
          tabs={[
            {
              id: 'rt',
              label: 'Custom agent via Agent Runtime',
              content: (
                <div className="cmp">
                  <div className="cmp-row">
                    <span className="k">Qué pegas</span>
                    <span>La ruta <code>reasoningEngines/ID</code>.</span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Gateway y Model Armor</span>
                    <span>Tráfico por Agent Gateway administrado; Model Armor aplicado por política o por tu <code>ModelArmorPlugin</code>.</span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Identidad</span>
                    <span>Agent Identity del runtime; OAuth opcional para actuar por el usuario.</span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Cuándo</span>
                    <span>Tu agente ADK, desplegado en Google. Es la ruta de este tutorial.</span>
                  </div>
                </div>
              ),
            },
            {
              id: 'a2a',
              label: 'Custom agent via A2A',
              content: (
                <div className="cmp">
                  <div className="cmp-row">
                    <span className="k">Qué pegas</span>
                    <span>El JSON de la Agent Card (A2A v0.3 streaming; con SDK 1.x usa <code>a2a.compat.v0_3</code>).</span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Gateway y Model Armor</span>
                    <span>
                      <strong>No pasa por Agent Gateway</strong> y Model Armor <strong>no se aplica automáticamente</strong>: tu código debe llamarlo.
                    </span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Identidad</span>
                    <span>
                      Cloud Run con <code>.run.app</code> autenticado: <code>roles/run.invoker</code> al service agent{' '}
                      <code className="ge-break">service-PROJECT_NUMBER@gcp-sa-discoveryengine.iam.gserviceaccount.com</code>. Se ignoran <code>securitySchemes</code>; sin API keys ni headers
                      estáticos.
                    </span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Cuándo</span>
                    <span>Agentes de otros frameworks, otras nubes o proveedores; agentes que ya exponen A2A.</span>
                  </div>
                </div>
              ),
            },
            {
              id: 'mk',
              label: 'Agents via Marketplace',
              content: (
                <div className="cmp">
                  <div className="cmp-row">
                    <span className="k">Qué pegas</span>
                    <span>Nada: eliges un agente de partner publicado en Google Cloud Marketplace.</span>
                  </div>
                  <div className="cmp-row">
                    <span className="k">Cuándo</span>
                    <span>Integraciones de terceros listas (CRM, ITSM…). También puedes catalogar servidores MCP y agentes aprobados en Agent Registry para que el gateway solo deje pasar lo registrado.</span>
                  </div>
                </div>
              ),
            },
          ]}
        />
        <div className="row small" style={{ marginTop: 10, gap: 16 }}>
          <Pill tone="user" mono>
            proyecto: {PROJECT_ID}
          </Pill>
          <DocLink href="https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-marketplace-agents">Agentes desde Marketplace</DocLink>
          <DocLink href="https://docs.cloud.google.com/agent-registry/overview">Agent Registry</DocLink>
        </div>
      </Section>

      <Section n={5} title="Lo que agregamos a la arquitectura">
        <p>
          Con Gemini Enterprise al frente y el agente de logística conectado por A2A, la arquitectura está completa. En la última lección la recorres de
          punta a punta con el código del repositorio.
        </p>
        <ArchDiagram stage={8} />
        <Panel title="Resumen de la ruta" tone="user">
          <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 14 }}>
            <li>
              <code>adk deploy agent_engine</code> → <code>reasoningEngines/ID</code>
            </li>
            <li>Gemini Enterprise → app → Agents → Add agent → Custom agent via Agent Runtime → ruta → Create</li>
            <li>Camila ve «{AGENT_DISPLAY}» en la galería y le habla con su identidad</li>
            <li>Otros equipos exponen sus agentes por A2A; Andi los usa como sub-agentes con RemoteA2aAgent</li>
          </ol>
        </Panel>
      </Section>

      <KeyIdeas
        items={[
          <>
            <strong>Gemini Enterprise</strong> es la app de los empleados; registrar un agente ADK es dar la ruta <code>reasoningEngines/ID</code> y una buena
            descripción (el LLM la usa para decidir cuándo invocarlo).
          </>,
          <>
            Consola o REST (<code className="ge-break">v1alpha/…/assistants/default_assistant/agents</code> con <code className="ge-break">adkAgentDefinition.provisionedReasoningEngine</code>). Cuota: 1 registro
            por usuario y día en Standard.
          </>,
          <>
            A2A: <code className="ge-break">to_a2a(root_agent, agent_card=…)</code> expone tu agente con card en <code className="ge-break">/.well-known/agent-card.json</code>; <code className="ge-break">RemoteA2aAgent(agent_card=url)</code>{' '}
            consume otro como sub-agente.
          </>,
          <>
            Los agentes A2A registrados en Gemini Enterprise <strong>no</strong> pasan por Agent Gateway ni reciben Model Armor automático: protégelos en su propio
            código.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Gemini Enterprise · registrar agentes ADK alojados en Agent Runtime', href: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent' },
          { label: 'Gemini Enterprise · registrar agentes A2A', href: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-a2a-agent' },
          { label: 'Gemini Enterprise · agentes desde Marketplace', href: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-marketplace-agents' },
          { label: 'ADK · exponer un agente por A2A (to_a2a)', href: 'https://adk.dev/a2a/quickstart-exposing/' },
          { label: 'ADK · consumir un agente A2A (RemoteA2aAgent)', href: 'https://adk.dev/a2a/quickstart-consuming/' },
          { label: 'Agent Registry · overview', href: 'https://docs.cloud.google.com/agent-registry/overview' },
        ]}
      />
    </>
  )
}
