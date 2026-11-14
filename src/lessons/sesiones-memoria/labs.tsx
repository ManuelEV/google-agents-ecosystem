import { useMemo, useState, type ReactNode } from 'react'
import { Callout, Lab, Pill, Segmented, Toggle } from '../../components/ui'
import { Code, Json, linesOf } from '../../components/Code'
import { EventList, StateView } from '../../components/Events'
import { Narration, PlayerBar } from '../../components/Player'
import { usePlayer } from '../../lib/hooks'
import { CUSTOMER } from '../../sim/scenario'
import { CODE_ADK_WEB, CONV1_EVENTS, CONV2_EVENTS, MEMORY_OBJECTS, MEMORY_STEPS, SCOPES, SCOPE_PRESETS, SERVICES, TEMPLATE_INSTRUCTION, type Scope, type ServiceId } from './data'

/* ------------------------------ Lab 1 · prefijos ------------------------------ */

type Entry = { key: string; value: unknown }

const scopeOf = (k: string): Scope => (k.startsWith('user:') ? 'user' : k.startsWith('app:') ? 'app' : k.startsWith('temp:') ? 'temp' : 'session')

function visibleIn(k: string, box: 'current' | 'other-session' | 'other-user' | 'after') {
  const s = scopeOf(k)
  if (box === 'current') return true
  if (box === 'other-session') return s === 'user' || s === 'app'
  if (box === 'other-user') return s === 'app'
  return s !== 'temp'
}

