import { useState } from 'react'
import { Lab, Panel, Pill } from '../../components/ui'
import { StateView } from '../../components/Events'

/* Qué pasa con cada prefijo del estado cuando corren herramientas, termina
   la invocación o empieza otra sesión del mismo usuario (adk.dev/sessions/state). */

type State = Record<string, unknown>

const INITIAL: State = { 'user:name': 'Camila', 'user:customer_id': 'cus_7781', 'app:refund_max_clp': 50000 }

export function StateLab() {
  const [state, setState] = useState<State>(INITIAL)
  const [changed, setChanged] = useState<string[]>([])
  const [log, setLog] = useState<string[]>([])
  const [session, setSession] = useState(1)

  const apply = (delta: State, removeKeys: string[], msg: string) => {
    setState((s) => {
      const next = { ...s }
      removeKeys.forEach((k) => delete next[k])
      Object.assign(next, delta)
      return next
    })
    setChanged([...Object.keys(delta)])
    setLog((l) => [msg, ...l].slice(0, 8))
  }

  return (
    <Lab title="ToolContext.state y los prefijos" hint="Ejecuta acciones y mira qué sobrevive" footer={<span className="small muted">Persistencia real con VertexAiSessionService o DatabaseSessionService; con InMemorySessionService todo se pierde al reiniciar el proceso.</span>}>
      <div className="herr-state-grid">
        <div className="stack">
          <div className="herr-state-btns">
            <button className="btn" onClick={() => apply({ last_order_id: '4821' }, [], 'get_order_status("4821") → tool_context.state["last_order_id"] = "4821"')}>
              <span>
                Ejecutar get_order_status("4821") <span className="muted">→ escribe last_order_id</span>
              </span>
            </button>
            <button className="btn" onClick={() => apply({ 'temp:last_refund_id': 'rf_4790_2210' }, [], 'request_refund(...) → tool_context.state["temp:last_refund_id"] = "rf_4790_2210"')}>
              <span>
                Ejecutar request_refund(...) <span className="muted">→ escribe temp:last_refund_id</span>
              </span>
            </button>
            <button className="btn" onClick={() => apply({ 'user:preferred_carrier': 'AndesExpress' }, [], 'callback → tool_context.state["user:preferred_carrier"] = "AndesExpress"')}>
              <span>
                Guardar preferencia del usuario <span className="muted">→ user:preferred_carrier</span>
              </span>
            </button>
            <button className="btn" onClick={() => apply({}, Object.keys(state).filter((k) => k.startsWith('temp:')), 'Termina la invocación: las claves temp: se descartan')}>
              <span>
                Terminar la invocación <span className="muted">→ se descarta temp:</span>
              </span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSession((n) => n + 1)
                apply(
                  {},
                  Object.keys(state).filter((k) => !k.startsWith('user:') && !k.startsWith('app:')),
                  'Nueva sesión del mismo user_id: sobreviven user: y app:; se pierden las claves sin prefijo y temp:',
                )
              }}
            >
              <span>Nueva sesión de Camila (conserva user: y app:)</span>
            </button>
          </div>
          <Panel title="Qué pasó" tone="system">
            <div className="herr-log">
              {log.length === 0 && <span className="muted">Todavía nada.</span>}
              {log.map((l, i) => (
                <div key={`${i}-${l}`}>› {l}</div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="stack">
          <div className="herr-legend small">
            <span>
              <Pill tone="data" mono>
                sesión #{session}
              </Pill>
            </span>
            <span>
              <Pill tone="memory" mono>
                user:
              </Pill>{' '}
              todas las sesiones del usuario
            </span>
            <span>
              <Pill tone="system" mono>
                app:
              </Pill>{' '}
              todos los usuarios
            </span>
            <span>
              <Pill tone="guard" mono>
                temp:
              </Pill>{' '}
              solo esta invocación
            </span>
            <span>
              <Pill tone="data" mono>
                sin prefijo
              </Pill>{' '}
              solo esta sesión
            </span>
          </div>
          <StateView state={state} changed={changed} />
        </div>
      </div>
    </Lab>
  )
}
