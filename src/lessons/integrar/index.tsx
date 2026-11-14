import { useEffect, useState } from 'react'
import { Bot, Brain, Database, Globe, Loader2, MessageSquare, Radio, Ticket, Wrench } from 'lucide-react'
import { ArchDiagram } from '../../components/Arch'
import { Code, linesOf } from '../../components/Code'
import { ChatBubbles, StateView } from '../../components/Events'
import { FlowDiagram } from '../../components/Flow'
import { Narration, PlayerBar } from '../../components/Player'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { Callout, DocLink, KeyIdeas, Lab, Panel, Pill, Section, Segmented, Sources, Tabs, Term } from '../../components/ui'
import { usePlayer, useTypewriter } from '../../lib/hooks'
import { AGENT_DISPLAY, CUSTOMER, PROJECT_ID } from '../../sim/scenario'
import {
  CHAT_ANSWER,
  CHAT_EDGES,
  CHAT_NODES,
  CHAT_STEPS,
  CODE_BUTTON,
  CODE_CHAT_ENDPOINT,
  CODE_EVENT,
  CODE_LAMBDA,
  DOOR_EDGES,
  DOOR_NODES,
  DOORS,
  EVENT_LOG,
  GOVERNANCE,
  ORCH,
  PROC_EDGES,
  PROC_NODES,
  PROC_STEPS,
  SESSION_RULES,
  TICKET,
  TICKET_SUMMARY,
  WIF_LINES,
  type DoorId,
  type OrchId,
} from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Cuatro puertas, una misma casa                                    */
/* ------------------------------------------------------------------------ */
function DoorsLab() {
  const [id, setId] = useState<DoorId>('chat')
  const d = DOORS.find((x) => x.id === id)!
  return (
    <Lab title="Cuatro puertas para el mismo agente" hint="Elige por dónde entra la petición">
      <Segmented options={DOORS.map((x) => ({ value: x.id, label: x.label }))} value={id} onChange={setId} />
      <div className="int-door-grid">
        <FlowDiagram nodes={DOOR_NODES} edges={DOOR_EDGES} width={900} height={300} flows={d.flows} active={d.active} dimInactive ariaLabel={`Ruta de la petición cuando entra por ${d.label}`} />
        <div className="int-facts anim-fade" key={id}>
          <div className="int-fact">
            <span className="k">Quién la usa</span>
            {d.who}
          </div>
          <div className="int-fact">
            <span className="k">Quién autentica ante Google</span>
            {d.auth}
          </div>
          <div className="int-fact">
            <span className="k">Quién dice quién es el usuario (user_id)</span>
            {d.userId}
          </div>
          <div className="int-fact">
            <span className="k">Sesión</span>
            {d.session}
          </div>
          <div className="int-fact">
            <span className="k">Cómo vuelve la respuesta</span>
            {d.answer}
          </div>
          <div className="int-fact">
            <span className="k">Código</span>
            <code className="int-break">{d.file}</code>
          </div>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · El chat, paso a paso                                              */
/* ------------------------------------------------------------------------ */
function ChatFlowLab() {
  const player = usePlayer(CHAT_STEPS.length, { interval: 5200 })
  const s = CHAT_STEPS[player.step]
  return (
    <Lab title="Un mensaje del widget hasta Agent Runtime y de vuelta" hint="Reproduce o haz clic en un paso">
      <PlayerBar player={player} labels={CHAT_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={CHAT_NODES} edges={CHAT_EDGES} width={980} height={300} flows={s.flows} active={s.active} dimInactive ariaLabel="Flujo de un mensaje del portal en AWS hasta el agente en Agent Runtime" />
      <div className="int-chat">
        <Narration steps={CHAT_STEPS} step={player.step} />
        <div className="anim-fade" key={player.step}>
          <Code code={s.code} lang={s.lang} title={s.codeTitle} maxHeight={300} lineNumbers={s.lang === 'python' || s.lang === 'js'} />
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Portal simulado: chat, botón, evento                              */
/* ------------------------------------------------------------------------ */
type Mode = 'chat' | 'button' | 'event'

function PortalChat() {
  const [phase, setPhase] = useState(0) // 0 idle · 1 enviado · 2 tool · 3 respondiendo
  const tw = useTypewriter(CHAT_ANSWER, phase >= 3, { cps: 70 })
  useEffect(() => {
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 700)
      return () => clearTimeout(t)
    }
    if (phase === 2) {
      const t = setTimeout(() => setPhase(3), 900)
      return () => clearTimeout(t)
    }
  }, [phase])
  const items: { role: 'user' | 'agent'; text: string; name?: string }[] = []
  if (phase >= 1) items.push({ role: 'user', text: '¿Dónde está mi pedido 4821?' })
  if (phase >= 3) items.push({ role: 'agent', name: AGENT_DISPLAY, text: tw.shown })
  return (
    <>
      <div className="int-portal-main">
        <div className="label">Chat con {AGENT_DISPLAY}</div>
        {phase === 0 && <p className="muted small">Escribe abajo o pulsa Enviar. El widget habla solo con tu backend.</p>}
        <ChatBubbles items={items} typing={phase === 1 || phase === 2} />
        {phase === 2 && (
          <span className="int-tool-chip">
            <Wrench size={12} /> get_order(4821)
          </span>
        )}
        {phase >= 3 && (
          <span className="muted small">
            session_id guardado en el widget → el siguiente turno conserva el historial
          </span>
        )}
      </div>
      <div className="int-portal-foot">
        <input className="input" value="¿Dónde está mi pedido 4821?" readOnly aria-label="Mensaje" />
        <button className="btn btn-primary btn-sm" onClick={() => setPhase(1)} disabled={phase > 0 && !tw.done}>
          Enviar
        </button>
        {phase > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setPhase(0)}>
            Limpiar
          </button>
        )}
      </div>
    </>
  )
}

function PortalButton() {
  const [phase, setPhase] = useState(0) // 0 idle · 1 consultando · 2 resumen
  const tw = useTypewriter(TICKET_SUMMARY, phase === 2, { cps: 90 })
  useEffect(() => {
    if (phase !== 1) return
    const t = setTimeout(() => setPhase(2), 1400)
    return () => clearTimeout(t)
  }, [phase])
  return (
    <>
      <div className="int-portal-main">
        <div className="label">Ticket {TICKET.id}</div>
        <div className="int-ticket">
          <div className="h">
            <Ticket size={14} /> {TICKET.from} · pedido {TICKET.order}
            <Pill tone="guard">abierto</Pill>
          </div>
          <div>{TICKET.text}</div>
        </div>
        {phase === 1 && (
          <span className="int-spinner">
            <Loader2 size={14} className="int-spin" /> Consultando a {AGENT_DISPLAY} (sesión nueva, sin historial)…
          </span>
        )}
        {phase === 2 && (
          <div className="int-summary anim-fade">
            <strong>Resumen de Andi: </strong>
            {tw.shown}
            {!tw.done && <span className="caret" />}
          </div>
        )}
      </div>
      <div className="int-portal-foot">
        <button className="btn btn-primary btn-sm" onClick={() => setPhase(1)} disabled={phase === 1}>
          <Bot size={14} /> Resumir con Andi
        </button>
        <button className="btn btn-sm">Responder</button>
        <button className="btn btn-sm">Cerrar ticket</button>
        {phase === 2 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setPhase(0)}>
            Limpiar
          </button>
        )}
      </div>
    </>
  )
}

