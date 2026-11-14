import { useMemo, useState } from 'react'
import { Bot, Brain, Cloud, Cog, User, Wrench } from 'lucide-react'
import { Callout, KeyIdeas, Lab, Panel, Pill, Section, Segmented, Sources, Term } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { ChatBubbles, EventList, StateView } from '../../components/Events'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { Narration, PlayerBar } from '../../components/Player'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { ArchDiagram } from '../../components/Arch'
import { usePlayer } from '../../lib/hooks'
import { FIRST_RUN_EVENTS, TOOLS } from '../../sim/scenario'
import { AGENT_CODE, ANATOMY, FUNC_CODE, MAPPING, RUNNER_CODE, RUN_STEPS, TERM_RUN, buildRun } from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Anatomía del Agent                                                */
/* ------------------------------------------------------------------------ */
function AnatomyLab() {
  const [sel, setSel] = useState(ANATOMY[0].id)
  const part = ANATOMY.find((p) => p.id === sel)!
  const hl = useMemo(() => linesOf(AGENT_CODE, ...part.needles), [part])
  return (
    <Lab title="Anatomía de un Agent" hint="Haz clic en cada parte">
      <div className="pa-anatomy">
        <Code code={AGENT_CODE} lang="python" title="examples/andes_hello/agent.py" highlight={hl} dim maxHeight={520} />
        <div className="pa-parts">
          {ANATOMY.map((p) => (
            <button key={p.id} className={`pa-part${p.id === sel ? ' is-active' : ''}`} data-tone={p.tone} onClick={() => setSel(p.id)}>
              <span className="k">{p.label}</span>
              <span className="d">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Función → FunctionDeclaration                                     */
/* ------------------------------------------------------------------------ */
function DeclarationLab() {
  const [sel, setSel] = useState(MAPPING[1].id)
  const row = MAPPING.find((m) => m.id === sel)!
  const json = useMemo(() => JSON.stringify(TOOLS[0], null, 2), [])
  return (
    <Lab title="Lo que Gemini ve: de tu función a la FunctionDeclaration" hint="Elige una fila para ver el mapeo">
      <div className="row" style={{ marginBottom: 10, gap: 6 }}>
        {MAPPING.map((m) => (
          <button key={m.id} className={`btn btn-sm${m.id === sel ? ' btn-primary' : ''}`} onClick={() => setSel(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid-2">
        <Code code={FUNC_CODE} lang="python" title="tu función Python" highlight={linesOf(FUNC_CODE, ...row.pyNeedles)} dim />
        <Code code={json} lang="json" title="FunctionDeclaration enviada a Gemini (tools[])" highlight={row.jsonNeedles.length ? linesOf(json, ...row.jsonNeedles) : []} dim={row.jsonNeedles.length > 0} />
      </div>
      <div className="callout anim-fade" data-tone="tool" key={sel} style={{ marginBottom: 0, maxWidth: 'none' }}>
        <span />
        <div className="callout-body">{row.note}</div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · adk web simulado + diagrama                                       */
/* ------------------------------------------------------------------------ */
const NODES: FlowNode[] = [
  { id: 'user', x: 80, y: 150, w: 110, label: 'Camila', sub: 'adk web', tone: 'user', icon: User },
  { id: 'runner', x: 260, y: 150, w: 130, h: 62, label: 'Runner', sub: 'bucle de eventos', tone: 'system', icon: Cog },
  { id: 'session', x: 260, y: 290, w: 150, label: 'SessionService', sub: 'historial + state', tone: 'data', icon: Cloud },
  { id: 'agent', x: 470, y: 150, w: 150, h: 66, label: 'andes_ops', sub: 'LlmAgent', tone: 'model', icon: Bot },
  { id: 'gemini', x: 470, y: 36, w: 150, h: 52, label: 'Gemini', sub: 'gemini-3.8-flash', tone: 'model', icon: Brain },
  { id: 'tool', x: 690, y: 150, w: 160, h: 62, label: 'get_order_status', sub: 'función Python', tone: 'tool', icon: Wrench },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'runner' },
  { from: 'runner', to: 'session' },
  { from: 'runner', to: 'agent' },
  { from: 'agent', to: 'gemini' },
  { from: 'agent', to: 'tool' },
]

function WebLab() {
  const player = usePlayer(RUN_STEPS.length, { interval: 3600 })
  const s = RUN_STEPS[player.step]
  const [tab, setTab] = useState<'events' | 'state'>('events')
  return (
    <Lab title="Una invocación por dentro: adk web, eventos y estado" hint="Reproduce; cambia entre Events y State" footer={<span className="small muted">La interfaz de adk web está simplificada (chat + pestañas). Los eventos, roles, partes y el state_delta tienen la forma real que ADK produce.</span>}>
      <PlayerBar player={player} labels={RUN_STEPS.map((x) => x.title)} />
      <div className="pa-run-grid">
        <div className="pa-web">
          <div className="pa-web-top">
            <span className="brand">ADK Dev UI</span>
            <span className="muted">localhost:8000</span>
            <span className="pa-web-sel" style={{ marginLeft: 'auto' }}>andes_hello ▾</span>
          </div>
          <div className="pa-web-body">
            <div className="pa-web-chat">
              <ChatBubbles items={s.chat.map((c) => ({ ...c, name: c.role === 'agent' ? 'andes_ops' : undefined }))} typing={s.typing} />
              <div className="pa-web-input">
                <span>Escribe un mensaje…</span>
                <span>↵</span>
              </div>
            </div>
            <div className="pa-web-side">
              <div className="pa-web-tabs">
                <button className={tab === 'events' ? 'is-active' : ''} onClick={() => setTab('events')}>
                  Events ({s.events})
                </button>
                <button className={tab === 'state' ? 'is-active' : ''} onClick={() => setTab('state')}>
                  State
                </button>
                <button disabled style={{ opacity: 0.5 }}>
                  Trace
                </button>
              </div>
              {tab === 'events' ? (
                <EventList events={FIRST_RUN_EVENTS} upTo={s.events} highlight={s.events - 1} showTiming showUsage maxHeight={360} />
              ) : (
                <StateView state={s.state} changed={s.changed} />
              )}
            </div>
          </div>
        </div>
        <div className="stack">
          <FlowDiagram nodes={NODES} edges={EDGES} width={800} height={340} flows={s.flows} ariaLabel="Runner, agente, Gemini, herramienta y SessionService durante una invocación" />
          <Narration steps={RUN_STEPS} step={player.step} />
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Caso de error                                                     */
/* ------------------------------------------------------------------------ */
function ErrorLab() {
  const [orderId, setOrderId] = useState('9999')
  const run = useMemo(() => buildRun(orderId), [orderId])
  const resp = (run.events[2].content.parts[0] as { function_response: { response: Record<string, unknown> } }).function_response.response
  const isErr = resp.status === 'error'
  return (
    <Lab title="Cuando la herramienta falla: status error, no excepción" hint="Cambia el número de pedido">
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="label">pedido</span>
        <Segmented
          options={[
            { value: '4821', label: '4821 · en ruta' },
            { value: '5102', label: '5102 · preparando' },
            { value: '4790', label: '4790 · entregado' },
            { value: '9999', label: '9999 · no existe' },
          ]}
          value={orderId}
          onChange={setOrderId}
        />
        <Pill tone={isErr ? 'error' : 'ok'} mono>
          status: {String(resp.status)}
        </Pill>
      </div>
      <div className="pa-err-grid">
        <EventList events={run.events} highlight={2} />
        <div className="stack">
          <Panel title="Lo que ve Camila" tone="user">
            <ChatBubbles items={[{ role: 'user', text: `¿Dónde está mi pedido ${orderId}?` }, { role: 'agent', text: run.answer, name: 'andes_ops' }]} />
          </Panel>
          <Panel title="Por qué funciona así" tone="tool" bodyStyle={{ fontSize: 13.5, color: 'var(--text-2)' }}>
            {isErr ? (
              <>
                La función devolvió <code>{'{"status": "error", "error_message": "…"}'}</code> en lugar de lanzar una excepción. El modelo lee el mensaje como
                cualquier otro resultado y lo traduce en una respuesta útil. Si hubieras lanzado <code>ValueError</code>, ADK habría interrumpido la invocación
                (y, en ADK 2.x, un <code>except Exception</code> amplio dentro de la tool desactiva los reintentos automáticos).
              </>
            ) : (
              <>
                Con <code>status: "success"</code> el modelo usa los campos del dict para redactar. Observa que la herramienta también escribió{' '}
                <code>last_order_id</code> en el estado: en el turno siguiente, "¿y cuándo llega?" ya tiene contexto.
              </>
            )}
          </Panel>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Runner en código + terminal                                       */
/* ------------------------------------------------------------------------ */
function RunnerLab() {
  const player = usePlayer(RUN_STEPS.length, { interval: 3000 })
  const s = RUN_STEPS[player.step]
  const hl = useMemo(() => (s.codeNeedles ? linesOf(RUNNER_CODE, ...s.codeNeedles) : []), [s])
  return (
    <Lab title="El mismo bucle, en Python" hint="Reproduce: cada paso resalta su línea">
      <PlayerBar player={player} labels={RUN_STEPS.map((x) => x.title)} />
      <div className="split" style={{ marginTop: 12 }}>
        <Code code={RUNNER_CODE} lang="python" title="examples/scripts/run_local.py (recortado)" highlight={hl} dim maxHeight={440} />
        <Narration steps={RUN_STEPS} step={player.step} />
      </div>
    </Lab>
  )
}

function TerminalLab() {
  const player = useTerminalPlayer(TERM_RUN)
  return (
    <Lab title="Tres formas de correrlo" hint="Pulsa ▶">
      <Terminal lines={TERM_RUN} upTo={player.upTo} typed={player.typed} player={player} title="bash · examples/" maxHeight={380} />
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Un Agent, una función, una instrucción">
        <p>
          En ADK un agente es un objeto <code>Agent</code> (alias de <code>LlmAgent</code>) con cinco cosas: nombre, modelo, descripción, instrucción y
          herramientas. Las herramientas son <strong>funciones Python normales</strong>: ADK lee la firma y el docstring y arma por ti el esquema que
          Gemini necesita. Este es el agente completo de <code>examples/andes_hello</code>.
        </p>
        <AnatomyLab />
        <Callout tone="tip" title="El docstring es parte del prompt">
          Gemini decide si llama a <code>get_order_status</code> leyendo solo su nombre, su descripción y sus parámetros. Un docstring vago ("Obtiene un
          pedido") produce llamadas erradas; uno que dice <em>cuándo</em> usarla y qué devuelve, no.
        </Callout>
      </Section>

      <Section n={2} title="Lo que Gemini recibe">
        <p>
          Tú escribes Python; el modelo ve una <Term tip="Esquema JSON con name, description y parameters que la API de Gemini usa para decidir llamadas a funciones.">FunctionDeclaration</Term>.
          Entender el mapeo evita el error más común: parámetros que crees opcionales y son obligatorios, o descripciones que nunca llegan al modelo.
        </p>
        <DeclarationLab />
      </Section>

      <Section n={3} title="Una invocación por dentro">
        <p>
          Esto es lo que pasa entre que Camila pulsa Enter y recibe la respuesta: cuatro eventos, dos llamadas al modelo y una ejecución de tu función.{' '}
          <code>adk web</code> te lo muestra en las pestañas <strong>Events</strong> y <strong>State</strong>; aquí lo verás sincronizado con el diagrama del
          Runner.
        </p>
        <WebLab />
        <Callout tone="info" title="Roles y autores no son lo mismo">
          Cada evento tiene <code>author</code> (quién lo produjo: "user" o el nombre del agente) y <code>content.role</code> (cómo lo ve Gemini: "user" o
          "model"). Un <code>function_response</code> lo emite el agente pero lleva rol "user": es información que entra al modelo, no sale de él.
        </Callout>
      </Section>

      <Section n={4} title="Errores de negocio: devuelve, no lances">
        <p>
          Un pedido inexistente no es un bug: es un resultado. La convención de ADK es devolver un dict con <code>status</code> y, si falla,{' '}
          <code>error_message</code> en lenguaje claro. El modelo lo lee y decide qué decirle al usuario. Reserva las excepciones para fallos reales
          (la base de datos no responde).
        </p>
        <ErrorLab />
      </Section>

      <Section n={5} title="El Runner, en código">
        <p>
          <code>adk web</code> y <code>adk run</code> son envoltorios de lo mismo: un <code>Runner</code> con tu agente y un <code>SessionService</code>, y un
          bucle <code>async for event in runner.run_async(...)</code>. Vale la pena escribirlo una vez a mano para entender qué devuelve cada iteración.
        </p>
        <RunnerLab />
        <TerminalLab />
        <Callout tone="warn" title="Dos errores de la primera hora">
          <p>
            <strong>Correr <code>adk web</code> dentro de la carpeta del agente.</strong> Se corre desde la carpeta padre (<code>examples/</code>): ADK busca{' '}
            <code>&lt;carpeta&gt;/agent.py</code> con un <code>root_agent</code> y un <code>__init__.py</code> que lo importe.
          </p>
          <p>
            <strong>Olvidar el <code>.env</code>.</strong> Sin <code>GOOGLE_API_KEY</code> o la tríada <code>GOOGLE_GENAI_USE_VERTEXAI / GOOGLE_CLOUD_PROJECT /
            GOOGLE_CLOUD_LOCATION</code> la primera llamada al modelo falla con un error de credenciales.
          </p>
        </Callout>
      </Section>

      <Section n={6} title="Lo que agregamos a la arquitectura">
        <p>
          Primera etapa: un usuario, un agente ADK y Gemini. Todo corre en tu máquina con <code>adk web</code>. En las lecciones siguientes el agente
          gana herramientas con datos reales, sub-agentes, memoria, hosting administrado y gobierno.
        </p>
        <ArchDiagram stage={1} flows={['user>root', 'root>gemini']} />
      </Section>

      <KeyIdeas
        items={[
          <>
            <code>Agent(name, model, description, instruction, tools)</code>; las herramientas son funciones Python y ADK genera la FunctionDeclaration desde la firma y
            el docstring.
          </>,
          <>
            Una invocación con herramienta = cuatro eventos y dos llamadas al modelo: user → function_call → function_response → texto final (
            <code>is_final_response()</code>).
          </>,
          <>
            Devuelve <code>{'{"status": "error", "error_message": …}'}</code> para errores de negocio; usa <code>tool_context.state</code> para dejar contexto al turno
            siguiente, que viaja en <code>actions.state_delta</code>.
          </>,
          <>
            <code>adk web</code> (desde la carpeta padre), <code>adk run</code> y tu propio <code>Runner</code> ejecutan exactamente el mismo bucle.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · Quickstart Python', href: 'https://adk.dev/get-started/python/' },
          { label: 'ADK · LlmAgent (name, model, instruction, tools, output_key)', href: 'https://adk.dev/agents/llm-agents/' },
          { label: 'ADK · Function tools (esquema, ToolContext, dict con status)', href: 'https://adk.dev/tools-custom/function-tools/' },
          { label: 'ADK · Sesiones y estado (Runner, prefijos, state_delta)', href: 'https://adk.dev/sessions/state/' },
          { label: 'ADK 2.0 · cambios de runtime (no capturar Exception en tools)', href: 'https://adk.dev/2.0/' },
        ]}
      />
    </>
  )
}
