import { useMemo, useState } from 'react'
import { Callout, DocLink, KeyIdeas, Lab, Panel, Pill, Section, Segmented, Slider, Sources, Stat, Term, Toggle, type Tone } from '../../components/ui'
import { Code } from '../../components/Code'
import { Narration, PlayerBar, type StepInfo } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { FLASH_ALIAS, MODELS, MODEL_ROOT, MODEL_WORKER, costOf, modelById } from '../../sim/models'
import { fmtInt, fmtUsd } from '../../sim/math'
import { LIFE, ROLES, THINK, TIER_LABEL, TIER_TONE, TODAY, type ThinkLevel } from './data'
import './lesson.css'

const fmtCtx = (n: number) => `${Math.round(n / 1024 / 1024)}M`
const dateEs = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}-${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m) - 1]}-${y}`
}

/* ------------------------------------------------------------------------ */
/* Lab 1 · Catálogo                                                          */
/* ------------------------------------------------------------------------ */
function CatalogLab() {
  const [sel, setSel] = useState(MODEL_ROOT)
  const m = modelById(sel)!
  return (
    <Lab title="La familia Gemini en noviembre de 2026" hint="Haz clic en un modelo">
      <div className="mod-cards">
        {MODELS.map((x) => (
          <button key={x.id} className={`mod-card${x.id === sel ? ' is-active' : ''}`} data-tone={TIER_TONE[x.tier]} onClick={() => setSel(x.id)}>
            <span className="mod-card-id">{x.id}</span>
            <span className="mod-card-name">{x.name}</span>
            <span className="mod-card-price">
              {fmtUsd(x.input, 2)} / {fmtUsd(x.output, 2)} <span className="muted small">por 1M tok (in / out)</span>
              {x.inputAfter && (
                <span className="after">
                  <br />→ {fmtUsd(x.inputAfter, 2)} / {fmtUsd(x.outputAfter!, 2)} después del {dateEs(x.promoUntil!)}
                </span>
              )}
            </span>
            <span className="mod-card-meta">
              <Pill tone={TIER_TONE[x.tier]}>{TIER_LABEL[x.tier]}</Pill>
              <Pill tone={x.status === 'GA' ? 'ok' : 'guard'}>{x.status}</Pill>
              <Pill mono>{fmtCtx(x.context)} ctx</Pill>
            </span>
            <span className="mod-card-best">{x.bestFor}</span>
          </button>
        ))}
      </div>
      <div className="mod-detail anim-fade" key={m.id} data-tone={TIER_TONE[m.tier]}>
        <div>
          <strong>{m.name}</strong> · lanzado {dateEs(m.released)}
          {m.retires && <> · retiro {m.retires.replace('≥ ', 'no antes de ')}</>}
          {!m.retires && <> · "corto plazo": sin fecha de retiro anunciada</>}
        </div>
        <div>
          <strong>Thinking:</strong> {m.thinking}. <strong>Contexto:</strong> {fmtInt(m.context)} tokens (compartidos por entrada y salida).
        </div>
        {m.notes && <div>{m.notes}</div>}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Calculadora de costo                                              */
/* ------------------------------------------------------------------------ */
function CostLab() {
  const [calls, setCalls] = useState(2000)
  const [tin, setTin] = useState(1800)
  const [tout, setTout] = useState(220)
  const [after, setAfter] = useState(false)
  const [sel, setSel] = useState(MODEL_WORKER)
  const m = modelById(sel)!
  const perCall = costOf(m, tin, tout, after)
  const perDay = perCall * calls
  const max = Math.max(...MODELS.map((x) => costOf(x, tin, tout, after) * calls * 30))
  return (
    <Lab
      title="¿Cuánto cuesta un agente al mes?"
      hint="Mueve los sliders y cambia de modelo"
      footer={
        <span className="small muted">
          Un turno típico de Andi consume ~1.800 tokens de entrada (instrucción + historial + declaraciones de herramientas + resultado) por cada llamada al modelo. Cada turno con
          herramienta son <strong>dos</strong> llamadas. Precios de la API de Gemini (nivel pagado); en Vertex pueden variar.
        </span>
      }
    >
      <div className="mod-cost">
        <div className="stack">
          <Segmented
            options={MODELS.map((x) => ({ value: x.id, label: x.name.replace('Gemini ', '') }))}
            value={sel}
            onChange={setSel}
          />
          <Slider label="Llamadas al modelo por día" value={calls} min={100} max={50000} step={100} onChange={setCalls} format={fmtInt} />
          <Slider label="Tokens de entrada por llamada" value={tin} min={200} max={20000} step={100} onChange={setTin} format={fmtInt} />
          <Slider label="Tokens de salida por llamada (incluye thinking)" value={tout} min={20} max={4000} step={10} onChange={setTout} format={fmtInt} />
          <Toggle label="Precio después de la promoción" checked={after} onChange={setAfter} />
          <div className="row">
            <Stat label="por llamada" value={fmtUsd(perCall)} tone={TIER_TONE[m.tier]} />
            <Stat label="por día" value={fmtUsd(perDay, 2)} />
            <div>
              <div className="label">por mes (30 días)</div>
              <div className="mod-cost-total">
                {fmtUsd(perDay * 30, 0)} <small>{m.id}</small>
              </div>
            </div>
          </div>
        </div>
        <Panel title="Comparación mensual" tone="data">
          <div className="stack" style={{ gap: 6 }}>
            {MODELS.map((x) => {
              const v = costOf(x, tin, tout, after) * calls * 30
              return <BarRowCost key={x.id} label={x.id} value={v} max={max} pick={x.id === sel} tone={TIER_TONE[x.tier]} />
            })}
          </div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            {after ? 'Precios post-promoción: Argon/Carbon suben a US$ 4 / 20 el 1-dic-2026; 3.8 Flash a US$ 1,50 / 7,50 el 1-ene-2027.' : 'Precios vigentes al 13-nov-2026 (Argon/Carbon y 3.8 Flash en promoción).'}
          </p>
        </Panel>
      </div>
    </Lab>
  )
}

function BarRowCost({ label, value, max, pick, tone }: { label: string; value: number; max: number; pick: boolean; tone: Tone }) {
  const w = Math.max(1, (value / (max || 1)) * 100)
  return (
    <div className={`bar-row${pick ? ' is-pick' : ''}`} data-tone={tone} style={{ gridTemplateColumns: 'minmax(150px, auto) 1fr 90px' }}>
      <span className="bl">{label}</span>
      <span className="bar-track">
        <span className="bar-fill" style={{ width: `${w}%`, display: 'block' }} />
      </span>
      <span className="bv">{fmtUsd(value, 0)}</span>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Un modelo por rol (scatter velocidad × capacidad)                 */
/* ------------------------------------------------------------------------ */
function RoleLab() {
  const [role, setRole] = useState(ROLES[0].id)
  const r = ROLES.find((x) => x.id === role)!
  const W = 560
  const H = 340
  const px = (speed: number) => 70 + ((5 - speed) / 4) * (W - 110) // rápido a la derecha
  const py = (cap: number) => H - 50 - ((cap - 1) / 4) * (H - 120)
  return (
    <Lab title="Un modelo por rol, no uno para todo" hint="Elige un rol del sistema de Andi">
      <div className="split">
        <svg className="mod-scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Modelos Gemini ubicados por velocidad y capacidad">
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line className="grid" x1={px(v)} x2={px(v)} y1={30} y2={H - 50} />
              <line className="grid" x1={70} x2={W - 40} y1={py(v)} y2={py(v)} />
            </g>
          ))}
          <line className="axis" x1={70} x2={W - 40} y1={H - 50} y2={H - 50} />
          <line className="axis" x1={70} x2={70} y1={30} y2={H - 50} />
          <text x={W - 40} y={H - 28} textAnchor="end">
            más rápido / barato →
          </text>
          <text x={66} y={py(5) - 6} textAnchor="end" transform={`rotate(-90 ${66} ${py(5) - 6})`}>
            más capaz ↑
          </text>
          {/* zona del rol */}
          <g data-tone={r.tone}>
            {role === 'root' && <rect className="zone" x={px(2.6)} y={py(4.6)} width={px(1.4) - px(2.6)} height={py(3.6) - py(4.6)} />}
            {role === 'worker' && <rect className="zone" x={px(2.6)} y={py(3.6)} width={px(1.4) - px(2.6)} height={py(2.5) - py(3.6)} />}
            {role === 'router' && <rect className="zone" x={px(1.6)} y={py(2.6)} width={px(0.5) - px(1.6)} height={py(1.4) - py(2.6)} />}
            {role === 'deep' && <rect className="zone" x={px(4.6)} y={py(5.5)} width={px(3.4) - px(4.6)} height={py(4.4) - py(5.5)} />}
          </g>
          {MODELS.map((m) => {
            const pick = m.id === r.model
            const inZone =
              (role === 'root' && m.tier === 'everyday') ||
              (role === 'worker' && m.tier === 'flash') ||
              (role === 'router' && m.tier === 'lite') ||
              (role === 'deep' && m.tier === 'frontier')
            // separar puntos superpuestos (argon/carbon, 3.5/3.8 flash): etiqueta abajo para el segundo
            const below = m.id === 'gemini-4-carbon' || m.id === 'gemini-3.5-flash'
            const dx = m.id === 'gemini-4-carbon' ? 34 : m.id === 'gemini-3.5-flash' ? -34 : 0
            const dy = m.id === 'gemini-4-carbon' ? 10 : m.id === 'gemini-3.5-flash' ? 10 : 0
            return (
              <g key={m.id} className={`pt${pick ? ' is-pick' : ''}${!inZone ? ' is-dim' : ''}`} data-tone={TIER_TONE[m.tier]} transform={`translate(${px(m.speed) + dx},${py(m.capability) + dy})`}>
                <circle className="dot" r={pick ? 11 : 8} />
                <text className="lbl" x={0} y={below ? 24 : -15} textAnchor="middle">
                  {m.id.replace('gemini-', '')}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="mod-roles">
          {ROLES.map((x) => (
            <button key={x.id} className={`mod-role${x.id === role ? ' is-active' : ''}`} data-tone={x.tone} onClick={() => setRole(x.id)}>
              <span className="t">
                {x.title}
                <Pill tone={x.tone} mono>
                  {x.model}
                </Pill>
              </span>
              <span className="d">{x.desc}</span>
            </button>
          ))}
          <div className="mod-detail anim-fade" key={role} data-tone={r.tone} style={{ marginTop: 2 }}>
            <strong>Por qué {r.model}</strong>
            <span>{r.why}</span>
          </div>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Thinking (animado)                                                */
/* ------------------------------------------------------------------------ */
const THINK_STEPS: StepInfo[] = [
  { title: 'Entra el prompt', body: 'Instrucción de Andi + historial + declaraciones de herramientas + "¿Dónde está mi pedido 4821?". Son tokens de entrada: se cobran al precio de input.' },
  { title: 'El modelo "piensa"', body: 'Con thinking activo, Gemini 4 genera tokens de razonamiento antes de responder. Son tokens de SALIDA: cuentan en la ventana de 1M y se cobran al precio de output, aunque tú no los veas completos.' },
  { title: 'Decide la herramienta', body: 'El razonamiento termina en una function_call (o en texto). Cuanto más alto el nivel, más alternativas evalúa antes de decidir… y más tokens gasta.' },
  { title: 'La respuesta visible', body: 'Lo que llega al usuario es una fracción pequeña del total de salida. Por eso en el lab de costo "tokens de salida" incluye el thinking.' },
]
function ThinkLab() {
  const [level, setLevel] = useState<ThinkLevel>('MEDIUM')
  const player = usePlayer(THINK_STEPS.length, { interval: 2600 })
  const t = THINK[level]
  const input = 1800
  const step = player.step
  const showThink = step >= 1
  const showOut = step >= 3
  const total = input + (showThink ? t.thinking : 0) + (showOut ? t.answer : 0)
  const pct = (n: number) => `${(n / (input + t.thinking + t.answer)) * 100}%`
  const traceLines = step === 0 ? [] : step === 1 ? t.trace.slice(0, Math.ceil(t.trace.length / 2)) : t.trace
  return (
    <Lab title="Niveles de thinking en Gemini 4: dónde se van los tokens" hint="Cambia el nivel y reproduce">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="label">thinking_level</span>
          <Segmented
            options={[
              { value: 'LOW', label: 'LOW' },
              { value: 'MEDIUM', label: 'MEDIUM (defecto)' },
              { value: 'HIGH', label: 'HIGH' },
            ]}
            value={level}
            onChange={(v) => {
              setLevel(v)
              player.reset()
            }}
          />
        </div>
        <Pill tone="guard" mono>
          temperature / top_p / top_k: ignorados
        </Pill>
      </div>
      <PlayerBar player={player} labels={THINK_STEPS.map((s) => s.title)} />
      <div className="mod-think-bar" style={{ marginTop: 12 }}>
        <div className="mod-think-seg in" style={{ width: pct(input) }}>
          input {fmtInt(input)}
        </div>
        <div className="mod-think-seg think" style={{ width: showThink ? pct(t.thinking) : 0 }}>
          {showThink && `thinking ${fmtInt(t.thinking)}`}
        </div>
        <div className="mod-think-seg out" style={{ width: showOut ? pct(t.answer) : 0 }}>
          {showOut && `respuesta ${t.answer}`}
        </div>
      </div>
      <div className="mod-think-legend">
        <span>
          <i style={{ background: 'var(--c-user)' }} />
          entrada (precio input)
        </span>
        <span>
          <i style={{ background: 'var(--c-model)' }} />
          thinking (precio output, invisible)
        </span>
        <span>
          <i style={{ background: 'var(--c-tool)' }} />
          respuesta (precio output, visible)
        </span>
        <span style={{ marginLeft: 'auto' }} className="mono">
          total en ventana: {fmtInt(total)} tok
        </span>
      </div>
      <div className="split" style={{ marginTop: 12 }}>
        <div className="mod-think-trace">{traceLines.length ? traceLines.map((l, i) => `${i + 1}. ${l}`).join('\n') : step === 0 ? '(sin razonamiento todavía)' : ''}</div>
        <Narration steps={THINK_STEPS} step={step} />
      </div>
      <p className="small muted" style={{ margin: '10px 0 0' }}>
        Los tokens de thinking son proporciones ilustrativas (no medidas). Lo real: Gemini 4 Argon acepta LOW/MEDIUM/HIGH, devuelve HTTP 400 con <code>thinking_budget</code> o MINIMAL, y
        el output máximo por segmento es 65.536 tokens en streaming.
      </p>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 5 · Ciclo de vida                                                     */
/* ------------------------------------------------------------------------ */
function monthIndex(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return (y - 2025) * 12 + (m - 1) + (d - 1) / 30
}
function LifecycleLab() {
  const W = 900
  const laneH = 24
  const top = 36
  const H = top + LIFE.length * laneH + 40
  const m0 = monthIndex('2025-06-01')
  const m1 = monthIndex('2027-12-01')
  const x = (iso: string) => 150 + ((monthIndex(iso) - m0) / (m1 - m0)) * (W - 170)
  const ticks = useMemo(() => {
    const out: string[] = []
    for (let y = 2025; y <= 2027; y++) for (const m of ['01', '07']) if (monthIndex(`${y}-${m}-01`) >= m0 && monthIndex(`${y}-${m}-01`) <= m1) out.push(`${y}-${m}-01`)
    return out
  }, [m0, m1])
  return (
    <Lab
      title="Ciclo de vida: cuándo nace y cuándo se retira cada modelo"
      hint="Fechas de la página oficial de versiones"
      footer={
        <span className="small muted">
          GA = al menos 12 meses de disponibilidad; "corto plazo" = activo hasta que se anuncie el retiro. Los retiros pueden extenderse, nunca adelantarse. Las barras sin borde al final
          son modelos sin fecha de retiro anunciada.
        </span>
      }
    >
      <div className="flow-scroll">
        <svg className="mod-timeline flow-min" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Línea de tiempo de modelos Gemini">
          <line className="axis" x1={150} x2={W - 20} y1={top - 10} y2={top - 10} />
          {ticks.map((t) => (
            <g key={t}>
              <line className="tick" x1={x(t)} x2={x(t)} y1={top - 14} y2={H - 30} strokeDasharray="2 4" />
              <text x={x(t)} y={top - 18} textAnchor="middle">
                {t.slice(0, 7)}
              </text>
            </g>
          ))}
          {LIFE.map((b) => {
            const y = top + b.lane * laneH
            const x1 = x(b.from)
            const x2 = b.to ? x(b.to) : x('2027-12-01')
            return (
              <g key={b.id} data-tone={b.tone}>
                <text x={144} y={y + 15} textAnchor="end" className="bar-lbl">
                  {b.id.replace('gemini-', '')}
                </text>
                <rect className={`bar${b.retired ? ' is-retired' : ''}${!b.to ? ' is-open' : ''}`} x={x1} y={y + 3} width={Math.max(6, x2 - x1)} height={laneH - 7} />
                {!b.to && <polygon className="arrow" points={`${x2},${y + 3} ${x2 + 10},${y + laneH / 2 - 0.5} ${x2},${y + laneH - 4}`} />}
                {b.retired && (
                  <text x={x2 + 6} y={y + 15} style={{ fill: 'var(--c-error)' }}>
                    retirado {dateEs(b.to!)}
                  </text>
                )}
                {!b.retired && b.to && b.tone === 'system' && (
                  <text x={x2 + 6} y={y + 15}>
                    retiro {dateEs(b.to)}
                  </text>
                )}
              </g>
            )
          })}
          <line className="today" x1={x(TODAY)} x2={x(TODAY)} y1={top - 14} y2={H - 30} />
          <text className="today-lbl" x={x(TODAY) + 6} y={H - 14}>
            hoy · {dateEs(TODAY)}
          </text>
        </svg>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */

const CODE_MODELS = `# examples/andes_workflow/agent.py (fragmento)
MODEL_ROOT = "gemini-4-hydrogen"   # orquesta: conviene un modelo más capaz
MODEL_WORKER = "gemini-3.8-flash"  # especialistas: rápidos y baratos

