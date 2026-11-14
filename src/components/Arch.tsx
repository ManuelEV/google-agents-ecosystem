import { useNavigate } from 'react-router'
import { FlowDiagram } from './Flow'
import { ARCH_EDGES, ARCH_H, ARCH_NODES, ARCH_STAGES, ARCH_W } from '../sim/architecture'

/* Diagrama de la arquitectura objetivo que crece etapa a etapa.
   `stage` = última etapa visible; los nodos de esa etapa entran animados. */
export function ArchDiagram({
  stage,
  flows = [],
  active = [],
  dimOld = true,
  clickable = true,
  legend = true,
}: {
  stage: number
  flows?: string[]
  active?: string[]
  /** atenúa las etapas anteriores para destacar la nueva */
  dimOld?: boolean
  clickable?: boolean
  legend?: boolean
}) {
  const nav = useNavigate()
  const nodes = ARCH_NODES.filter((n) => n.stage <= stage).map((n) => ({
    ...n,
    cls: [n.where === 'outside' ? 'is-outside' : '', n.where === 'local' ? 'is-local' : '', n.stage === stage ? 'is-fresh' : dimOld && stage > 1 ? 'is-old' : ''].filter(Boolean).join(' '),
  }))
  const edges = ARCH_EDGES.filter((e) => e.stage <= stage)
  const current = ARCH_STAGES.find((s) => s.stage === stage)
  return (
    <div className="arch">
      <FlowDiagram
        nodes={nodes}
        edges={edges}
        width={ARCH_W}
        height={ARCH_H}
        flows={flows}
        active={active}
        onNodeClick={
          clickable
            ? (id) => {
                const n = ARCH_NODES.find((x) => x.id === id)
                if (n?.lesson) nav(`/leccion/${n.lesson}`)
              }
            : undefined
        }
        ariaLabel={`Arquitectura del agente de Andes Market, etapa ${stage}: ${current?.title ?? ''}`}
      />
      {legend && (
        <div className="arch-legend small">
          <span>
            <i className="sw sw-google" /> en Google Cloud
          </span>
          <span>
            <i className="sw sw-outside" /> fuera de Google
          </span>
          <span>
            <i className="sw sw-local" /> personas / tu máquina
          </span>
          {current && (
            <span className="arch-stage">
              Etapa {stage}/{ARCH_STAGES.length}: {current.title}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
