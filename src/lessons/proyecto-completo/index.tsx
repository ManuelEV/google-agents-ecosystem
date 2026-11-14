import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FileCode2, FileJson2, FileText, Folder } from 'lucide-react'
import { ArchDiagram } from '../../components/Arch'
import { Narration, PlayerBar } from '../../components/Player'
import { Terminal, useTerminalPlayer } from '../../components/Terminal'
import { Callout, Checklist, DocLink, KeyIdeas, Lab, Panel, Pill, Section, Sources } from '../../components/ui'
import { usePlayer } from '../../lib/hooks'
import { ARCH_STAGES } from '../../sim/architecture'
import { CHECKLIST, E2E, GROUPS, REPO, RUN_ORDER, SIM_VS_REAL, TERM_RUN, type CheckItem } from './data'
import './lesson.css'

/* ------------------------------------------------------------------------ */
/* Lab 1 · Caso de punta a punta                                             */
/* ------------------------------------------------------------------------ */
function E2ELab() {
  const player = usePlayer(E2E.length, { interval: 4800 })
  const s = E2E[player.step]
  return (
    <Lab title="Una devolución grande, de punta a punta" hint="Reproduce o haz clic en un paso">
      <PlayerBar player={player} labels={E2E.map((x) => x.title)} />
      <ArchDiagram stage={8} dimOld={false} flows={s.flows} active={s.active} legend={false} />
      <div className="pc-e2e">
        <Narration steps={E2E} step={player.step} />
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">evento / registro</span>
          <div className="pc-event anim-fade" key={player.step}>
            {s.event}
          </div>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 2 · Mapa del repositorio                                              */
/* ------------------------------------------------------------------------ */
function iconFor(f: { path: string; dir?: boolean }) {
  if (f.dir) return <Folder size={13} />
  if (f.path.endsWith('.json') || f.path.endsWith('.yaml')) return <FileJson2 size={13} />
  if (f.path.endsWith('.md')) return <FileText size={13} />
  return <FileCode2 size={13} />
}

function RepoLab() {
  const [sel, setSel] = useState(REPO[4].path)
  const f = REPO.find((x) => x.path === sel)!
  return (
    <Lab title="El repositorio examples/, archivo por archivo" hint="Haz clic en un archivo">
      <div className="pc-repo">
        <div className="pc-tree">
          {REPO.map((x) => {
            const parts = x.path.split('/')
            const depth = parts.length - 2
            return (
              <button key={x.path} className={x.path === sel ? 'is-active' : ''} onClick={() => setSel(x.path)} style={{ paddingLeft: 8 + depth * 14 }}>
                {iconFor(x)}
                <span className="dir">{parts.slice(1, -1).join('/')}{parts.length > 2 ? '/' : ''}</span>
                {parts[parts.length - 1]}
              </button>
            )
          })}
        </div>
        <Panel title={f.path} tone={f.lesson ? 'model' : 'system'} bodyStyle={{ fontSize: 14 }}>
          <p style={{ margin: 0, color: 'var(--text-2)' }} className="anim-fade" key={f.path}>
            {f.what}
          </p>
          {f.lesson && (
            <p style={{ margin: '10px 0 0' }} className="small">
              Se vio en la lección <Link to={`/leccion/${f.lesson}`}>«{f.lesson}»</Link>.
            </p>
          )}
        </Panel>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 3 · Orden de ejecución                                                */
/* ------------------------------------------------------------------------ */
function RunLab() {
  const player = useTerminalPlayer(TERM_RUN)
  const phase = useMemo(() => {
    let p = 0
    TERM_RUN.slice(0, player.upTo).forEach((l) => {
      if (l.kind === 'comment') {
        const n = parseInt(l.text, 10)
        if (!Number.isNaN(n)) p = n
      }
    })
    return player.done ? RUN_ORDER.length : Math.max(0, p - 1)
  }, [player.upTo, player.done])
  return (
    <Lab title="Correrlo todo, en orden" hint="Pulsa ▶">
      <div className="pc-run">
        <Terminal lines={TERM_RUN} upTo={player.upTo} typed={player.typed} player={player} title="bash · examples/" maxHeight={480} />
        <Panel title="Pasos" tone="system">
          <Checklist items={RUN_ORDER} current={phase} />
        </Panel>
      </div>
    </Lab>
  )
}

/* ------------------------------------------------------------------------ */
/* Lab 4 · Checklist de producción                                           */
/* ------------------------------------------------------------------------ */
function ProdChecklist() {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(CHECKLIST.map((c) => [c.id, !!c.done])))
  const total = CHECKLIST.length
  const done = CHECKLIST.filter((c) => on[c.id]).length
  const toggle = (c: CheckItem) => setOn((o) => ({ ...o, [c.id]: !o[c.id] }))
  return (
    <Lab
      title="Checklist de producción"
      hint="Marca lo que ya cubre tu agente"
      footer={
        <div className="row">
          <span className="small muted">
            {done}/{total} · lo marcado de partida es lo que ya hace <code>examples/andes_prod</code>; el resto lo decides con tu organización.
          </span>
          <div className="pc-meter">
            <span style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      }
    >
      <div className="pc-check-groups">
        {GROUPS.map((g) => (
          <Panel key={g.id} title={`${g.label} · ${CHECKLIST.filter((c) => c.group === g.id && on[c.id]).length}/${CHECKLIST.filter((c) => c.group === g.id).length}`} tone={g.id === 'seguridad' ? 'guard' : g.id === 'fiabilidad' ? 'data' : g.id === 'costo' ? 'tool' : 'model'}>
            {CHECKLIST.filter((c) => c.group === g.id).map((c) => (
              <label key={c.id} className={`pc-check${on[c.id] ? ' is-on' : ''}`}>
                <input type="checkbox" checked={!!on[c.id]} onChange={() => toggle(c)} />
                <span>
                  {c.text}
                  {c.done && <span className="tag">en examples/</span>}
                </span>
              </label>
            ))}
          </Panel>
        ))}
      </div>
    </Lab>
  )
}

export default function Lesson() {
  return (
    <>
      <Section n={1} title="La arquitectura terminada">
        <p>
          Ocho etapas, ocho lecciones. Lo que empezó como un <code>Agent</code> con una función hoy es un sistema con sub-agentes, bases de datos dentro y
          fuera de Google, memoria por usuario, identidad propia, guardrails, trazas, evaluación en CI y una galería donde los empleados lo encuentran.
          Haz clic en cualquier pieza para volver a su lección.
        </p>
        <ArchDiagram stage={8} dimOld={false} />
        <div className="row small" style={{ marginTop: 8 }}>
          {ARCH_STAGES.map((s) => (
            <Link key={s.stage} to={`/leccion/${s.lesson}`} className="pill" data-tone="system" style={{ textDecoration: 'none' }}>
              {s.stage} · {s.title}
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 18 }}>
          Para ver cómo encaja todo, sigue un caso difícil: una devolución que supera el umbral de aprobación automática. Cada paso muestra qué pieza
          actúa y qué evento deja.
        </p>
        <E2ELab />
      </Section>

      <Section n={2} title="El repositorio">
        <p>
          Todo el código del tutorial está en <code>examples/</code>: cuatro agentes que crecen uno sobre otro (<code>andes_hello</code> →{' '}
          <code>andes_data</code> → <code>andes_workflow</code> → <code>andes_prod</code>), más datos compartidos, Docker para el Postgres "externo", el
          evalset y los scripts de despliegue y registro. <code>adk web</code> desde <code>examples/</code> los descubre todos.
        </p>
        <RepoLab />
        <RunLab />
        <Callout tone="tip" title="Empieza sin Google Cloud">
          <code>andes_hello</code> y <code>andes_data</code> (con Docker y <code>tools.local.yaml</code>) corren solo con una <code>GOOGLE_API_KEY</code>. El proyecto de
          Google Cloud lo necesitas a partir de Sessions/Memory Bank, Model Armor y el despliegue.
        </Callout>
      </Section>

      <Section n={3} title="Antes de producción">
        <p>
          La arquitectura de referencia de Google para agentes ADK (Cloud Architecture Center) y la guía de seguridad de ADK se resumen en este checklist.
          No todo aplica a todos: márcalo con tu equipo de seguridad y plataforma.
        </p>
        <ProdChecklist />
      </Section>

      <Section n={4} title="Qué sigue">
        <p>Piezas de la plataforma que el tutorial no cubrió y que son el siguiente paso natural.</p>
        <div className="pc-next">
          <Panel title="Agent Studio" tone="model">
            Prototipar instrucciones, comparar modelos y afinar prompts en la consola antes de llevarlos a código. <DocLink href="https://docs.cloud.google.com/gemini-enterprise-agent-platform/agent-studio">docs</DocLink>
          </Panel>
          <Panel title="RAG Engine y Vector Search" tone="data">
            Grounding sobre documentos propios (políticas de devolución, manuales) como herramienta del agente. <DocLink href="https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/rag-overview">docs</DocLink>
          </Panel>
          <Panel title="Agents CLI" tone="system">
            scaffold → eval → deploy → publish en un solo flujo, con skills para tu asistente de código. <DocLink href="https://google.github.io/agents-cli/">docs</DocLink>
          </Panel>
          <Panel title="Cloud Run o GKE" tone="tool">
            Si necesitas controlar el contenedor: <code>adk deploy cloud_run</code>, Toolbox como sidecar, Agent Gateway "próximamente". <DocLink href="https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run">arquitectura</DocLink>
          </Panel>
          <Panel title="Application Integration" tone="tool">
            Conectores a Salesforce, SAP, ServiceNow… como herramientas del agente. <DocLink href="https://adk.dev/integrations/application-integration/">docs</DocLink>
          </Panel>
          <Panel title="Evaluación simulada" tone="guard">
            Usuarios simulados y rúbricas para conversaciones largas. <DocLink href="https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-simulated">docs</DocLink>
          </Panel>
        </div>
      </Section>

      <Section n={5} title="Qué fue real y qué fue simulado">
        <p>Para que no te lleves una idea equivocada de lo que viste.</p>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Estado</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {SIM_VS_REAL.map((r) => (
                <tr key={r.thing}>
                  <td>{r.thing}</td>
                  <td>
                    <Pill tone={r.status === 'real' ? 'ok' : 'guard'}>{r.status}</Pill>
                  </td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <KeyIdeas
        items={[
          <>
            Un agente de producción en Google es <strong>ADK + Agent Runtime + Sessions/Memory Bank + Toolbox + Model Armor/Identity + evaluación/trazas + Gemini
            Enterprise</strong>; tu código sigue siendo solo el agente.
          </>,
          <>
            Orden: <code>adk web</code> local → datos con Toolbox → <code>adk eval</code> → <code>adk deploy agent_engine</code> → consultar → registrar en Gemini
            Enterprise.
          </>,
          <>Humano en el circuito, identidad propia, SQL parametrizado y trayectorias evaluadas no son opcionales en un agente que toca dinero.</>,
          <>Lo que cambió de nombre volverá a cambiar: ancla tus decisiones en las APIs y los formatos, no en la marca.</>,
        ]}
      />
      <Sources
        items={[
          { label: 'Arquitectura de referencia: sistema de un agente con ADK y Cloud Run', href: 'https://docs.cloud.google.com/architecture/single-agent-ai-system-adk-cloud-run' },
          { label: 'ADK · seguridad y protección', href: 'https://adk.dev/safety/' },
          { label: 'Agent Platform · overview', href: 'https://docs.cloud.google.com/agent-builder/overview' },
          { label: 'Agent Runtime · desplegar un agente', href: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/deploy-an-agent' },
          { label: 'Gemini Enterprise · registrar agentes ADK', href: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent' },
          { label: 'MCP Toolbox for Databases', href: 'https://mcp-toolbox.dev/' },
        ]}
      />
    </>
  )
}
