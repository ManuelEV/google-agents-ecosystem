import { Bot, Database, GitBranch, User, Wrench } from 'lucide-react'
import { Lab, Pill } from '../../components/ui'
import { EventList } from '../../components/Events'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { Narration, PlayerBar } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { DELEGATION_EVENTS, DELEGATION_STEPS } from './data'

const NODES: FlowNode[] = [
  { id: 'user', x: 80, y: 150, w: 110, label: 'Camila', sub: 'usuario', tone: 'user', icon: User },
  { id: 'root', x: 290, y: 150, w: 170, h: 66, label: 'andes_ops', sub: 'gemini-4-hydrogen', tone: 'model', icon: Bot },
  { id: 'orders', x: 540, y: 50, w: 160, label: 'pedidos_agent', sub: 'mode="task"', tone: 'model', icon: GitBranch },
  { id: 'returns', x: 540, y: 150, w: 160, label: 'devoluciones_agent', sub: 'mode="task"', tone: 'model', icon: GitBranch },
  { id: 'analytics', x: 540, y: 250, w: 160, label: 'analitica_agent', sub: 'mode="task"', tone: 'model', icon: GitBranch },
  { id: 'toolbox', x: 790, y: 100, w: 150, label: 'get_order', sub: 'MCP Toolbox', tone: 'data', icon: Database },
  { id: 'refund', x: 790, y: 200, w: 150, label: 'request_refund', sub: 'función Python', tone: 'tool', icon: Wrench },
]
const EDGES: FlowEdge[] = [
  { from: 'user', to: 'root' },
  { from: 'root', to: 'orders', label: 'delegación' },
  { from: 'root', to: 'returns', label: 'delegación' },
  { from: 'root', to: 'analytics', label: 'delegación' },
  { from: 'returns', to: 'toolbox' },
  { from: 'returns', to: 'refund' },
]

export function DelegationLab() {
  const player = usePlayer(DELEGATION_STEPS.length, { interval: 4200 })
  const s = DELEGATION_STEPS[player.step]
  return (
    <Lab title="Delegación por descripción: devolver el pedido 4790" hint="Reproduce o haz clic en un paso" footer={<span className="small muted">Eventos simulados con el formato real de ADK. Los argumentos de las herramientas de delegación (<code>devoluciones_agent</code>, <code>finish_task</code>) que inyecta ADK están simplificados.</span>}>
      <PlayerBar player={player} labels={DELEGATION_STEPS.map((x) => x.title)} />
      <div className="wf-tree-user" style={{ marginTop: 10 }}>
        <Pill tone="model" mono>
          raíz: gemini-4-hydrogen
        </Pill>
        <Pill tone="model" mono>
          sub-agentes: gemini-3.8-flash
        </Pill>
        <Pill tone="accent" mono>
          activo: {s.active.join(', ')}
        </Pill>
      </div>
      <FlowDiagram nodes={NODES} edges={EDGES} width={900} height={310} active={s.active} flows={s.flows} dimInactive ariaLabel="Árbol de agentes: coordinador y tres sub-agentes" />
      <div className="wf-split" style={{ marginTop: 12 }}>
        <Narration steps={DELEGATION_STEPS} step={player.step} />
        <EventList events={DELEGATION_EVENTS} upTo={s.upTo} showUsage maxHeight={420} />
      </div>
    </Lab>
  )
}
