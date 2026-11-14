import { Bot, Brain, Database, Server, User, Wrench } from 'lucide-react'
import { Lab } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { EventList } from '../../components/Events'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { Narration, PlayerBar } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { STOCK_EVENTS, STOCK_SQL, STOCK_STEPS } from './data'

const NODES: FlowNode[] = [
  { id: 'user', x: 80, y: 170, w: 120, label: 'Operador', sub: 'adk web', tone: 'user', icon: User, cls: 'is-local' },
  { id: 'agent', x: 300, y: 170, w: 170, h: 70, label: 'andes_ops', sub: 'ADK · ToolboxToolset', tone: 'model', icon: Bot },
  { id: 'gemini', x: 300, y: 40, w: 150, label: 'Gemini', sub: 'gemini-3.8-flash', tone: 'model', icon: Brain },
  { id: 'toolbox', x: 560, y: 170, w: 160, h: 70, label: 'MCP Toolbox', sub: 'tools.yaml · :5000', tone: 'tool', icon: Wrench },
  { id: 'erp', x: 830, y: 170, w: 180, h: 70, label: 'ERP Postgres', sub: 'on-prem (fuera)', tone: 'data', icon: Server, cls: 'is-outside', badge: 'fuera' },
  { id: 'cloudsql', x: 830, y: 50, w: 180, label: 'Cloud SQL', sub: 'pedidos', tone: 'data', icon: Database },
  { id: 'bq', x: 830, y: 290, w: 180, label: 'BigQuery', sub: 'ventas', tone: 'data', icon: Database },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'agent' },
  { from: 'agent', to: 'gemini' },
  { from: 'agent', to: 'toolbox', label: 'MCP' },
  { from: 'toolbox', to: 'erp', label: 'SQL' },
  { from: 'toolbox', to: 'cloudsql', dashed: true },
  { from: 'toolbox', to: 'bq', dashed: true },
]

export function StockLab() {
  const player = usePlayer(STOCK_STEPS.length, { interval: 4000 })
  const s = STOCK_STEPS[player.step]
  return (
    <Lab title="Paso a paso: «¿Hay stock de MOCH-30L-AZ?»" hint="Reproduce o salta de paso">
      <PlayerBar player={player} labels={STOCK_STEPS.map((x) => x.title)} />
      <div style={{ marginTop: 10 }}>
        <FlowDiagram nodes={NODES} edges={EDGES} width={960} height={350} flows={s.flows} active={s.active} ariaLabel="Agente, MCP Toolbox y las tres bases de datos" />
      </div>
      <div className="datos-stock">
        <div className="stack">
          <Narration steps={STOCK_STEPS} step={player.step} />
          <Code code={STOCK_SQL} lang="sql" title="Lo que ejecuta Toolbox en el ERP" highlight={s.sqlHl ? linesOf(STOCK_SQL, ...s.sqlHl) : []} dim={!!s.sqlHl} lineNumbers={false} />
        </div>
        <EventList events={STOCK_EVENTS} upTo={s.upTo} highlight={s.upTo - 1} showTiming showUsage />
      </div>
    </Lab>
  )
}
