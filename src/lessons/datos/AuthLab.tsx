import { useState } from 'react'
import { Bot, Cloud, Database, Laptop, Lock, Server, Wrench } from 'lucide-react'
import { Lab, Segmented } from '../../components/ui'
import { FlowDiagram, type FlowEdge, type FlowNode } from '../../components/Flow'

type Mode = 'local' | 'prod'

const LOCAL_NODES: FlowNode[] = [
  { id: 'adk', x: 130, y: 90, w: 170, h: 66, label: 'adk web', sub: 'tu laptop', tone: 'model', icon: Laptop, cls: 'is-local' },
  { id: 'tb', x: 430, y: 90, w: 170, h: 66, label: 'Toolbox', sub: 'Docker · :5000', tone: 'tool', icon: Wrench, cls: 'is-local' },
  { id: 'o', x: 730, y: 40, w: 170, label: 'orders-db', sub: 'Postgres · Docker :5432', tone: 'data', icon: Database, cls: 'is-local' },
  { id: 'e', x: 730, y: 150, w: 170, label: 'erp-db', sub: 'Postgres · Docker :5433', tone: 'data', icon: Database, cls: 'is-local' },
]
const LOCAL_EDGES: FlowEdge[] = [
  { from: 'adk', to: 'tb', label: 'http, sin auth' },
  { from: 'tb', to: 'o', label: 'user/password' },
  { from: 'tb', to: 'e', label: 'user/password' },
]

const PROD_NODES: FlowNode[] = [
  { id: 'adk', x: 120, y: 130, w: 190, h: 70, label: 'andes_ops', sub: 'Agent Runtime · Agent Identity', tone: 'model', icon: Bot },
  { id: 'tb', x: 460, y: 130, w: 200, h: 70, label: 'Toolbox', sub: 'Cloud Run (sidecar o servicio)', tone: 'tool', icon: Wrench },
  { id: 'cs', x: 800, y: 40, w: 190, label: 'Cloud SQL', sub: 'pedidos · IAM auth', tone: 'data', icon: Database },
  { id: 'erp', x: 800, y: 130, w: 190, label: 'ERP Postgres', sub: 'on-prem · VPN / Interconnect', tone: 'data', icon: Server, cls: 'is-outside', badge: 'fuera' },
  { id: 'bq', x: 800, y: 220, w: 190, label: 'BigQuery', sub: 'ventas · ADC', tone: 'data', icon: Cloud },
  { id: 'sm', x: 460, y: 260, w: 200, label: 'Secret Manager', sub: 'credencial del ERP', tone: 'guard', icon: Lock },
]
const PROD_EDGES: FlowEdge[] = [
  { from: 'adk', to: 'tb', label: 'ID token' },
  { from: 'tb', to: 'cs', label: 'IAM' },
  { from: 'tb', to: 'erp', label: 'VPN', dashed: true },
  { from: 'tb', to: 'bq', label: 'ADC' },
  { from: 'sm', to: 'tb', dashed: true },
]

export function AuthLab() {
  const [mode, setMode] = useState<Mode>('prod')
  const [flow, setFlow] = useState(0)
  const flows = mode === 'local' ? [['adk>tb'], ['tb>o'], ['tb>e']] : [['adk>tb'], ['tb>cs'], ['tb>erp', 'sm>tb'], ['tb>bq']]
  return (
    <Lab title="Quién se autentica con quién" hint="Cambia local / producción y haz clic en una conexión">
      <div className="row" style={{ marginBottom: 10 }}>
        <Segmented
          options={[
            { value: 'local', label: 'Local (Docker)' },
            { value: 'prod', label: 'Producción (Google Cloud)' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setFlow(0)
          }}
        />
        <div className="row" style={{ gap: 4 }}>
          {flows.map((_, i) => (
            <button key={i} className={`btn btn-sm${i === flow ? ' btn-primary' : ''}`} onClick={() => setFlow(i)}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <FlowDiagram
        key={mode}
        nodes={mode === 'local' ? LOCAL_NODES : PROD_NODES}
        edges={mode === 'local' ? LOCAL_EDGES : PROD_EDGES}
        width={960}
        height={mode === 'local' ? 200 : 320}
        flows={flows[flow]}
        ariaLabel="Autenticación entre el agente, Toolbox y las bases de datos"
      />
      <div className="datos-auth" style={{ marginTop: 10 }}>
        {mode === 'local' ? (
          <ul>
            <li>
              <strong>1 · ADK → Toolbox</strong>: HTTP sin autenticación en <code>127.0.0.1:5000</code>. Solo para desarrollo.
            </li>
            <li>
              <strong>2 · 3 · Toolbox → Postgres</strong>: usuario y contraseña de <code>compose.yaml</code>, inyectados en el YAML con{' '}
              <code>${'{ORDERS_DB_PASSWORD}'}</code>. El agente nunca los ve.
            </li>
          </ul>
        ) : (
          <ul>
            <li>
              <strong>1 · Agente → Toolbox</strong>: <code>CredentialStrategy.workload_identity(target_audience=TOOLBOX_URL)</code>. El agente firma con su
              propia identidad (Agent Identity / cuenta de servicio) y Toolbox verifica el token. Nada de API keys en el código.
            </li>
            <li>
              <strong>2 · Toolbox → Cloud SQL</strong>: autenticación IAM de la identidad del servicio: sin contraseña que rotar ni filtrar.
            </li>
            <li>
              <strong>3 · Toolbox → ERP on-prem</strong>: IP privada por VPN o Interconnect; la credencial vive en Secret Manager y entra como variable de
              entorno. Es el único salto con contraseña, y lo da un solo componente.
            </li>
            <li>
              <strong>4 · Toolbox → BigQuery</strong>: ADC de la identidad del servicio con <code>roles/bigquery.dataViewer</code> + <code>jobUser</code> sobre
              el dataset.
            </li>
          </ul>
        )}
      </div>
    </Lab>
  )
}
