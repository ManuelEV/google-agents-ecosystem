import { Bot, Brain, Plug, Truck } from 'lucide-react'
import { Lab, Panel } from '../../components/ui'
import { Code } from '../../components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'
import { Narration, PlayerBar } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { MCP_STEPS } from './data'

const NODES: FlowNode[] = [
  { id: 'gemini', x: 130, y: 60, w: 170, label: 'Gemini', sub: 'modelo', tone: 'model', icon: Brain },
  { id: 'adk', x: 130, y: 220, w: 190, h: 70, label: 'ADK · andes_ops', sub: 'McpToolset (cliente)', tone: 'model', icon: Bot },
  { id: 'mcp', x: 470, y: 220, w: 200, h: 70, label: 'Servidor MCP', sub: 'FastMCP · :8081/mcp', tone: 'tool', icon: Plug, cls: 'is-outside', badge: 'fuera' },
  { id: 'api', x: 790, y: 220, w: 190, h: 70, label: 'API AndesExpress', sub: 'REST del transportista', tone: 'data', icon: Truck, cls: 'is-outside', badge: 'fuera' },
]
const EDGES: FlowEdge[] = [
  { from: 'adk', to: 'gemini', label: 'function calling' },
  { from: 'adk', to: 'mcp', label: 'JSON-RPC' },
  { from: 'mcp', to: 'api', label: 'HTTPS', dashed: true },
]

export function McpLab() {
  const player = usePlayer(MCP_STEPS.length, { interval: 4200 })
  const s = MCP_STEPS[player.step]
  return (
    <Lab
      title="Del McpToolset al function_response: un turno completo"
      hint="Reproduce o salta de paso"
      footer={<span className="small muted">Secuencia simplificada: se omiten la negociación de capacidades, la notificación initialized y los headers de sesión de Streamable HTTP.</span>}
    >
      <PlayerBar player={player} labels={MCP_STEPS.map((x) => x.title)} />
      <div style={{ marginTop: 10 }}>
        <FlowDiagram nodes={NODES} edges={EDGES} width={900} height={300} flows={s.flows} active={s.active ?? []} ariaLabel="ADK, servidor MCP del transportista y API externa" />
      </div>
      <div className="herr-mcp-grid">
        <Narration steps={MCP_STEPS} step={player.step} />
        <div className="anim-fade" key={player.step}>
          {s.lang === 'text' ? (
            <Panel title={s.codeTitle} tone="model">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{s.code}</div>
            </Panel>
          ) : (
            <Code code={s.code} lang={s.lang} title={s.codeTitle} maxHeight={360} lineNumbers={false} />
          )}
        </div>
      </div>
    </Lab>
  )
}