function PortalEvents() {
  const [n, setN] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    if (n >= EVENT_LOG.length) {
      setRunning(false)
      return
    }
    const t = setTimeout(() => setN((x) => x + 1), 900)
    return () => clearTimeout(t)
  }, [running, n])
  return (
    <>
      <div className="int-portal-main">
        <div className="label">Eventos de logística (panel interno)</div>
        {n === 0 && <p className="muted small">Nadie escribe. Simula que AndesExpress reporta un retraso del envío AX-88213-CL.</p>}
        <div className="int-log">
          {EVENT_LOG.slice(0, n).map((l, i) => (
            <div key={i} className="int-log-line anim-in" data-tone={l.tone === 'ok' ? 'ok' : l.tone}>
              {l.t}
            </div>
          ))}
        </div>
      </div>
      <div className="int-portal-foot">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setN(0)
            setRunning(true)
          }}
          disabled={running}
        >
          <Radio size={14} /> Simular retraso de AX-88213-CL
        </button>
        {n > 0 && !running && (
          <button className="btn btn-ghost btn-sm" onClick={() => setN(0)}>
            Limpiar
          </button>
        )}
      </div>
    </>
  )
}

function PortalLab() {
  const [mode, setMode] = useState<Mode>('chat')
  return (
    <Lab title="El portal de soporte de Andes Market (en AWS) usando a Andi de tres formas" hint="Cambia de pantalla y pulsa los botones">
      <div className="int-portal">
        <div className="int-portal-bar">
          <Globe size={13} />
          <span className="url">https://soporte.andesmarket.cl/{mode === 'chat' ? 'chat' : mode === 'button' ? `tickets/${TICKET.id}` : 'ops/eventos'}</span>
          <span>
            {mode === 'event' ? 'ops@andesmarket.cl' : CUSTOMER.email}
          </span>
        </div>
        <div className="int-portal-body">
          <div className="int-portal-side">
            <div className="brand">Andes Market · Soporte</div>
            <button className={mode === 'chat' ? 'is-active' : ''} onClick={() => setMode('chat')}>
              <MessageSquare size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Chat con Andi
            </button>
            <button className={mode === 'button' ? 'is-active' : ''} onClick={() => setMode('button')}>
              <Ticket size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Tickets
            </button>
            <button className={mode === 'event' ? 'is-active' : ''} onClick={() => setMode('event')}>
              <Radio size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Eventos (ops)
            </button>
          </div>
          <div className="stack" style={{ gap: 0 }}>
            {mode === 'chat' && <PortalChat />}
            {mode === 'button' && <PortalButton />}
            {mode === 'event' && <PortalEvents />}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }} className="anim-fade" key={mode}>
        {mode === 'chat' && <Code code={CODE_CHAT_ENDPOINT} lang="python" title="examples/andes_portal/backend.py · /chat" highlight={linesOf(CODE_CHAT_ENDPOINT, 'body.session_id or', 'event: session', 'StreamingResponse')} maxHeight={360} />}
        {mode === 'button' && <Code code={CODE_BUTTON} lang="python" title="examples/andes_portal/backend.py · /tickets/{id}/summary" highlight={linesOf(CODE_BUTTON, 'session_id = await new_session', 'final = part["text"]', 'await ask_once(user, prompt)')} maxHeight={360} />}
        {mode === 'event' && (
          <Tabs
            tabs={[
              { id: 'fastapi', label: 'Webhook (FastAPI)', content: <Code code={CODE_EVENT} lang="python" title="examples/andes_portal/backend.py · /events/shipment-delayed" highlight={linesOf(CODE_EVENT, 'x_webhook_secret !=', 'system:logistics', 'ask_once(system')} maxHeight={360} /> },
              { id: 'lambda', label: 'Lambda + REST (sin SDK)', content: <Code code={CODE_LAMBDA} lang="python" title="examples/andes_portal/lambda_handler.py" highlight={linesOf(CODE_LAMBDA, 'google.auth.default', 'class_method', 'iter_lines')} maxHeight={360} /> },
            ]}
          />
        )}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Terminal WIF                                                      */
