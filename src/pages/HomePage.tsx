import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, Pause, Play } from 'lucide-react'
import { ArchDiagram } from '../components/Arch'
import { LESSONS, lessonNumber, lessonsByModule } from '../lessons'
import { MODULES } from '../lessons/modules'
import { useVisited } from '../lib/hooks'
import { ARCH_STAGES } from '../sim/architecture'

export function HomePage() {
  const visited = useVisited()
  const [stage, setStage] = useState(1)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    document.title = 'Google Agents Ecosystem · Agentes en la plataforma de Google'
  }, [])
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setStage((s) => (s % ARCH_STAGES.length) + 1), 2600)
    return () => clearTimeout(t)
  }, [stage, paused])
  const first = LESSONS[0]
  const current = ARCH_STAGES[stage - 1]

  return (
    <div className="home">
      <section className="home-hero">
        <div>
          <div className="eyebrow">Tutorial interactivo · {LESSONS.length} lecciones · 5 módulos · verificado nov-2026</div>
          <h1>
            Construye agentes en la <em>plataforma de Google</em>, paso a paso
          </h1>
          <p className="lead">
            Ya sabes qué es un LLM, RAG, tool calling y MCP. Aquí das el siguiente paso: programar un agente real con <strong>ADK</strong>, conectarlo a bases
            de datos dentro y fuera de Google Cloud, desplegarlo en <strong>Agent Runtime</strong>, protegerlo con <strong>Model Armor</strong> y publicarlo
            en <strong>Gemini Enterprise</strong>. Con consola simulada, terminales animados y el código completo para probarlo en tu proyecto.
          </p>
          <div className="row" style={{ marginTop: 22 }}>
            {first && (
              <Link className="btn btn-primary" to={`/leccion/${first.slug}`} style={{ height: 42, padding: '0 18px', fontSize: 15 }}>
                Empezar por el mapa <ArrowRight size={16} />
              </Link>
            )}
            <Link className="btn" to="/leccion/primer-agente" style={{ height: 42 }}>
              Ir directo al primer agente
            </Link>
            <Link className="btn" to="/leccion/proyecto-completo" style={{ height: 42 }}>
              Ver el proyecto completo
            </Link>
          </div>
        </div>
        <div className="lab" style={{ margin: 0 }}>
          <div className="lab-head">
            <span className="lab-badge">Mapa</span>
            <span className="lab-title">La arquitectura que vas a construir</span>
            <span className="lab-hint">
              <button className="btn btn-ghost btn-sm" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Reproducir' : 'Pausar'}>
                {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Reproducir' : 'Pausar'}
              </button>
            </span>
          </div>
          <div className="lab-body" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <ArchDiagram stage={stage} />
            <div className="row" style={{ marginTop: 10, gap: 6 }}>
              {ARCH_STAGES.map((s) => (
                <button
                  key={s.stage}
                  className={`btn btn-sm${s.stage === stage ? ' btn-primary' : ''}`}
                  onClick={() => {
                    setStage(s.stage)
                    setPaused(true)
                  }}
                  title={s.title}
                >
                  {s.stage}
                </button>
              ))}
              {current && (
                <Link to={`/leccion/${current.lesson}`} className="small" style={{ marginLeft: 'auto' }}>
                  {current.title} →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="module-grid">
        {MODULES.map((m) => (
          <div key={m.id} className="module-card" data-tone={m.tone}>
            <div className="eyebrow">Módulo {m.n}</div>
            <h3>{m.title}</h3>
            <p>{m.description}</p>
            <ol>
              {lessonsByModule(m.id).map((l) => (
                <li key={l.slug}>
                  <Link to={`/leccion/${l.slug}`}>
                    <span className="n">{String(lessonNumber(l.slug)).padStart(2, '0')}</span>
                    <span className="t">
                      {l.title} {visited.includes(l.slug) && <CheckCircle2 size={13} className="check" style={{ verticalAlign: '-2px' }} />}
                    </span>
                    <span className="m">{l.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <section className="home-about">
        <h2>Cómo está hecho este tutorial</h2>
        <div className="grid-3">
          <div className="panel">
            <div className="panel-head">Escenario</div>
            <div className="panel-body small">
              <strong>Andes Market</strong>, un retail online chileno ficticio, y su agente de operaciones <strong>Andi</strong>: pedidos en Cloud SQL,
              inventario en un Postgres on-prem, ventas en BigQuery, un transportista con API externa y un supervisor que aprueba reembolsos.
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">Qué es real y qué es simulado</div>
            <div className="panel-body small">
              Comandos, APIs, nombres de productos, formatos de eventos y precios: <strong>reales</strong>, verificados en la documentación oficial en
              noviembre de 2026. Las pantallas de la consola, las salidas del terminal y las respuestas del modelo: <strong>simuladas</strong>.
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">Código para probar</div>
            <div className="panel-body small">
              La carpeta <code>examples/</code> del repositorio tiene los cuatro proyectos ADK completos (Python ≥ 3.11), el <code>tools.yaml</code> de MCP
              Toolbox, el Postgres "externo" en Docker, el evalset y los scripts de despliegue y registro.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
