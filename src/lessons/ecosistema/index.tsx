import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Bot, Brain, Cloud, Database, Eye, Layers, ShieldCheck, User, Wrench } from 'lucide-react'
import { Callout, DocLink, KeyIdeas, Lab, Pill, Section, Sources, Term } from '../../components/ui'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { Narration, PlayerBar, type StepInfo } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { COMPONENTS, PILLARS, RENAMES, componentsOf, type PlatformComponent } from '../../sim/platform'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Mapa de pilares                                                   */
/* ------------------------------------------------------------------------ */
function PillarMap() {
  const [sel, setSel] = useState<string>('adk')
  const c = COMPONENTS.find((x) => x.id === sel)!
  return (
    <Lab title="Mapa de la plataforma" hint="Haz clic en una pieza">
      <div className="eco-pillars">
        {PILLARS.map((p) => (
          <div key={p.id} className="eco-pillar" data-tone={p.tone}>
            <div className="eco-pillar-title">{p.title}</div>
            <div className="eco-pillar-blurb">{p.blurb}</div>
            {componentsOf(p.id).map((x) => (
              <button key={x.id} className={`eco-card${x.id === sel ? ' is-active' : ''}`} data-tone={x.tone} onClick={() => setSel(x.id)}>
                <span className="n">{x.name}</span>
                {x.formerly && <span className="f">antes: {x.formerly}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      <Detail c={c} />
    </Lab>
  )
}

function Detail({ c }: { c: PlatformComponent }) {
  return (
    <div className="eco-detail anim-fade" key={c.id} data-tone={c.tone}>
      <h4>
        {c.name}
        {c.formerly && (
          <Pill tone="system" mono>
            antes: {c.formerly}
          </Pill>
        )}
        {c.open && <Pill tone="ok">open source</Pill>}
      </h4>
      <p>
        <strong>{c.oneLiner}</strong>
      </p>
      <p>{c.detail}</p>
      <div className="row small" style={{ gap: 14 }}>
        <DocLink href={c.docs}>Documentación oficial</DocLink>
        {c.lesson && <Link to={`/leccion/${c.lesson}`}>Se trabaja en la lección «{c.lesson}» →</Link>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · El camino de una pregunta                                         */
/* ------------------------------------------------------------------------ */
const NODES: FlowNode[] = [
  { id: 'user', x: 70, y: 180, w: 110, label: 'Camila', sub: 'cliente', tone: 'user', icon: User },
  { id: 'ge', x: 220, y: 180, w: 140, h: 62, label: 'Gemini', sub: 'Enterprise (app)', tone: 'user', icon: Layers },
  { id: 'gw', x: 400, y: 180, w: 150, h: 62, label: 'Agent Gateway', sub: '+ Model Armor', tone: 'guard', icon: ShieldCheck },
  { id: 'rt', x: 600, y: 180, w: 170, h: 70, label: 'Agent Runtime', sub: 'andes_ops (ADK)', tone: 'model', icon: Bot },
  { id: 'gem', x: 600, y: 50, w: 150, label: 'Gemini', sub: 'modelo', tone: 'model', icon: Brain },
  { id: 'tb', x: 820, y: 110, w: 140, label: 'MCP Toolbox', sub: 'herramientas', tone: 'tool', icon: Wrench },
  { id: 'db', x: 820, y: 230, w: 140, label: 'Cloud SQL', sub: 'pedidos', tone: 'data', icon: Database },
  { id: 'mem', x: 600, y: 320, w: 150, label: 'Memory Bank', sub: 'memoria', tone: 'memory', icon: Cloud },
  { id: 'tr', x: 400, y: 320, w: 150, label: 'Cloud Trace', sub: 'observabilidad', tone: 'tool', icon: Eye },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'ge' },
  { from: 'ge', to: 'gw' },
  { from: 'gw', to: 'rt' },
  { from: 'rt', to: 'gem' },
  { from: 'rt', to: 'tb' },
  { from: 'tb', to: 'db' },
  { from: 'rt', to: 'mem' },
  { from: 'rt', to: 'tr', dashed: true },
]
const PATH: (StepInfo & { flows: string[]; active?: string[] })[] = [
  {
    title: 'Camila escribe en Gemini Enterprise',
    body: 'Gemini Enterprise (antes Agentspace) es la app donde los empleados chatean, buscan y eligen agentes registrados por un admin. Camila pregunta "¿dónde está mi pedido 4821?" y la app enruta la pregunta al agente Andi.',
    flows: ['user>ge'],
  },
  {
    title: 'Agent Gateway aplica políticas; Model Armor revisa el prompt',
    body: 'En Agent Runtime el gateway es administrado: comprueba que el agente esté en Agent Registry, aplica IAM y pasa el texto por Model Armor (prompt injection, jailbreak, datos sensibles). Por defecto todo está denegado hasta que una política lo permite.',
    flows: ['ge>gw'],
  },
  {
    title: 'Agent Runtime ejecuta el agente ADK',
    body: 'Agent Runtime (antes Vertex AI Agent Engine) es el hosting administrado: escala, identidad propia del agente, sesiones. Tu código ADK corre aquí tal como corría en tu laptop con adk web.',
    flows: ['gw>rt'],
  },
  {
    title: 'ADK consulta Memory Bank y llama a Gemini',
    body: 'Antes de llamar al modelo, el agente recupera memorias del usuario (preferencias, pedidos recientes). Luego envía instrucción + historial + declaraciones de herramientas a Gemini (p. ej. gemini-4-hydrogen).',
    flows: ['rt>mem', 'rt>gem'],
  },
  {
    title: 'Gemini decide llamar a una herramienta',
    body: 'El modelo responde con un function_call: get_order(order_id="4821"). ADK lo ejecuta: en este caso la herramienta vive en MCP Toolbox, que traduce a SQL parametrizado contra Cloud SQL.',
    flows: ['gem>rt', 'rt>tb', 'tb>db'],
  },
  {
    title: 'El resultado vuelve al modelo y sale la respuesta',
    body: 'ADK agrega el function_response al contexto, Gemini redacta "Tu pedido va en ruta, llega el 14…", Model Armor revisa la respuesta y Gemini Enterprise se la muestra a Camila. La traza completa (invoke_agent → call_llm → execute_tool) queda en Cloud Trace.',
    flows: ['db>tb', 'tb>rt', 'rt>gem', 'rt>tr'],
  },
  {
    title: 'De vuelta al usuario',
    body: 'La respuesta recorre el camino inverso: Agent Runtime → Gateway (Model Armor de salida) → Gemini Enterprise → Camila. Cada pieza que viste tiene su lección en este tutorial.',
    flows: ['rt>gw', 'gw>ge', 'ge>user'],
  },
]

function PathLab() {
  const player = usePlayer(PATH.length, { interval: 3400 })
  const s = PATH[player.step]
  return (
    <Lab title="El camino de una pregunta por la plataforma" hint="Reproduce o salta de paso">
      <PlayerBar player={player} labels={PATH.map((p) => p.title)} />
      <FlowDiagram nodes={NODES} edges={EDGES} width={960} height={380} flows={s.flows} ariaLabel="Recorrido de una pregunta por la plataforma de agentes de Google" />
      <Narration steps={PATH} step={player.step} />
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Quiz de renombres                                                 */
/* ------------------------------------------------------------------------ */
const QUIZ = [
  { q: 'Vertex AI Agent Engine', a: 'Agent Runtime', opts: ['Agent Runtime', 'Agent Studio', 'Agent Garden'] },
  { q: 'Agentspace', a: 'Gemini Enterprise', opts: ['Gemini Enterprise', 'Gemini Enterprise Agent Platform', 'Agent Registry'] },
  { q: 'Vertex AI (la plataforma)', a: 'Gemini Enterprise Agent Platform', opts: ['Gemini Enterprise', 'Gemini Enterprise Agent Platform', 'Model Garden'] },
]
function RenameQuiz() {
  const [picks, setPicks] = useState<Record<number, string>>({})
  const score = QUIZ.filter((x, i) => picks[i] === x.a).length
  return (
    <Lab title="¿Cómo se llama hoy?" hint="Elige una respuesta por fila" footer={<span className="small muted">Aciertos: {score}/{QUIZ.length}. Los nombres viejos siguen en blogs, URLs y roles IAM: conviene reconocerlos.</span>}>
      <div className="eco-quiz">
        {QUIZ.map((x, i) => (
          <div key={x.q}>
            <div className="eco-quiz-q">
              {x.q} <span className="muted">→ hoy se llama…</span>
            </div>
            <div className="eco-quiz-opts" style={{ marginTop: 6 }}>
              {x.opts.map((o) => {
                const picked = picks[i]
                const cls = picked ? (o === x.a ? ' is-right' : o === picked ? ' is-wrong' : '') : ''
                return (
                  <button key={o} className={`btn btn-sm${cls}`} onClick={() => setPicks((p) => ({ ...p, [i]: o }))}>
                    {o}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · ¿Qué uso para qué?                                                */
/* ------------------------------------------------------------------------ */
const NEEDS: { need: string; id: string }[] = [
  { need: 'Probar rápido un prompt y comparar modelos sin escribir código', id: 'agent-studio' },
  { need: 'Programar el agente con herramientas, sub-agentes y tests', id: 'adk' },
  { need: 'Conectar el agente a Cloud SQL y a un Postgres que no está en Google', id: 'mcp-toolbox' },
  { need: 'Hospedarlo en producción sin administrar servidores', id: 'agent-runtime' },
  { need: 'Que recuerde al usuario entre conversaciones', id: 'memory-bank' },
  { need: 'Bloquear prompt injection y fugas de datos', id: 'model-armor' },
  { need: 'Darle al agente su propia identidad IAM con mínimo privilegio', id: 'agent-identity' },
  { need: 'Medir si el agente llama las herramientas correctas', id: 'evaluation' },
  { need: 'Que los empleados lo encuentren y lo usen con su identidad', id: 'gemini-enterprise' },
  { need: 'Que un agente de otro equipo o proveedor pueda delegarle tareas', id: 'a2a' },
]
function DecideLab() {
  const [sel, setSel] = useState(NEEDS[1].id)
  const c = useMemo(() => COMPONENTS.find((x) => x.id === sel)!, [sel])
  return (
    <Lab title="¿Qué pieza resuelve qué necesidad?" hint="Elige una necesidad">
      <div className="eco-decide">
        <div>
          {NEEDS.map((n) => (
            <button key={n.id} className={`eco-need${n.id === sel ? ' is-active' : ''}`} onClick={() => setSel(n.id)}>
              {n.need}
            </button>
          ))}
        </div>
        <Detail c={c} />
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="Una plataforma, cuatro pilares (y una app para usarla)">
        <p>
          Google organiza su plataforma de agentes, la <strong>Gemini Enterprise Agent Platform</strong> (hasta abril de 2026, Vertex AI), en cuatro
          pilares: <em>Build</em> para construir, <em>Scale</em> para ejecutar en producción, <em>Govern</em> para controlar y <em>Optimize</em> para
          evaluar y observar. Aparte está <strong>Gemini Enterprise</strong>, la aplicación donde los empleados chatean y descubren agentes.
        </p>
        <p>
          Este tutorial recorre exactamente ese camino: programas con <Term tip="Agent Development Kit: framework open source de Google para agentes (Python, TypeScript, Go, Java).">ADK</Term>,
          despliegas en <Term tip="Hosting administrado para agentes; antes se llamaba Vertex AI Agent Engine.">Agent Runtime</Term>, gobiernas con Model Armor e
          identidades propias, evalúas con <code>adk eval</code> y publicas en Gemini Enterprise. Haz clic en cada pieza para ubicarla.
        </p>
        <PillarMap />
      </Section>

      <Section n={2} title="Por dónde pasa una pregunta">
        <p>
          Antes de instalar nada conviene ver el recorrido completo. Camila, clienta de Andes Market, pregunta por su pedido; la respuesta cruza ocho
          componentes. Fíjate en qué hace cada uno y, sobre todo, en que <strong>tu código es solo el agente ADK</strong>: el resto lo administra la
          plataforma.
        </p>
        <PathLab />
        <Callout tone="info" title="Simplificación">
          En Agent Runtime el gateway es administrado y transparente; en Cloud Run o GKE todavía está "próximamente" (nov-2026) y lo reemplazas con
          Model Armor desde ADK. Agent Registry, Cloud Logging y la autenticación de Camila no aparecen en el diagrama para no saturarlo.
        </Callout>
      </Section>

      <Section n={3} title="Se llamaba de otra forma">
        <p>
          En 2025–2026 Google renombró casi todo. Los nombres viejos siguen vivos en URLs de la consola (<code>console.cloud.google.com/vertex-ai/…</code>),
          en la API (<code>aiplatform.googleapis.com</code>, recurso <code>reasoningEngines</code>), en el comando <code>adk deploy agent_engine</code> y en
          roles IAM como <code>discoveryengine.agentspaceAdmin</code>. Saber el mapa te ahorra horas de confusión leyendo blogs.
        </p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Antes</th>
                <th>Ahora</th>
                <th>Desde</th>
                <th>Lo que no cambió</th>
              </tr>
            </thead>
            <tbody>
              {RENAMES.map((r) => (
                <tr key={r.before}>
                  <td className="mono">{r.before}</td>
                  <td>
                    <strong>{r.after}</strong>
                  </td>
                  <td>{r.since}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RenameQuiz />
      </Section>

      <Section n={4} title="¿Qué uso para qué?">
        <p>
          La pregunta práctica. Cada necesidad típica tiene una pieza específica; combinarlas bien es, en el fondo, "arquitectura de agentes en
          Google". Las lecciones siguientes toman cada una en el orden en que las necesitarás.
        </p>
        <DecideLab />
        <Callout tone="tip" title="Lo que puedes usar fuera de Google Cloud">
          ADK, MCP Toolbox for Databases, el protocolo A2A y Agents CLI son open source: corren en tu laptop, en otra nube o en on-prem. Lo que es
          exclusivo de Google es el hosting (Agent Runtime), Sessions/Memory Bank, Model Armor, Agent Identity/Gateway/Registry y Gemini Enterprise.
        </Callout>
      </Section>

      <KeyIdeas
        items={[
          <>
            <strong>Gemini Enterprise Agent Platform</strong> = la plataforma (antes Vertex AI). <strong>Gemini Enterprise</strong> = la app de los
            empleados (antes Agentspace). No son lo mismo.
          </>,
          <>
            Tu código es el agente <strong>ADK</strong>; Agent Runtime lo hospeda, Sessions y Memory Bank le dan estado, Model Armor y Agent Identity lo
            protegen, Cloud Trace y <code>adk eval</code> lo miden.
          </>,
          <>
            Las bases de datos (dentro o fuera de Google) se conectan con <strong>MCP Toolbox</strong>: SQL parametrizado declarado en YAML, nunca SQL
            escrito por el modelo.
          </>,
          <>Los nombres viejos siguen en URLs, APIs, comandos y roles IAM. Reconócelos y sigue adelante.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'Agent Platform · overview (pilares y componentes)', href: 'https://docs.cloud.google.com/agent-builder/overview' },
          { label: 'Agent Gateway · overview', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview' },
          { label: 'Agent Registry · overview', href: 'https://docs.cloud.google.com/agent-registry/overview' },
          { label: 'Registrar agentes ADK en Gemini Enterprise', href: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent' },
          { label: 'ADK · documentación', href: 'https://adk.dev/' },
          { label: 'Arquitectura de referencia: agente ADK en Cloud Run', href: 'https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run' },
        ]}
      />
    </>
  )
}