/* ------------------------------------------------------------------------ */
function WifLab() {
  const player = useTerminalPlayer(WIF_LINES, { cps: 60 })
  return (
    <Lab title="Credenciales desde AWS sin llaves: Workload Identity Federation" hint="Pulsa ▶">
      <Terminal lines={WIF_LINES} upTo={player.upTo} typed={player.typed} player={player} title="bash · examples/" maxHeight={460} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Cuatro formas de orquestar                                        */
/* ------------------------------------------------------------------------ */
function OrchLab() {
  const [id, setId] = useState<OrchId>('agent')
  const o = ORCH.find((x) => x.id === id)!
  return (
    <Lab title="¿Quién manda? Cuatro formas de orquestar" hint="Elige un patrón">
      <Segmented options={ORCH.map((x) => ({ value: x.id, label: x.label }))} value={id} onChange={setId} />
      <div className="anim-fade" key={id} style={{ marginTop: 12 }}>
        <FlowDiagram nodes={o.nodes} edges={o.edges} width={900} height={o.height} flows={o.flows} ariaLabel={`Patrón de orquestación: ${o.label}`} />
        <p style={{ marginTop: 10 }}>{o.summary}</p>
        <div className="int-orch">
          <Panel title="Cuándo" tone="user">
            <span style={{ fontSize: 13.5, color: 'var(--text-2)' }}>{o.when}</span>
          </Panel>
          <div className="stack" style={{ gap: 10 }}>
            <Panel title="A favor" tone="ok">
              <ul>
                {o.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Panel>
            <Panel title="Cuidado" tone="guard">
              <ul>
                {o.cons.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5b · Tu app orquesta, paso a paso                                     */
/* ------------------------------------------------------------------------ */
function RuntimePanel({ step }: { step: (typeof PROC_STEPS)[number] }) {
  const s = step.session
  return (
    <div className="int-runtime">
      <div className="int-rt-card" data-tone="data">
        <div className="h">
          <Database size={13} /> Sessions
          {s && (
            <span className="mono small" style={{ marginLeft: 'auto' }}>
              {s.id.slice(0, 6)}… · {s.events} evento{s.events === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {s ? (
          <>
            <StateView state={s.state} changed={s.changed ?? []} title="session.state" />
            {s.note && <div className="small muted" style={{ marginTop: 6 }}>{s.note}</div>}
          </>
        ) : (
          <div className="small muted">Sin sesión todavía para este proceso.</div>
        )}
      </div>
      <div className="int-rt-card" data-tone="memory">
        <div className="h">
          <Brain size={13} /> Memory Bank · {CUSTOMER.id}
        </div>
        <ul className="int-mem">
          {step.memories.map((m) => (
            <li key={m.text} className={m.fresh ? 'is-fresh anim-in' : ''}>
              {m.text}
              {m.fresh && <span className="tag">nuevo</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ProcessLab() {
  const player = usePlayer(PROC_STEPS.length, { interval: 6000 })
  const s = PROC_STEPS[player.step]
  return (
    <Lab title="Tu app orquesta: tres pasos, una sesión, Memory Bank aprendiendo" hint="Reproduce o haz clic en un paso">
      <PlayerBar player={player} labels={PROC_STEPS.map((x) => x.title)} />
      <FlowDiagram nodes={PROC_NODES} edges={PROC_EDGES} width={900} height={340} flows={s.flows} active={s.active} dimInactive ariaLabel="Un proceso orquestado desde AWS que usa Agent Runtime, el gateway, Sessions y Memory Bank" />
      <div className="int-proc">
        <div className="stack">
          <Narration steps={PROC_STEPS} step={player.step} />
          <div className="anim-fade" key={`c${player.step}`}>
            <Code code={s.code} lang={s.lang} title={s.codeTitle} maxHeight={260} lineNumbers={false} />
          </div>
        </div>
        <div className="anim-fade" key={`r${player.step}`}>
          <RuntimePanel step={s} />
        </div>
      </div>
    </Lab>
  )
}

function SessionRules() {
  return (
    <Lab title="Reglas para sesiones cuando tu app orquesta" badge="Guía" hint="Lo que conviene documentar en tu equipo">
      <div className="int-rules">
        {SESSION_RULES.map((r, i) => (
          <div key={r.k} className="int-rule">
            <span className="n">{i + 1}</span>
            <div>
              <strong>{r.k}</strong>
              <p>{r.v}</p>
            </div>
          </div>
        ))}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 6 · ¿Qué sigue aplicando?                                             */
/* ------------------------------------------------------------------------ */
function GovernanceTable() {
  const [sel, setSel] = useState<number | null>(null)
  const mark = (a: 'yes' | 'no' | 'diff') => (a === 'yes' ? <span className="yes">sí, igual</span> : a === 'no' ? <span className="no">no participa</span> : <span className="diff">cambia</span>)
  const first = (t: string) => (t.includes('. ') ? t.slice(0, t.indexOf('. ') + 1) : t)
  return (
    <Lab title="Gemini Enterprise vs. tu app: qué cambia y qué no" hint="Haz clic en una fila para leer el detalle">
      <div className="table-wrap">
        <table className="tbl int-gov">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Desde Gemini Enterprise</th>
              <th>Desde tu app (AWS)</th>
              <th>¿Aplica?</th>
            </tr>
          </thead>
          <tbody>
            {GOVERNANCE.map((r, i) => (
              <tr key={r.piece} className={sel === i ? 'is-hl' : ''} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
                <td>{r.piece}</td>
                <td className="small">{sel === i ? r.ge : first(r.ge)}</td>
                <td className="small">{sel === i ? r.app : first(r.app)}</td>
                <td>{mark(r.applies)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Gemini Enterprise es una puerta, no la casa">
        <p>
          En la lección anterior Camila usaba a Andi desde Gemini Enterprise. Pero Camila es <em>clienta</em>, y los clientes de Andes Market entran por{' '}
          <strong>soporte.andesmarket.cl</strong>, un portal que el equipo web mantiene en AWS. ¿Cómo le ponen un chat con Andi, un botón que resume
          tickets, o una automatización que reacciona a eventos del transportista?
        </p>
        <p>
          La respuesta corta: <strong>igual que lo hizo Gemini Enterprise</strong>. El agente vive en Agent Runtime (antes Agent Engine) y expone{' '}
          <code>:streamQuery</code>. Gemini Enterprise, tu backend, una Lambda o un script son <em>clientes</em> de esa misma API. Lo que cambia entre una
          puerta y otra es quién autentica ante Google y quién decide quién es el usuario; lo que no cambia es todo lo que hay detrás.
        </p>
        <DoorsLab />
        <Callout tone="info" title="¿Y la API de Gemini Enterprise (StreamAssist)?">
          Existe una API para hablar con el asistente de Gemini Enterprise desde fuera (<code>assistants/default_assistant:streamAssist</code>), pero la
          documentación de noviembre de 2026 dice que <strong>no invoca agentes ADK ni A2A</strong> registrados en la app: solo el asistente base, Deep
          Research y agentes de Workflow Builder. Para un agente como Andi, el camino es Agent Runtime directo.
        </Callout>
      </Section>

      <Section n={2} title="Un chat en tu portal: el backend en el medio">
        <p>
          Nunca llames a Google desde el navegador. El widget habla con <strong>tu backend</strong>, y el backend hace tres cosas: valida la sesión del
          portal para fijar el <code>user_id</code>, obtiene credenciales de Google sin llaves, y traduce los eventos SSE de Agent Runtime a un contrato
          simple para tu frontend. Es exactamente el <code>query_remote.py</code> de la lección de despliegue, envuelto en un endpoint.
        </p>
        <ChatFlowLab />
        <Callout tone="danger" title="El user_id lo pone tu backend, nunca el cliente">
          El guardrail <code>only_own_orders</code> compara <code>user:customer_id</code> del estado de la sesión con el pedido consultado. Si tu endpoint
          acepta un <code>user_id</code> en el cuerpo del request, cualquiera puede leer pedidos ajenos cambiando un campo. Fíjalo desde la sesión
          autenticada y crea la sesión del agente con <code>state=&#123;"user:customer_id": …&#125;</code>.
        </Callout>
      </Section>

      <Section n={3} title="No solo chat: botón y evento">
        <p>
          Un agente no obliga a conversar. Tres integraciones con el mismo <code>andes_ops</code>, cambiando solo cómo creas la sesión y qué haces con
          los eventos:
        </p>
        <ul>
          <li>
            <strong>Chat</strong>: sesión persistente, streaming, historial y memoria por cliente.
          </li>
          <li>
            <strong>Botón</strong> («Resumir con Andi»): sesión nueva por clic, esperas el último texto y devuelves JSON. Sin streaming ni historial.
          </li>
          <li>
            <strong>Evento</strong> (webhook, EventBridge, cron): nadie al frente; principal de sistema con rol <code>staff</code>, resultado hacia tu
            plataforma. También funciona sin SDK, con <code>google-auth</code> y la REST API.
          </li>
        </ul>
        <PortalLab />
        <Callout tone="tip" title="Un solo helper para botón y evento">
          <code>ask_once(user, message)</code> crea la sesión, consume el stream y se queda con el último texto del agente. Es el bloque que reutilizas en
          cualquier integración «pregunta y respuesta»: resúmenes, clasificación, redacción. Si dos llamadas deben compartir contexto, reenvía el mismo{' '}
          <code>session_id</code> en vez de crear otra sesión.
        </Callout>
      </Section>

      <Section n={4} title="Credenciales desde otra nube, sin llaves">
        <p>
          El backend en AWS necesita un token de Google.{' '}
          <Term tip="Workload Identity Federation: IAM acepta credenciales de otro proveedor (AWS, Azure, OIDC) y las cambia por tokens de Google de corta vida, sin service account keys.">
            Workload Identity Federation
          </Term>{' '}
          evita la llave JSON de service account: creas un pool con un proveedor AWS, concedes <code>roles/aiplatform.user</code> al principal federado
          (acceso directo, sin impersonar) y generas un archivo de configuración que las librerías de Google leen desde{' '}
          <code>GOOGLE_APPLICATION_CREDENTIALS</code>. El archivo no contiene secretos.
        </p>
        <WifLab />
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Callout tone="warn" title="Dos principales, dos roles distintos">
            <strong>Quien llama</strong> (tu backend, principal federado) recibe <code>roles/aiplatform.user</code> para invocar el runtime.{' '}
            <strong>El agente</strong> actúa con su Agent Identity (<code>principal://…</code>) y los roles mínimos sobre Cloud SQL, Secret Manager, etc.
            La documentación es explícita: nunca <code>roles/aiplatform.user</code> al agente.
          </Callout>
          <Callout tone="info" title="EC2, Lambda, ECS">
            La guía oficial de WIF describe EC2 (metadata IMDSv2). En Lambda y ECS, <code>google-auth</code> toma las credenciales temporales del rol desde
            las variables <code>AWS_*</code> del entorno. Pruébalo en tu cuenta antes de dar por hecho el camino.
          </Callout>
        </div>
      </Section>

      <Section n={5} title="Orquestar: ¿quién manda?">
        <p>
          «Integrar» también es decidir dónde vive la lógica del proceso. Cuatro patrones, de más a menos delegación en el agente. No son excluyentes: un
          portal suele tener chat (el agente orquesta) y automatizaciones (tu app orquesta o eventos).
        </p>
        <OrchLab />
        <h3>Cuando tu app orquesta: la sesión es el hilo del proceso</h3>
        <p>
          La pregunta que surge enseguida: ¿reutilizo la sesión entre pasos? Sí, y es lo normal, con un alcance claro: <strong>una sesión por instancia
          del proceso</strong> (el ticket T-3310), que comparten los pasos que se necesitan entre sí, y sesiones nuevas para los pasos independientes.
          El lab sigue al endpoint <code>/tickets/&#123;id&#125;/resolve</code> del backend: tres pasos, y mira a la derecha cómo cambian Sessions y
          Memory Bank en cada uno.
        </p>
        <ProcessLab />
        <SessionRules />
        <Callout tone="info" title="¿«La API del runner»? Casi: la API de Agent Runtime">
          En local, la clase <code>Runner</code> de ADK ejecuta tu agente dentro de tu proceso. Al desplegar, Agent Runtime envuelve tu agente con su
          propio runner y lo expone como API HTTP: <code>:query</code> y <code>:streamQuery</code>, donde <code>class_method</code> nombra el método a
          ejecutar (<code>async_create_session</code>, <code>async_stream_query</code>, <code>async_delete_session</code>…). Tu app habla con esa API; el
          runner, las sesiones, la memoria, el gateway y la identidad los opera Google.
        </Callout>
      </Section>

      <Section n={6} title="¿Y Agent Gateway, Model Armor, identidad…? Siguen ahí">
        <p>
          Aquí está la confusión habitual: la plataforma muestra tantas piezas que parece que «saltarse» Gemini Enterprise fuera saltarse la gobernanza.
          No. Agent Gateway, Model Armor, Agent Identity, Registry, Sessions, Memory Bank, plugins y trazas <strong>pertenecen al runtime y al código del
          agente</strong>, no a la app que lo llama. El gateway administrado de Agent Runtime gobierna el tráfico de entrada (autentica la credencial
          entrante e inspecciona el prompt) y el de salida (tools, MCP, A2A, APIs), venga la petición de Gemini Enterprise o de una Lambda en Virginia.
        </p>
        <GovernanceTable />
        <Callout tone="warn" title="Lo que sí te saca del paraguas: hospedar el agente fuera de Agent Runtime">
          Si en vez de desplegar en Agent Runtime corres el agente en Cloud Run, GKE o EKS, el gateway administrado no existe (self-managed «próximamente»
          en GKE/Cloud Run; cross-cloud en Limited Preview, nov-2026). Ahí dependes del <code>ModelArmorPlugin</code> y de tus guardrails. Lo mismo para
          agentes A2A registrados en Gemini Enterprise, como viste en la lección anterior. La regla: <em>la gobernanza sigue al agente, no al cliente</em>.
        </Callout>
        <div className="row small" style={{ marginTop: 10, gap: 16 }}>
          <Pill tone="user" mono>
            proyecto: {PROJECT_ID}
          </Pill>
          <DocLink href="https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview">Agent Gateway · overview</DocLink>
          <DocLink href="https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds">WIF con otras nubes</DocLink>
        </div>
      </Section>

      <Section n={7} title="Lo que agregamos a la arquitectura">
        <p>
          El portal de soporte entra por la misma puerta que Gemini Enterprise: Model Armor y el gateway al frente, el agente y sus datos detrás. Desde
          fuera de Google solo cambió una caja.
        </p>
        <ArchDiagram stage={9} />
      </Section>

      <KeyIdeas
        items={[
          <>
            Gemini Enterprise es <strong>un cliente más</strong> de Agent Runtime. Tu app llama a <code>:streamQuery</code> (SDK o REST) igual que el{' '}
            <code>query_remote.py</code> de la lección de despliegue.
          </>,
          <>
            Chat = sesión persistente + streaming; botón = <code>ask_once</code> con sesión nueva; evento = principal de sistema sin nadie al frente. El{' '}
            <code>user_id</code> y <code>user:customer_id</code> los fija <strong>tu backend</strong>, nunca el navegador.
          </>,
          <>
            Desde AWS: Workload Identity Federation (pool + proveedor AWS + <code>roles/aiplatform.user</code> al principal federado + archivo sin secretos
            en <code>GOOGLE_APPLICATION_CREDENTIALS</code>).
          </>,
          <>
            Cuatro formas de orquestar: el agente orquesta, tu app orquesta, A2A entre nubes, eventos en ambos sentidos. Un portal real combina varias.
          </>,
          <>
            Si tu app orquesta: <strong>una sesión por instancia del proceso</strong>, reutilizada por los pasos que se necesitan, sesión nueva para los
            independientes (y en paralelo). Lo durable va a tu base de datos y a Memory Bank, no a la sesión.
          </>,
          <>
            La gobernanza <strong>sigue al agente</strong>: gateway, Model Armor, identidad, registry, sesiones y trazas aplican igual desde cualquier
            cliente. Solo las pierdes si hospedas el agente fuera de Agent Runtime.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Usar un agente ADK desplegado (sesiones, async_stream_query, REST :streamQuery)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-adk-agent' },
          { label: 'REST · reasoningEngines.streamQuery', href: 'https://docs.cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.reasoningEngines/streamQuery' },
          { label: 'Workload Identity Federation con AWS y otras nubes', href: 'https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds' },
          { label: 'Agent Gateway · overview (entrada, salida, entornos)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview' },
          { label: 'Agent Identity (roles automáticos; no dar aiplatform.user al agente)', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity' },
          { label: 'Gemini Enterprise · invocar un agente con StreamAssist (tipos soportados)', href: 'https://docs.cloud.google.com/gemini/enterprise/docs/invoke-agent-streamassist' },
          { label: 'Arquitectura de referencia: agente ADK con frontend propio', href: 'https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run' },
        ]}
      />
    </>
  )
}