export function PrefixLab() {
  const [scope, setScope] = useState<Scope>('user')
  const [name, setName] = useState('preferred_delivery')
  const [value, setValue] = useState('retiro_en_tienda')
  const [entries, setEntries] = useState<Entry[]>(SCOPE_PRESETS.slice(0, 1))

  const add = () => {
    const key = SCOPES[scope].prefix + name.trim().replace(/^(user:|app:|temp:)/, '')
    if (!name.trim()) return
    const v: unknown = /^\d+$/.test(value) ? Number(value) : value
    setEntries((e) => [...e.filter((x) => x.key !== key), { key, value: v }])
  }
  const pick = (k: string) => Object.fromEntries(entries.filter((e) => visibleIn(e.key, k as never)).map((e) => [e.key, e.value]))
  const last = entries[entries.length - 1]?.key
  const boxes: { id: 'current' | 'other-session' | 'other-user' | 'after'; title: string; sub: string }[] = [
    { id: 'current', title: 'Esta sesión, esta invocación', sub: `session_id f1c9… · user ${CUSTOMER.id}` },
    { id: 'after', title: 'Esta sesión, siguiente turno', sub: 'temp: ya se descartó' },
    { id: 'other-session', title: 'Otra sesión de Camila', sub: `mismo user_id · otra conversación` },
    { id: 'other-user', title: 'Sesión de Tomás', sub: 'otro user_id · misma app' },
  ]
  return (
    <Lab title="¿Dónde vive cada clave? Escribe en el estado y mira quién la ve" hint="Elige un prefijo, escribe y pulsa Guardar">
      <div className="sm-writer">
        <Segmented
          options={[
            { value: 'session', label: 'sin prefijo' },
            { value: 'user', label: 'user:' },
            { value: 'app', label: 'app:' },
            { value: 'temp', label: 'temp:' },
          ]}
          value={scope}
          onChange={(s) => {
            setScope(s)
            const ex = SCOPES[s].example.replace(/^(user:|app:|temp:)/, '')
            setName(ex)
            setValue(String(SCOPE_PRESETS.find((p) => p.key === SCOPES[s].example)?.value ?? ''))
          }}
        />
        <label>
          clave
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          valor
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="btn btn-primary" onClick={add}>
          tool_context.state[…] = …
        </button>
      </div>
      <div className="small muted" style={{ marginBottom: 10 }}>
        <strong>{SCOPES[scope].label}</strong> → {SCOPES[scope].lives} Persiste: {SCOPES[scope].persists}
      </div>
      <div className="sm-boxes">
        {boxes.map((b) => (
          <div key={b.id} className="sm-box">
            <div className="sm-box-title">{b.title}</div>
            <div className="sm-box-sub">{b.sub}</div>
            <StateView state={pick(b.id)} changed={last && visibleIn(last, b.id) ? [last] : []} title="state" />
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => setEntries(SCOPE_PRESETS)}>
          Cargar los cuatro ejemplos
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => setEntries([])}>
          Vaciar
        </button>
      </div>
    </Lab>
  )
}

/* ------------------------------ Lab 2 · templating ------------------------------ */

export function TemplateLab() {
  const [hasName, setHasName] = useState(true)
  const [hasRole, setHasRole] = useState(false)
  const [hasOrder, setHasOrder] = useState(true)
  const state: Record<string, unknown> = {
    ...(hasName ? { 'user:name': 'Camila' } : {}),
    ...(hasRole ? { 'user:role': 'customer' } : {}),
    ...(hasOrder ? { last_order_id: '4821' } : {}),
  }
  const rendered = useMemo(() => {
    const parts: ReactNode[] = []
    const re = /\{([a-zA-Z_:]+)(\?)?\}/g
    let i = 0
    let m: RegExpExecArray | null
    let error: string | null = null
    while ((m = re.exec(TEMPLATE_INSTRUCTION))) {
      parts.push(TEMPLATE_INSTRUCTION.slice(i, m.index))
      const key = m[1]
      const optional = !!m[2]
      if (key in state) parts.push(<span key={m.index} className="inj">{String(state[key])}</span>)
      else if (optional) parts.push(<span key={m.index} className="opt" title="clave ausente, opcional: se inyecta vacío"></span>)
      else {
        parts.push(
          <span key={m.index} className="missing">
            {m[0]}
          </span>,
        )
        error = error ?? `KeyError: context variable not found: '${key}'. Usa {${key}?} si puede faltar.`
      }
      i = m.index + m[0].length
    }
    parts.push(TEMPLATE_INSTRUCTION.slice(i))
    return { parts, error }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasName, hasRole, hasOrder])
  return (
    <Lab title="{clave} y {clave?} en la instrucción" hint="Activa o desactiva claves del estado">
      <div className="sm-split">
        <div className="stack">
          <div className="row">
            <Toggle label="user:name = Camila" checked={hasName} onChange={setHasName} />
            <Toggle label="user:role = customer" checked={hasRole} onChange={setHasRole} />
            <Toggle label="last_order_id = 4821" checked={hasOrder} onChange={setHasOrder} />
          </div>
          <StateView state={state} />
          <Code code={TEMPLATE_INSTRUCTION} lang="text" title="instruction (plantilla)" lineNumbers={false} />
        </div>
        <div className="stack">
          <div className="label">Lo que recibe el modelo antes de cada llamada</div>
          <div className="sm-rendered">{rendered.parts}</div>
          {rendered.error ? (
            <Callout tone="danger" title="La invocación falla">
              <span className="mono small">{rendered.error}</span>
            </Callout>
          ) : (
            <Callout tone="ok" title="Se inyecta sin errores">
              Las claves con <code>?</code> ausentes quedan vacías; el resto se reemplaza por su valor. Las llaves literales (JSON de ejemplo) chocan con
              esta sintaxis: en ese caso pasa una función como <code>instruction</code> (InstructionProvider).
            </Callout>
          )}
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------------ Lab 3 · services ------------------------------ */

export function ServicesLab() {
  const [svc, setSvc] = useState<ServiceId>('vertex')
  const s = SERVICES[svc]
  return (
    <Lab title="El mismo Runner, tres almacenes de sesión" hint="Cambia el servicio">
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented
          options={[
            { value: 'memory', label: 'InMemory' },
            { value: 'database', label: 'Database' },
            { value: 'vertex', label: 'VertexAi (Agent Runtime)' },
          ]}
          value={svc}
          onChange={setSvc}
        />
        <Pill tone={svc === 'vertex' ? 'data' : svc === 'database' ? 'tool' : 'system'} mono>
          {s.name}
        </Pill>
      </div>
      <div className="sm-split">
        <div className="sm-svc anim-fade" key={`info-${svc}`}>
          <div className="r">
            <span className="k">dónde</span>
            <span>{s.where}</span>
          </div>
          <div className="r">
            <span className="k">persiste</span>
            <span>{s.persists}</span>
          </div>
          <div className="r">
            <span className="k">cuándo</span>
            <span>{s.when}</span>
          </div>
          {svc === 'vertex' && (
            <div style={{ marginTop: 8 }}>
              <Code code={CODE_ADK_WEB} lang="bash" title="adk web con Sessions + Memory Bank" lineNumbers={false} />
            </div>
          )}
        </div>
        <Code key={`code-${svc}`} code={s.code} lang="python" title={svc === 'vertex' ? 'examples/andes_prod/README.md · Memory Bank y Sessions en local' : 'Runner + SessionService'} highlight={linesOf(s.code, 'session_service = ')} maxHeight={330} />
      </div>
    </Lab>
  )
}

/* ------------------------------ Lab 4 · Memory Bank ------------------------------ */

export function MemoryBankLab() {
  const player = usePlayer(MEMORY_STEPS.length, { interval: 4300 })
  const s = MEMORY_STEPS[player.step]
  const mems = MEMORY_OBJECTS.slice(0, s.memories ?? 0)
  const [showJson, setShowJson] = useState(false)
  const conv1On = s.phase === 'conv1' || s.phase === 'save' || s.phase === 'generate'
  const conv2On = s.phase === 'conv2' || s.phase === 'answer'
  return (
    <Lab title="Memory Bank: de una conversación a una memoria que cruza sesiones" hint="Reproduce o salta de paso" footer={<span className="small muted">Las memorias y su formato siguen la documentación de Memory Bank; los tiempos y el texto extraído son simulados.</span>}>
      <PlayerBar player={player} labels={MEMORY_STEPS.map((x) => x.title)} />
      <div className="sm-timeline" style={{ marginTop: 12 }}>
        <div className={`sm-conv${conv1On || s.phase === 'later' ? '' : ' is-dim'}${s.phase === 'later' ? ' is-dim' : ''}`}>
          <div className="sm-conv-title">
            <span>Sesión A · lunes</span>
            <Pill tone="user" mono>
              session f1c9…
            </Pill>
          </div>
          <EventList events={CONV1_EVENTS} upTo={s.upTo1 ?? 0} empty="…" maxHeight={300} />
          {s.phase === 'save' && (
            <div className="ev anim-in" data-tone="memory" style={{ marginTop: 8 }}>
              <div className="ev-head">after_agent_callback</div>
              <code className="ev-code">await callback_context.add_session_to_memory()</code>
            </div>
          )}
        </div>
        <div className="stack">
          <div className={`sm-arrow${s.phase === 'save' || s.phase === 'generate' ? ' is-on' : ''}`}>{s.phase === 'generate' ? 'extrayendo…' : 'GenerateMemories →'}</div>
          <div className={`sm-bank${s.phase === 'generate' || s.phase === 'conv2' ? ' is-on' : ''}`}>
            <div className="sm-bank-title">Memory Bank · scope {`{andes_ops, ${CUSTOMER.id}}`}</div>
            {mems.length === 0 && <div className="small muted">sin memorias</div>}
            {mems.map((m) => (
              <div key={m.name} className="sm-mem">
                <div className="fact">{m.fact}</div>
                <div className="nm">{m.name.split('/').slice(-2).join('/')}</div>
              </div>
            ))}
          </div>
          <div className={`sm-arrow${s.phase === 'conv2' ? ' is-on' : ''}`}>{s.phase === 'conv2' ? 'RetrieveMemories →' : '← preload_memory'}</div>
        </div>
        <div className={`sm-conv${conv2On ? '' : ' is-dim'}`}>
          <div className="sm-conv-title">
            <span>Sesión B · tres semanas después</span>
            <Pill tone="user" mono>
              session 9b3e…
            </Pill>
          </div>
          <EventList events={CONV2_EVENTS} upTo={s.upTo2 ?? 0} empty="todavía no empieza" maxHeight={300} />
        </div>
      </div>
      <div className="sm-split" style={{ marginTop: 12 }}>
        <Narration steps={MEMORY_STEPS} step={player.step} />
        <div className="stack">
          <button className="btn btn-sm" onClick={() => setShowJson((v) => !v)}>
            {showJson ? 'Ocultar' : 'Ver'} el objeto memoria real
          </button>
          {showJson && <Json value={MEMORY_OBJECTS[0]} title="Memory (API de Memory Bank)" maxHeight={220} />}
        </div>
      </div>
    </Lab>
  )
}
