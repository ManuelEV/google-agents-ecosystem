import { useMemo, useState } from 'react'
import { Check, Minus, Plus, X } from 'lucide-react'
import { ArchDiagram } from '../../components/Arch'
import { Code, linesOf } from '../../components/Code'
import { ConsoleCard, ConsoleDisclaimer, ConsoleField, ConsoleTable, GcpConsole } from '../../components/Console'
import { Narration, PlayerBar, type StepInfo } from '../../components/Player'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { Callout, KeyIdeas, Lab, Panel, Pill, Section, Segmented, Slider, Sources, Stat, Term, Toggle } from '../../components/ui'
import { usePlayer } from '../../lib/hooks'
import { fmtUsd } from '../../sim/math'
import { MODELS, costOf } from '../../sim/models'
import { CASES, CRITERIA, EVALSET, EVAL_FIELDS, PYTEST_CODE, SPANS, TERM_EVAL, TERM_MULTIRUN, TEST_CONFIG, TRACE_ENABLE, trajectoryScore, type EvalCase } from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Anatomía de un evalset                                            */
/* ------------------------------------------------------------------------ */
function EvalsetLab() {
  const [sel, setSel] = useState(EVAL_FIELDS[5].id)
  const f = EVAL_FIELDS.find((x) => x.id === sel)!
  return (
    <Lab title="Anatomía de un caso de evaluación" hint="Haz clic en un campo">
      <div className="eval-fields">
        <div>
          {EVAL_FIELDS.map((x) => (
            <button key={x.id} className={`eval-field${x.id === sel ? ' is-active' : ''}`} onClick={() => setSel(x.id)}>
              <code>{x.label}</code>
              {x.id === sel && <p className="eval-field-body anim-fade">{x.body}</p>}
            </button>
          ))}
        </div>
        <Code code={EVALSET} lang="json" title="examples/andes_prod/evals/andes_ops.evalset.json (abreviado)" highlight={linesOf(EVALSET, ...f.needles)} dim maxHeight={520} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Criterios y umbral                                                */
/* ------------------------------------------------------------------------ */
function TrajectoryView({ c }: { c: EvalCase }) {
  const n = Math.max(c.expected.length, c.actual.length)
  return (
    <div className="eval-traj">
      <div>
        <div className="label" style={{ marginBottom: 4 }}>
          esperada (evalset)
        </div>
        <ol>
          {c.expected.map((t, i) => (
            <li key={i} className={c.actual[i] === t ? 'is-ok' : 'is-miss'}>
              {c.actual[i] === t ? <Check size={12} /> : <Minus size={12} />} {t}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <div className="label" style={{ marginBottom: 4 }}>
          real (lo que hizo el agente)
        </div>
        <ol>
          {Array.from({ length: n }, (_, i) => c.actual[i]).map((t, i) =>
            t ? (
              <li key={i} className={c.expected[i] === t ? 'is-ok' : 'is-extra'}>
                {c.expected[i] === t ? <Check size={12} /> : <Plus size={12} />} {t}
              </li>
            ) : null,
          )}
        </ol>
      </div>
    </div>
  )
}

function ThresholdLab() {
  const [thr, setThr] = useState(1)
  const [respThr, setRespThr] = useState(0.7)
  const rows = CASES.map((c) => {
    const traj = trajectoryScore(c)
    const pass = traj >= thr && c.responseScore >= respThr
    return { c, traj, pass }
  })
  const passed = rows.filter((r) => r.pass).length
  return (
    <Lab
      title="¿Con qué umbral pasa cada caso?"
      hint="Mueve los umbrales"
      footer={
        <span className="small muted">
          {passed}/{CASES.length} casos pasan. El umbral por defecto de trayectoria es <code>1.0</code>: una llamada de más o de menos hace fallar el caso. Bajarlo
          esconde el problema; lo correcto es arreglar la instrucción del agente.
        </span>
      }
    >
      <div className="row" style={{ marginBottom: 12, gap: 20 }}>
        <Slider label="tool_trajectory_avg_score ≥" value={thr} min={0} max={1} step={0.05} onChange={setThr} format={(v) => v.toFixed(2)} style={{ minWidth: 240 }} />
        <Slider label="final_response_match_v2 ≥" value={respThr} min={0} max={1} step={0.05} onChange={setRespThr} format={(v) => v.toFixed(2)} style={{ minWidth: 240 }} />
      </div>
      <div className="eval-cases">
        {rows.map(({ c, traj, pass }) => (
          <div key={c.id} className={`eval-case ${pass ? 'is-pass' : 'is-fail'}`}>
            <div className="eval-case-head">
              {pass ? <Check size={16} color="var(--c-ok)" /> : <X size={16} color="var(--c-error)" />}
              <span className="mono">{c.id}</span>
              <span className="q">"{c.question}"</span>
              <span style={{ marginLeft: 'auto' }} className="row">
                <span className="eval-score" data-tone={traj >= thr ? 'ok' : 'error'}>
                  trayectoria {traj.toFixed(2)}
                </span>
                <span className="eval-score" data-tone={c.responseScore >= respThr ? 'ok' : 'error'}>
                  respuesta {c.responseScore.toFixed(2)}
                </span>
              </span>
            </div>
            <TrajectoryView c={c} />
          </div>
        ))}
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · adk eval paso a paso                                              */
/* ------------------------------------------------------------------------ */
type RunStep = StepInfo & { upTo: number; focus: number | null }
const RUN_STEPS: RunStep[] = [
  { title: 'Lanzas adk eval', body: 'La CLI carga andes_prod (busca root_agent en andes_prod/agent.py), lee el evalset y los criterios de test_config.json. Para los criterios con juez LLM necesita GOOGLE_API_KEY o proyecto + ADC.', upTo: 4, focus: null },
  { title: 'Caso 1: la trayectoria coincide', body: 'El coordinador delegó a pedidos_agent, que llamó get_order y luego track_shipment, exactamente lo que dice tool_uses. Trayectoria 1.00; el juez LLM da 0.91 de coincidencia con la respuesta de referencia.', upTo: 9, focus: 0 },
  { title: 'Caso 2: una llamada de más', body: 'devoluciones_agent llamó track_shipment antes de request_refund. No está en la trayectoria esperada: 2 de 3 posiciones coinciden → 0.67, bajo el umbral 1.0. La respuesta final era correcta, pero el caso FALLA: evaluamos el proceso, no solo el texto.', upTo: 16, focus: 1 },
  { title: 'Caso 3: el guardrail funcionó', body: 'El cliente pidió un pedido ajeno (4903). La trayectoria esperada incluye get_order porque el before_tool_callback de andes_prod bloquea la ejecución y devuelve un error que el modelo explica. Pasa.', upTo: 21, focus: 2 },
  { title: 'Resumen y métricas de eficiencia', body: 'tool_call_count, inference_call_count, token_usage e invocation_duration se reportan siempre pero nunca hacen fallar un caso. Resultado: 2/3. En CI esto rompe el pipeline: así debe ser.', upTo: TERM_EVAL.length, focus: null },
]

function RunLab() {
  const player = usePlayer(RUN_STEPS.length, { interval: 4200 })
  const s = RUN_STEPS[player.step]
  return (
    <Lab title="adk eval, paso a paso" hint="Reproduce o haz clic en un paso">
      <PlayerBar player={player} labels={RUN_STEPS.map((x) => x.title)} />
      <div className="eval-run" style={{ marginTop: 12 }}>
        <Terminal lines={TERM_EVAL} upTo={s.upTo} title="bash · examples/" maxHeight={420} />
        <div className="stack">
          <Narration steps={RUN_STEPS} step={player.step} />
          <div className="eval-cases">
            {CASES.map((c, i) => {
              const traj = trajectoryScore(c)
              const shown = s.focus === null ? player.step === RUN_STEPS.length - 1 : i <= s.focus
              return (
                <div key={c.id} className={`eval-case ${traj >= 1 ? 'is-pass' : 'is-fail'}${!shown ? ' is-dim' : ''}${s.focus === i ? ' anim-in' : ''}`}>
                  <div className="eval-case-head">
                    {shown ? traj >= 1 ? <Check size={16} color="var(--c-ok)" /> : <X size={16} color="var(--c-error)" /> : <Minus size={16} />}
                    <span className="mono small">{c.id}</span>
                    {shown && (
                      <span className="eval-score" data-tone={traj >= 1 ? 'ok' : 'error'} style={{ marginLeft: 'auto' }}>
                        {traj.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {s.focus === i && <TrajectoryView c={c} />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Lab>
  )
}

function MultiRunLab() {
  const player = useTerminalPlayer(TERM_MULTIRUN)
  return (
    <Lab title="Varias corridas y pytest" hint="Pulsa ▶">
      <div className="grid-2">
        <Terminal lines={TERM_MULTIRUN} upTo={player.upTo} typed={player.typed} player={player} title="bash · examples/" maxHeight={330} />
        <Code code={PYTEST_CODE} lang="python" title="examples/andes_prod/tests/test_eval.py" highlight={linesOf(PYTEST_CODE, 'AgentEvaluator.evaluate', 'agent_module', 'eval_dataset_file_path_or_dir')} />
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Trazas                                                            */
/* ------------------------------------------------------------------------ */
const W = 760
const LEFT = 210
const ROW = 30
const T_MAX = 1800

function Waterfall({ sel, onSel, capture }: { sel: string; onSel: (id: string) => void; capture: boolean }) {
  const H = 30 + SPANS.length * ROW
  const x = (t: number) => LEFT + ((W - LEFT - 20) * t) / T_MAX
  return (
    <svg className="eval-wf" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cascada de spans de una invocación del agente">
      {[0, 500, 1000, 1500].map((t) => (
        <g key={t}>
          <line className="grid" x1={x(t)} x2={x(t)} y1={18} y2={H - 4} />
          <text className="ms" x={x(t)} y={12} textAnchor="middle">
            {t} ms
          </text>
        </g>
      ))}
      {SPANS.map((sp, i) => {
        const y = 24 + i * ROW
        const dimmed = sel && sel !== sp.id && !(SPANS.find((s) => s.id === sel)?.depth === 0)
        return (
          <g key={sp.id} data-tone={sp.tone} className={`${sel === sp.id ? 'is-active' : ''}${dimmed ? ' is-dim' : ''}`} onClick={() => onSel(sp.id)} style={{ cursor: 'pointer' }}>
            <text className="lbl" x={8 + sp.depth * 14} y={y + 15}>
              {sp.depth > 0 ? '└ ' : ''}
              {sp.name}
            </text>
            <rect className="bar" x={x(sp.start)} y={y + 4} width={Math.max(3, x(sp.end) - x(sp.start))} height={ROW - 10} rx={4} />
            <text className="ms" x={x(sp.end) + 6 > W - 60 ? x(sp.end) - 6 : x(sp.end) + 6} y={y + 15} textAnchor={x(sp.end) + 6 > W - 60 ? 'end' : 'start'}>
              {sp.end - sp.start} ms{capture && sp.content ? ' · con contenido' : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function TraceLab() {
  const [sel, setSel] = useState('llm1')
  const [capture, setCapture] = useState(false)
  const [view, setView] = useState<'wf' | 'console'>('wf')
  const sp = SPANS.find((s) => s.id === sel)!
  const inTok = 412 + 498
  const outTok = 18 + 61
  const model = MODELS.find((m) => m.id === 'gemini-3.8-flash')!
  return (
    <Lab
      title="La traza de «¿Dónde está mi pedido 4821?»"
      hint="Haz clic en un span"
      footer={view === 'console' ? <ConsoleDisclaimer /> : <span className="small muted">Spans y atributos siguen las convenciones GenAI de OpenTelemetry que emite ADK; los tiempos son los de la simulación de la lección «Tu primer agente».</span>}
    >
      <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
        <Segmented
          options={[
            { value: 'wf', label: 'Cascada de spans' },
            { value: 'console', label: 'Trace Explorer (consola)' },
          ]}
          value={view}
          onChange={setView}
        />
        <Toggle label={<code>ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS=true</code>} checked={capture} onChange={setCapture} />
      </div>
      {view === 'wf' ? (
        <div className="eval-trace">
          <Waterfall sel={sel} onSel={setSel} capture={capture} />
          <Panel title={sp.name} tone={sp.tone}>
            <div className="eval-attrs">
              {Object.entries(sp.attrs).map(([k, v]) => (
                <div key={k}>
                  <span className="k">{k}</span>
                  <span className="v">{v}</span>
                </div>
              ))}
              {sp.content &&
                Object.entries(sp.content).map(([k, v]) => (
                  <div key={k}>
                    <span className="k">{k}</span>
                    <span className={`v${capture ? '' : ' is-hidden'}`}>{capture ? v : '(no capturado: contenido de mensajes desactivado por defecto)'}</span>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      ) : (
        <GcpConsole
          title="Trace Explorer"
          product="Observability"
          url="traces/explorer"
          nav={[
            { id: 'logs', label: 'Logs Explorer' },
            { id: 'trace', label: 'Trace Explorer' },
            { id: 'mon', label: 'Monitoring' },
          ]}
          activeNav="trace"
          crumbs={['Trace', 'Trace Explorer']}
        >
          <ConsoleField label="Filtro" value='span_name="invoke_agent andes_ops"  resource.type="aiplatform.googleapis.com/ReasoningEngine"' />
          <ConsoleTable
            cols={['Hora', 'Latencia', 'Span raíz', 'Spans']}
            rows={[
              ['13 nov 2026, 09:41:12', '1,80 s', 'invoke_agent andes_ops', '6'],
              ['13 nov 2026, 09:40:55', '3,94 s', 'invoke_agent andes_ops', '14'],
              ['13 nov 2026, 09:38:03', '2,12 s', 'invoke_agent andes_ops', '8'],
            ]}
            hl={0}
          />
          <ConsoleCard title="invoke_agent andes_ops · 1,80 s">
            <Waterfall sel={sel} onSel={setSel} capture={capture} />
          </ConsoleCard>
        </GcpConsole>
      )}
      <div className="eval-stats">
        <Stat label="llamadas al modelo" value="2" tone="model" />
        <Stat label="herramientas" value="1" tone="tool" />
        <Stat label="tokens entrada / salida" value={`${inTok} / ${outTok}`} tone="data" />
        <Stat label="costo (gemini-3.8-flash)" value={fmtUsd(costOf(model, inTok, outTok))} tone="guard" sub="precio promocional hasta 2026-12-31" />
        <Stat label="latencia" value="1,8 s" tone="system" />
      </div>
    </Lab>
  )
}

export default function Lesson() {
  const criteriaRows = useMemo(() => CRITERIA, [])
  return (
    <>
      <Section n={1} title="Evaluar el camino, no solo la respuesta">
        <p>
          Un agente puede responder bien por el motivo equivocado: inventar el estado de un pedido sin consultar la base, o llamar tres herramientas donde
          bastaba una. Por eso ADK evalúa dos cosas: la <strong>trayectoria</strong> (qué herramientas llamó, con qué argumentos y en qué orden) y la{' '}
          <strong>respuesta final</strong>. Ambas se declaran en un <Term tip="Archivo *.evalset.json con varios casos; cada caso es una sesión con uno o más turnos.">evalset</Term>.
        </p>
        <p>
          El evalset de <code>examples/andes_prod</code> tiene tres casos de humo. Recorre los campos: la parte que más cuesta escribir bien es{' '}
          <code>intermediate_data.tool_uses</code>, porque obliga a decidir cuál es el proceso correcto.
        </p>
        <EvalsetLab />
        <Callout tone="tip" title="Cómo escribirlos sin sufrir">
          En <code>adk web</code>, pestaña <strong>Eval</strong>: conversa con el agente, guarda la sesión como caso, edita la trayectoria esperada y fija los
          umbrales. Para pruebas rápidas de un solo turno usa <code>*.test.json</code> (mismo esquema, un caso por archivo).
        </Callout>
      </Section>

      <Section n={2} title="Criterios y umbrales">
        <p>
          Los criterios van en <code>test_config.json</code>. Sin configuración, ADK exige <code>tool_trajectory_avg_score ≥ 1.0</code> (trayectoria idéntica) y{' '}
          <code>response_match_score ≥ 0.8</code> (ROUGE-1). Los criterios con juez LLM usan el Gen AI Evaluation Service y necesitan credenciales; los de
          eficiencia se reportan siempre pero nunca hacen fallar un caso.
        </p>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Code code={TEST_CONFIG} lang="json" title="examples/andes_prod/evals/test_config.json" />
          <Callout tone="info" title="Sin simulación de usuario">
            Los criterios que necesitan referencia (<code>tool_trajectory_avg_score</code>, <code>response_match_score</code>, <code>final_response_match_v2</code>)
            no funcionan con la simulación de usuario de ADK; para conversaciones abiertas usa los <code>multi_turn_*</code>.
          </Callout>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Criterio</th>
                <th>Tipo</th>
                <th>Qué mide</th>
                <th>Defecto</th>
              </tr>
            </thead>
            <tbody>
              {criteriaRows.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {c.id}
                  </td>
                  <td>
                    <Pill tone={c.tone}>{c.kind}</Pill>
                  </td>
                  <td>{c.what}</td>
                  <td className="num">{c.default ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ThresholdLab />
      </Section>

      <Section n={3} title="Correr adk eval (y repetirlo en CI)">
        <p>
          <code>adk eval &lt;carpeta_agente&gt; &lt;evalset&gt;</code> ejecuta cada caso contra el agente real: llama a Gemini y a las herramientas. En la corrida
          simulada, el caso de devolución falla porque el sub-agente hizo una llamada de más. Fíjate en que la respuesta final era correcta: evaluar solo el
          texto habría escondido el problema.
        </p>
        <RunLab />
        <p>
          Como el modelo no es determinista, ADK 2.14 permite correr cada caso varias veces y mirar la tasa de aprobación. El mismo evalset se integra en
          pytest con <code>AgentEvaluator.evaluate</code>, para que el pipeline de CI bloquee un despliegue que rompa una trayectoria.
        </p>
        <MultiRunLab />
        <Callout tone="warn" title="Errores comunes">
          Bajar el umbral de trayectoria para que "pase" · poner en <code>tool_uses</code> solo la última herramienta · olvidar <code>session_input.state</code>{' '}
          (los guardrails leen el estado) · evaluar con un modelo distinto al de producción.
        </Callout>
      </Section>

      <Section n={4} title="Observar: trazas en Cloud Trace">
        <p>
          La evaluación te dice <em>si</em> el agente hizo lo correcto; la traza te dice <em>cuánto tardó y dónde</em>. ADK emite spans OpenTelemetry (
          <code>invoke_agent</code>, <code>call_llm</code>, <code>generate_content</code>, <code>execute_tool</code>) con atributos de modelo, tokens y
          herramientas. En Agent Runtime se activan con <code>--otel_to_cloud</code> y se miran en Trace Explorer.
        </p>
        <TraceLab />
        <Code code={TRACE_ENABLE} lang="bash" title="Cómo activar las trazas" highlight={linesOf(TRACE_ENABLE, '--otel_to_cloud', 'enable_tracing=True', 'ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS')} />
        <Callout tone="danger" title="Contenido de mensajes en spans">
          Por defecto ADK <strong>no</strong> captura prompts ni resultados de herramientas en las trazas. Activarlo ayuda a depurar, pero copia datos
          personales de tus clientes a Cloud Trace: decide con tu política de datos y, en todo caso, no lo hagas en producción sin redacción de PII.
        </Callout>
      </Section>

      <Section n={5} title="Lo que agregamos a la arquitectura">
        <p>
          Cloud Trace (y el evalset en CI) cierran el ciclo: cada despliegue se mide antes de salir y se observa después. Es la etapa 7 de 8.
        </p>
        <ArchDiagram stage={7} />
      </Section>

      <KeyIdeas
        items={[
          <>
            Evalúa la <strong>trayectoria</strong> (<code>tool_uses</code>) además de la respuesta: una respuesta correcta por el camino equivocado es un bug.
          </>,
          <>
            Defecto: <code>tool_trajectory_avg_score ≥ 1.0</code> y <code>response_match_score ≥ 0.8</code>; los criterios con juez LLM (<code>final_response_match_v2</code>,{' '}
            <code>safety_v1</code>, <code>hallucinations_v1</code>…) necesitan credenciales de evaluación.
          </>,
          <>
            <code>adk eval</code> en local, <code>AgentEvaluator.evaluate</code> en pytest/CI, varias corridas por caso para medir varianza.
          </>,
          <>
            Trazas con <code>--otel_to_cloud</code> o <code>enable_tracing=True</code>; el contenido de mensajes queda fuera a menos que lo actives a propósito.
          </>,
        ]}
      />
      <Sources
        items={[
          { label: 'ADK · Evaluación (evalset, criterios, adk eval, pytest)', href: 'https://adk.dev/evaluate/' },
          { label: 'ADK · Cloud Trace', href: 'https://adk.dev/integrations/cloud-trace/' },
          { label: 'Agent Platform · observabilidad', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/observability/overview' },
          { label: 'Agent Platform · evaluación de agentes', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/agent-evaluation' },
          { label: 'Precios de la API de Gemini', href: 'https://aistudio.google.com/docs/pricing' },
        ]}
      />
    </>
  )
}
