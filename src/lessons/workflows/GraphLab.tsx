import { useEffect, useMemo, useState } from 'react'
import { Lab, Panel, Pill, Segmented, toneVar, type Tone } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { Narration, PlayerBar } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { CODE_GRAPH, GRAPH_SCENARIOS, graphSteps, type GraphScenario } from './data'

type GNode = { id: string; x: number; y: number; label: string; sub?: string; tone: Tone; fn?: boolean }
const W = 920
const H = 330
const NODES: GNode[] = [
  { id: 'start', x: 60, y: 165, label: 'START', tone: 'system', fn: true },
  { id: 'triage', x: 200, y: 165, label: 'triage', sub: 'Agent · flash-lite', tone: 'model' },
  { id: 'route', x: 350, y: 165, label: 'route()', sub: 'función', tone: 'tool', fn: true },
  { id: 'pedidos', x: 530, y: 55, label: 'pedidos_agent', sub: 'Agent · 3.8-flash', tone: 'model' },
  { id: 'devoluciones', x: 530, y: 130, label: 'devoluciones_agent', sub: 'output_key', tone: 'model' },
  { id: 'analitica', x: 530, y: 205, label: 'analitica_agent', sub: 'Agent · 3.8-flash', tone: 'model' },
  { id: 'otro', x: 530, y: 280, label: 'otro()', sub: 'función', tone: 'tool', fn: true },
  { id: 'review', x: 730, y: 130, label: 'supervisor_review', sub: 'RequestInput', tone: 'guard', fn: true },
  { id: 'end', x: 870, y: 165, label: 'fin', tone: 'system', fn: true },
]
const EDGES: { from: string; to: string; label?: string }[] = [
  { from: 'start', to: 'triage' },
  { from: 'triage', to: 'route' },
  { from: 'route', to: 'pedidos', label: 'PEDIDOS' },
  { from: 'route', to: 'devoluciones', label: 'DEVOLUCIONES' },
  { from: 'route', to: 'analitica', label: 'ANALITICA' },
  { from: 'route', to: 'otro', label: 'OTRO' },
  { from: 'devoluciones', to: 'review' },
  { from: 'review', to: 'end' },
  { from: 'pedidos', to: 'end' },
  { from: 'analitica', to: 'end' },
  { from: 'otro', to: 'end' },
]
const NW = 130
const NH = 40

function GraphSvg({ on, edgesOn, paused }: { on: string[]; edgesOn: string[]; paused?: string }) {
  const byId = new Map(NODES.map((n) => [n.id, n]))
  return (
    <svg className="wf-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafo del workflow: START, triage, route, especialistas, revisión y fin">
      {EDGES.map((e) => {
        const a = byId.get(e.from)!
        const b = byId.get(e.to)!
        const x1 = a.x + NW / 2
        const x2 = b.x - NW / 2
        const mx = (x1 + x2) / 2
        const d = `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`
        const active = edgesOn.includes(`${e.from}>${e.to}`)
        return (
          <g key={`${e.from}-${e.to}`}>
            <path d={d} className={`wf-edge${active ? ' is-on' : ''}`} />
            <polygon points={`${x2},${b.y} ${x2 - 8},${b.y - 4} ${x2 - 8},${b.y + 4}`} className={`wf-arrow${active ? ' is-on' : ''}`} />
            {e.label && (
              <text x={x2 - 6} y={b.y - 7} textAnchor="end" className={`wf-edge-label${active ? ' is-on' : ''}`}>
                {e.label}
              </text>
            )}
          </g>
        )
      })}
      {NODES.map((n) => (
        <g key={n.id} className={`wf-node${n.fn ? ' is-fn' : ''}${on.includes(n.id) ? ' is-on' : ''}${paused === n.id ? ' is-paused' : ''}`} data-tone={n.tone} style={{ ['--tone' as string]: toneVar(n.tone) }}>
          <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={n.fn ? 20 : 9} />
          <text x={n.x} y={n.sub ? n.y - 2 : n.y + 4} textAnchor="middle">
            {n.label}
          </text>
          {n.sub && (
            <text x={n.x} y={n.y + 12} textAnchor="middle" className="sub">
              {n.sub}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

const CODE_LINES: Record<string, string[]> = {
  start: ['("START", triage, route)'],
  triage: ['triage = Agent('],
  route: ['def route(node_input', 'return Event(route=label'],
  specialist: ['(route, {"PEDIDOS"'],
  review: ['async def supervisor_review', 'reply = yield RequestInput('],
  end: ['yield Event(message='],
}

export function GraphLab() {
  const [scenario, setScenario] = useState<GraphScenario>('devoluciones')
  const steps = useMemo(() => graphSteps(scenario), [scenario])
  const player = usePlayer(steps.length, { interval: (i) => (steps[i]?.pause ? 999999 : 3800) })
  const [decision, setDecision] = useState<'si' | 'no' | null>(null)
  useEffect(() => {
    player.reset()
    setDecision(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])
  const step = Math.min(player.step, steps.length - 1)
  const s = steps[step]
  const sc = GRAPH_SCENARIOS[scenario]
  const hl = s.nodes.flatMap((n) => CODE_LINES[['pedidos', 'devoluciones', 'analitica', 'otro'].includes(n) ? 'specialist' : n] ?? [])
  const finalMsg = s.final ? (scenario === 'devoluciones' ? (decision === 'no' ? 'Devolución rechazada por supervisor.' : 'Devolución aprobada por supervisor.') : sc.result) : null

  return (
    <Lab title="Workflow en grafo: triage → route() → especialista → (supervisor)" hint="Elige un mensaje y reproduce">
      <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
        <Segmented
          options={[
            { value: 'pedidos', label: 'Pedido' },
            { value: 'devoluciones', label: 'Devolución grande' },
            { value: 'analitica', label: 'Reporte interno' },
          ]}
          value={scenario}
          onChange={setScenario}
        />
        <Pill tone="user">"{sc.message}"</Pill>
      </div>
      <PlayerBar player={player} labels={steps.map((x) => x.title)} />
      <GraphSvg on={s.nodes} edgesOn={s.edges} paused={s.pause ? 'review' : undefined} />
      <div className="wf-split">
        <div className="stack">
          <Narration steps={steps} step={step} />
          {s.pause && (
            <div className="wf-pause anim-in">
              <div className="label" style={{ color: 'var(--c-guard)' }}>
                RequestInput · invocación pausada
              </div>
              <div className="q">Un supervisor debe revisar esta devolución. ¿Aprobar? (sí/no)</div>
              <div className="small mono muted">payload: {JSON.stringify({ refund_summary: sc.result })}</div>
              <div className="row">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setDecision('si')
                    player.next()
                  }}
                >
                  Aprobar (sí)
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setDecision('no')
                    player.next()
                  }}
                >
                  Rechazar (no)
                </button>
              </div>
            </div>
          )}
          {finalMsg && (
            <Panel title="Respuesta al usuario" tone="ok">
              <div className="anim-in">{finalMsg}</div>
            </Panel>
          )}
        </div>
        <Code code={CODE_GRAPH} lang="python" title="examples/andes_workflow/graph.py" highlight={linesOf(CODE_GRAPH, ...hl)} dim maxHeight={420} />
      </div>
    </Lab>
  )
}