pedidos_agent = Agent(name="pedidos_agent", model=MODEL_WORKER, mode="task", ...)
root_agent = Agent(name="andes_ops", model=MODEL_ROOT, sub_agents=[pedidos_agent, ...])

# examples/andes_workflow/graph.py: el clasificador usa el más barato
triage = Agent(name="triage", model="gemini-3.5-flash-lite", include_contents="none", ...)
`

export default function Lesson() {
  return (
    <>
      <Section n={1} title="La familia Gemini hoy">
        <p>
          En noviembre de 2026 conviven tres generaciones: <strong>Gemini 4</strong> (Argon y Carbon, los frontier; Hydrogen, el "modelo de todos los
          días" que Google presenta como sucesor de la línea Flash para trabajo agéntico), <strong>Gemini 3.8 Flash</strong> (el Flash GA más nuevo) y
          los <strong>3.5 Flash / Flash-Lite</strong>. Los 2.5 se retiraron el 20 de octubre de 2026: si ves <code>gemini-2.5-flash</code> en un
          tutorial, ya no funciona.
        </p>
        <p>
          Todos tienen 1M de tokens de contexto compartido por entrada y salida, llamadas a funciones y niveles de{' '}
          <Term tip="Tokens de razonamiento que el modelo genera antes de responder. Se cobran como salida.">thinking</Term>. Lo que cambia es
          capacidad, latencia y precio.
        </p>
        <CatalogLab />
        <Callout tone="warn" title="Precios: verificados el 13-nov-2026, caducan rápido">
          Argon y Carbon están en promoción hasta el 30-nov-2026 y 3.8 Flash hasta el 31-dic-2026; después duplican su precio. Hydrogen salió el
          12-nov-2026. Antes de presupuestar revisa la <DocLink href="https://aistudio.google.com/docs/pricing">página oficial de precios</DocLink> y la{' '}
          <DocLink href="https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions">de versiones</DocLink>.
        </Callout>
      </Section>

      <Section n={2} title="Cuánto cuesta de verdad">
        <p>
          El costo de un agente no es "una llamada por mensaje": cada turno con herramienta son al menos dos llamadas al modelo, y cada una reenvía la
          instrucción, el historial y las declaraciones de herramientas. Juega con los números de Andes Market para ver qué pesa más: el volumen, el
          tamaño del contexto o el modelo.
        </p>
        <CostLab />
      </Section>

      <Section n={3} title="Un modelo por rol">
        <p>
          La decisión práctica no es "¿cuál es el mejor modelo?" sino "¿cuál para cada agente?". En un sistema multi-agente el raíz decide poco pero
          decide bien, los especialistas hacen el trabajo repetitivo y los routers solo emiten una etiqueta. Es el reparto que usan los ejemplos del
          repositorio.
        </p>
        <RoleLab />
        <Code code={CODE_MODELS} lang="python" title="examples/andes_workflow/agent.py · graph.py" />
        <Callout tone="tip" title={`El alias ${FLASH_ALIAS}`}>
          La documentación de ADK usa <code>{FLASH_ALIAS}</code>: siempre apunta al Flash estable más nuevo. Cómodo para prototipos; en producción fija
          el ID exacto (<code>{MODEL_WORKER}</code>) para que una actualización no cambie el comportamiento sin que lo evalúes.
        </Callout>
      </Section>

      <Section n={4} title="Thinking: potencia que se paga en tokens">
        <p>
          Gemini 4 razona antes de responder y tú eliges cuánto con <code>thinking_level</code> LOW / MEDIUM / HIGH (MEDIUM por defecto). A cambio
          ignora <code>temperature</code>, <code>top_p</code> y <code>top_k</code>, y rechaza el antiguo <code>thinking_budget</code>. En ADK lo configuras
          con <code>BuiltInPlanner(thinking_config=…)</code> o en <code>generate_content_config</code>.
        </p>
        <ThinkLab />
      </Section>

      <Section n={5} title="Ciclo de vida y Model Garden">
        <p>
          Cada modelo GA promete al menos 12 meses; los de "corto plazo" viven hasta que Google anuncia su retiro. Fija el ID exacto en tu código, suscríbete
          a la página de versiones y ten un evalset (lección «evaluar») para migrar con evidencia, no con fe.
        </p>
        <LifecycleLab />
        <p>
          ADK es agnóstico de modelo: además de Gemini puedes usar modelos de <strong>Model Garden</strong> (abiertos y de terceros, Claude incluido) a
          través de la integración con LiteLLM. En este tutorial nos quedamos en Gemini, que es donde la plataforma integra thinking, grounding y
          Model Armor sin configuración extra.
        </p>
      </Section>

      <KeyIdeas
        items={[
          <>
            Tres niveles: <strong>gemini-4-hydrogen</strong> para el raíz, <strong>gemini-3.8-flash</strong> para especialistas, <strong>gemini-3.5-flash-lite</strong> para routers y
            jueces. Argon/Carbon solo para análisis puntuales.
          </>,
          <>El thinking se cobra como salida y ocupa ventana: elige el nivel por tarea, no "HIGH por si acaso".</>,
          <>Los precios de nov-2026 son promocionales (Argon/Carbon hasta el 30-nov, 3.8 Flash hasta el 31-dic). Presupuesta con el precio posterior.</>,
          <>
            Fija IDs exactos, no alias, y migra con un evalset: los 2.5 ya se retiraron y 3.6 Flash se retira el 19-nov-2026.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'Versiones y ciclo de vida de modelos Gemini', href: 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions' },
          { label: 'Ficha de Gemini 4 Argon (thinking, límites, regiones)', href: 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/4-argon' },
          { label: 'Precios de la API de Gemini', href: 'https://aistudio.google.com/docs/pricing' },
          { label: 'ADK · LlmAgent (model, planner, generate_content_config)', href: 'https://adk.dev/agents/llm-agents/' },
          { label: 'Model Garden', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-garden/explore-models' },
        ]}
      />
    </>
  )
}
