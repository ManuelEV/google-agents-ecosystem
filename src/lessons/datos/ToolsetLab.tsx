import { useState } from 'react'
import { Lab, Panel, Pill, Segmented } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { SOURCES, TOOLSETS, TOOLS_YAML } from './data'

const CODE = `# agente interno
db_tools = ToolboxToolset(
    server_url=TOOLBOX_URL,
    toolset_name="andes_ops",
)

# agente de soporte al cliente
db_tools = ToolboxToolset(
    server_url=TOOLBOX_URL,
    toolset_name="andes_support_readonly",
)`

export function ToolsetLab() {
  const [ts, setTs] = useState(TOOLSETS[0].name)
  const set = TOOLSETS.find((t) => t.name === ts)!
  return (
    <Lab title="Un YAML, varios agentes: toolsets" hint="Cambia de agente">
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented options={TOOLSETS.map((t) => ({ value: t.name, label: t.agent }))} value={ts} onChange={setTs} />
        <Pill tone="tool" mono>
          toolset_name="{set.name}"
        </Pill>
      </div>
      <div className="datos-toolset">
        <Panel title="Herramientas que ve este agente" tone="tool">
          <div className="stack" style={{ gap: 6 }}>
            {TOOLS_YAML.map((t) => {
              const on = set.tools.includes(t.name)
              return (
                <div key={t.name} className={`datos-tool-row${on ? '' : ' is-off'}`}>
                  <span className="mono">{t.name}</span>
                  <span className="src">{SOURCES[t.source].name}</span>
                </div>
              )
            })}
          </div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            {set.why}
          </p>
        </Panel>
        <Code code={CODE} lang="python" title="ToolboxToolset(toolset_name=...)" highlight={linesOf(CODE, `"${set.name}"`)} lineNumbers={false} />
      </div>
    </Lab>
  )
}
