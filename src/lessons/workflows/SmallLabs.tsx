import { useMemo, useState } from 'react'
import { BarRow, Callout, Lab, Segmented } from '../../components/ui'
import { fold } from '../../sim/math'
import { DEFAULT_DESCRIPTIONS, MODES, SAMPLE_MESSAGES, type Mode } from './data'

/* ------------------------------ Modos ------------------------------ */
export function ModesLab() {
  const [mode, setMode] = useState<Mode>('task')
  const m = MODES[mode]
  return (
    <Lab title="mode: quién devuelve el control y cuándo" hint="Cambia el modo">
      <div className="row" style={{ marginBottom: 12 }}>
        <Segmented
          options={[
            { value: 'chat', label: 'chat' },
            { value: 'task', label: 'task' },
            { value: 'single_turn', label: 'single_turn' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <span className="small muted">se configura en el sub-agente, nunca en el raíz</span>
      </div>
      <div className="wf-modes anim-fade" key={mode}>
        <div className="wf-mode-row">
          <span className="k">Modo</span>
          <span>
            <strong>{m.title}</strong>
          </span>
        </div>
        <div className="wf-mode-row">
          <span className="k">Interacción</span>
          <span>{m.interaction}</span>
        </div>
        <div className="wf-mode-row">
          <span className="k">Vuelve al padre</span>
          <span>{m.back}</span>
        </div>
        <div className="wf-mode-row">
          <span className="k">Paralelizable</span>
          <span>{m.parallel}</span>
        </div>
        <div className="wf-mode-row">
          <span className="k">Cuándo</span>
          <span>{m.when}</span>
        </div>
        <div className="wf-mode-row">
          <span className="k">Aislamiento</span>
          <span>{mode === 'chat' ? 'Comparte la conversación con el padre.' : 'Corre en su propia rama de la sesión y solo ve sus propios eventos.'}</span>
        </div>
      </div>
    </Lab>
  )
}

/* ------------------------ Editor de descriptions ------------------------ */
const STOP = new Set(['para', 'sobre', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'que', 'con', 'por', 'y', 'o', 'mi', 'me', 'se', 'su', 'en', 'al', 'dentro', 'esta', 'este', 'donde', 'cuando', 'como', 'cuanto', 'quiero', 'necesito'])
const SYN: Record<string, string[]> = {
  devolver: ['devoluciones', 'devolucion', 'reembolsos', 'reembolso'],
  devolucion: ['devoluciones', 'reembolso'],
  reembolsa: ['reembolsos', 'reembolso'],
  llega: ['llega', 'envios', 'envio', 'estado'],
  pedido: ['pedidos', 'pedido'],
  stock: ['stock', 'sku', 'inventario'],
  ventas: ['ventas', 'reporte', 'resumenes'],
  reporte: ['ventas', 'resumenes', 'interno'],
  zapatillas: ['pedidos', 'devoluciones'],
  chicas: ['devoluciones'],
}

function words(s: string) {
  return fold(s)
    .replace(/[^a-z0-9ñ\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

function score(message: string, description: string) {
  const dw = new Set(words(description))
  let n = 0
  for (const w of words(message)) {
    const cands = [w, ...(SYN[w] ?? [])]
    if (cands.some((c) => dw.has(c))) n++
  }
  return n
}

export function DescriptionLab() {
  const [descs, setDescs] = useState(DEFAULT_DESCRIPTIONS)
  const [msg, setMsg] = useState(SAMPLE_MESSAGES[1])
  const scores = useMemo(() => Object.entries(descs).map(([name, d]) => ({ name, s: score(msg, d) })), [descs, msg])
  const max = Math.max(...scores.map((x) => x.s))
  const winners = scores.filter((x) => x.s === max && max > 0)
  const pick = winners.length === 1 ? winners[0].name : null
  return (
    <Lab
      title="Edita las descriptions y mira a quién delega el coordinador"
      hint="Cambia una descripción o el mensaje"
      footer={
        <span className="small muted">
          Simulación honesta: aquí la "decisión" es una heurística de palabras clave. El modelo real razona sobre el significado, pero el principio es el mismo: la description es lo único que el coordinador sabe de cada sub-agente.
        </span>
      }
    >
      <div className="wf-split">
        <div className="wf-desc">
          <label>
            <span className="label">Mensaje del usuario</span>
            <select className="select" value={msg} onChange={(e) => setMsg(e.target.value)}>
              {SAMPLE_MESSAGES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {Object.entries(descs).map(([name, d]) => (
            <label key={name}>
              <span className="nm">{name}.description</span>
              <textarea className="textarea" value={d} onChange={(e) => setDescs((p) => ({ ...p, [name]: e.target.value }))} rows={2} />
            </label>
          ))}
          <button className="btn btn-sm btn-ghost" onClick={() => setDescs(DEFAULT_DESCRIPTIONS)}>
            Restaurar descripciones
          </button>
        </div>
        <div className="stack">
          <div className="wf-decision">
            <span className="label">Decisión del coordinador (simulada)</span>
            <div className="pick" style={{ color: pick ? 'var(--c-model)' : 'var(--c-guard)' }}>
              {pick ? `→ ${pick}` : max === 0 ? 'Ninguna encaja → pide una aclaración' : 'Empate → pide una aclaración'}
            </div>
            {scores.map((x) => (
              <BarRow key={x.name} label={x.name} value={x.s} max={Math.max(3, max)} display={`${x.s} coincidencias`} tone="model" pick={x.name === pick} off={x.s === 0} />
            ))}
          </div>
          <Callout tone="tip" title="Cómo escribir una buena description">
            Qué hace, con qué datos y qué NO hace, en una frase que la distinga de sus pares. Si borras "devoluciones" de devoluciones_agent, el coordinador deja de encontrarla aunque la instruction interna siga perfecta.
          </Callout>
        </div>
      </div>
    </Lab>
  )
}
