import type { ReactNode } from 'react'
import { ArrowRightLeft, Bot, Database, User, Wrench } from 'lucide-react'
import type { AdkEvent, Part } from '../sim/scenario'

/* ==========================================================================
   Visor de eventos de ADK (lo que verías en la pestaña "Events" de `adk web`
   o iterando `runner.run_async(...)`).

   Cada evento tiene autor (user o nombre de agente) y partes de contenido
   Gemini: text / function_call / function_response. Las acciones
   (state_delta, transfer_to_agent, escalate) viajan en `actions`.
   ========================================================================== */

function PartView({ p }: { p: Part }) {
  if ('text' in p) return <div className="ev-text">{p.text}</div>
  if ('function_call' in p)
    return (
      <div className="ev-block" data-tone="tool">
        <span className="ev-block-label">
          <Wrench size={11} /> function_call · {p.function_call.name}
        </span>
        <code className="ev-code">{JSON.stringify(p.function_call.args)}</code>
      </div>
    )
  return (
    <div className="ev-block" data-tone={p.function_response.response.status === 'error' ? 'error' : 'data'}>
      <span className="ev-block-label">
        <Database size={11} /> function_response · {p.function_response.name}
      </span>
      <code className="ev-code">{JSON.stringify(p.function_response.response)}</code>
    </div>
  )
}

export function eventKind(e: AdkEvent): 'user' | 'call' | 'response' | 'text' | 'transfer' {
  if (e.actions?.transfer_to_agent) return 'transfer'
  if (e.author === 'user') return 'user'
  const p = e.content.parts[0]
  if (p && 'function_call' in p) return 'call'
  if (p && 'function_response' in p) return 'response'
  return 'text'
}

export function EventList({
  events,
  upTo,
  highlight,
  showTiming,
  showUsage,
  maxHeight,
  empty = 'Sin eventos todavía',
}: {
  events: AdkEvent[]
  upTo?: number
  highlight?: number
  showTiming?: boolean
  showUsage?: boolean
  maxHeight?: number
  empty?: ReactNode
}) {
  const n = upTo ?? events.length
  const shown = events.slice(0, n)
  return (
    <div className="evs" style={{ maxHeight, overflowY: maxHeight ? 'auto' : undefined }}>
      {shown.length === 0 && <div className="muted small">{empty}</div>}
      {shown.map((e, i) => {
        const kind = eventKind(e)
        const tone = kind === 'user' ? 'user' : kind === 'call' ? 'tool' : kind === 'response' ? 'data' : kind === 'transfer' ? 'accent' : 'model'
        const Icon = kind === 'user' ? User : kind === 'transfer' ? ArrowRightLeft : Bot
        return (
          <div key={e.id} className={`ev${i === n - 1 ? ' is-new' : ''}${highlight === i ? ' is-hl' : ''}`} data-tone={tone}>
            <div className="ev-head">
              <Icon size={12} /> <span className="ev-author">{e.author}</span>
              {e.partial && <span className="ev-tag">partial</span>}
              {showTiming && e.t !== undefined && <span className="ev-time">+{e.t} ms</span>}
              {showUsage && e.usage && (
                <span className="ev-time">
                  {e.usage.prompt}→{e.usage.candidates} tok
                </span>
              )}
            </div>
            {e.content.parts.map((p, j) => (
              <PartView key={j} p={p} />
            ))}
            {e.actions?.transfer_to_agent && (
              <div className="ev-block" data-tone="accent">
                <span className="ev-block-label">
                  <ArrowRightLeft size={11} /> actions.transfer_to_agent
                </span>
                <code className="ev-code">"{e.actions.transfer_to_agent}"</code>
              </div>
            )}
            {e.actions?.state_delta && Object.keys(e.actions.state_delta).length > 0 && (
              <div className="ev-block" data-tone="memory">
                <span className="ev-block-label">actions.state_delta</span>
                <code className="ev-code">{JSON.stringify(e.actions.state_delta)}</code>
              </div>
            )}
            {e.actions?.escalate && (
              <div className="ev-block" data-tone="guard">
                <span className="ev-block-label">actions.escalate = true</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Estado de sesión con sus prefijos (user: / app: / temp:). */
export function StateView({ state, changed = [], title = 'session.state' }: { state: Record<string, unknown>; changed?: string[]; title?: ReactNode }) {
  const keys = Object.keys(state)
  const scope = (k: string) => (k.startsWith('user:') ? 'user' : k.startsWith('app:') ? 'app' : k.startsWith('temp:') ? 'temp' : 'session')
  const tone = (k: string) => ({ user: 'memory', app: 'system', temp: 'guard', session: 'data' })[scope(k)]
  return (
    <div className="state">
      <div className="state-title">{title}</div>
      {keys.length === 0 && <div className="muted small">{'{}'}</div>}
      {keys.map((k) => (
        <div key={k} className={`state-row${changed.includes(k) ? ' is-changed' : ''}`} data-tone={tone(k)}>
          <span className="state-scope">{scope(k)}</span>
          <span className="state-key">{k}</span>
          <span className="state-val">{JSON.stringify(state[k])}</span>
        </div>
      ))}
    </div>
  )
}

/** Burbujas de chat (lo que ve el usuario), para componer junto a EventList. */
export function ChatBubbles({ items, typing }: { items: { role: 'user' | 'agent'; text: string; name?: string }[]; typing?: boolean }) {
  return (
    <div className="chat">
      {items.map((m, i) => (
        <div key={i} className={`chat-msg is-${m.role}`}>
          {m.role === 'agent' && m.name && <span className="chat-name">{m.name}</span>}
          <div className="chat-bubble">{m.text}</div>
        </div>
      ))}
      {typing && (
        <div className="chat-msg is-agent">
          <div className="chat-bubble chat-typing">
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
    </div>
  )
}
