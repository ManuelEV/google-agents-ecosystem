import { useMemo, useState } from 'react'
import { Lab, Pill } from '../../components/ui'
import { Code, linesOf } from '../../components/Code'
import { SOURCES, TOOLS_YAML, TOOLSET_YAML, type SourceType } from './data'

/* Constructor de tools.yaml: elige una fuente y una herramienta y mira el YAML
   real de examples/andes_data/toolbox/tools.yaml que las define. */

const SOURCE_IDS = Object.keys(SOURCES) as SourceType[]

export function YamlLab() {
  const [src, setSrc] = useState<SourceType>('postgres')
  const [tool, setTool] = useState('get_stock')
  const toolsOfSrc = TOOLS_YAML.filter((t) => t.source === src)
  const current = TOOLS_YAML.find((t) => t.name === tool && t.source === src) ?? toolsOfSrc[0]
  const yaml = useMemo(() => `${SOURCES[src].yaml}\n---\n${current.yaml}\n---\n${TOOLSET_YAML}`, [src, current])
  const hl = linesOf(yaml, `name: ${current.name}`, `source: ${SOURCES[src].name}`, 'statement:', '$1', '@days')

  return (
    <Lab title="Constructor de tools.yaml" hint="Elige fuente y herramienta" footer={<span className="small muted">Documentos YAML separados con <code>---</code>; <code>${'{VAR:default}'}</code> toma el valor del entorno. Fragmentos tomados de <code>examples/andes_data/toolbox/tools.yaml</code>.</span>}>
      <div className="datos-yaml">
        <div className="stack">
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              1 · Fuente (kind: source)
            </div>
            <div className="datos-pick">
              {SOURCE_IDS.map((id) => (
                <button
                  key={id}
                  className={id === src ? 'is-active' : ''}
                  data-tone="data"
                  onClick={() => {
                    setSrc(id)
                    setTool(TOOLS_YAML.find((t) => t.source === id)!.name)
                  }}
                >
                  <span className="nm">
                    type: {id} <Pill tone={SOURCES[id].where === 'google' ? 'data' : 'tool'}>{SOURCES[id].where === 'google' ? 'dentro de Google' : 'fuera de Google'}</Pill>
                  </span>
                  <span className="ds">{SOURCES[id].label}</span>
                </button>
              ))}
            </div>
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              {SOURCES[src].note}
            </p>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              2 · Herramienta (kind: tool)
            </div>
            <div className="datos-pick">
              {toolsOfSrc.map((t) => (
                <button key={t.name} className={t.name === current.name ? 'is-active' : ''} data-tone="tool" onClick={() => setTool(t.name)}>
                  <span className="nm">
                    {t.name} · {t.type}
                  </span>
                  <span className="ds">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              3 · Toolsets (kind: toolset)
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Agrupan herramientas para que cada agente cargue solo las suyas. Más abajo verás por qué importa.
            </p>
          </div>
        </div>
        <Code key={`${src}-${current.name}`} code={yaml} lang="yaml" title="tools.yaml (fragmento)" highlight={hl} maxHeight={560} />
      </div>
    </Lab>
  )
}
