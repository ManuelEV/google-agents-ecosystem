import type { CSSProperties, ReactNode } from 'react'
import { Bell, Check, ChevronDown, ChevronRight, HelpCircle, Lock, Menu, MousePointer2, Search, Terminal as TerminalIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PROJECT_ID } from '../sim/scenario'
import type { Tone } from './ui'

/* ==========================================================================
   Consola de Google Cloud SIMULADA.

   Reproduce la estructura (barra superior, selector de proyecto, navegación
   lateral, migas de pan, formularios con botón azul) para que reconozcas la
   pantalla cuando entres a la consola real. Los nombres de menús y campos
   vienen de la documentación oficial de noviembre de 2026; la interfaz real
   puede variar. Nada de lo que hagas aquí toca Google Cloud.

   Para "guiar" al usuario, cualquier campo/botón acepta `focus`: se resalta
   con un anillo pulsante y un cursor, útil en animaciones paso a paso.
   ========================================================================== */

export type ConsoleNavItem = { id: string; label: string; icon?: LucideIcon; children?: { id: string; label: string }[] }

export function GcpConsole({
  title,
  product = 'Agent Platform',
  nav,
  activeNav,
  url,
  project = PROJECT_ID,
  crumbs,
  children,
  height,
  style,
  tabs,
  activeTab,
}: {
  title?: ReactNode
  product?: string
  nav?: ConsoleNavItem[]
  activeNav?: string
  url?: string
  project?: string
  crumbs?: string[]
  children: ReactNode
  height?: number
  style?: CSSProperties
  /** pestañas bajo el título (p. ej. "Agentes · Configuración") */
  tabs?: string[]
  activeTab?: string
}) {
  return (
    <div className="gc" style={style} role="img" aria-label="Simulación de la consola de Google Cloud">
      <div className="gc-url">
        <span className="gc-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="gc-urlbar">
          <Lock size={11} /> console.cloud.google.com/{url ?? 'vertex-ai/agents'}
        </span>
      </div>
      <div className="gc-top">
        <Menu size={18} className="gc-top-icon" />
        <span className="gc-wordmark">
          <span className="g1">G</span>oogle Cloud
        </span>
        <span className="gc-project">
          <span className="gc-project-dot" />
          {project}
          <ChevronDown size={14} />
        </span>
        <span className="gc-search">
          <Search size={14} /> <span>Buscar (/) recursos, documentos, productos y más</span>
        </span>
        <span className="gc-top-right">
          <TerminalIcon size={16} />
          <HelpCircle size={16} />
          <Bell size={16} />
          <span className="gc-avatar">CR</span>
        </span>
      </div>
      <div className="gc-body" style={{ minHeight: height }}>
        {nav && (
          <aside className="gc-nav">
            <div className="gc-nav-product">{product}</div>
            <ul>
              {nav.map((n) => (
                <li key={n.id} className={n.id === activeNav ? 'is-active' : ''}>
                  <span className="gc-nav-item">
                    {n.icon && <n.icon size={15} />}
                    <span>{n.label}</span>
                    {n.children && <ChevronDown size={13} style={{ marginLeft: 'auto' }} />}
                  </span>
                  {n.children && (
                    <ul>
                      {n.children.map((c) => (
                        <li key={c.id} className={c.id === activeNav ? 'is-active' : ''}>
                          <span className="gc-nav-item sub">{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div className="gc-main">
          {crumbs && (
            <div className="gc-crumbs">
              {crumbs.map((c, i) => (
                <span key={i}>
                  {i > 0 && <ChevronRight size={12} />}
                  {c}
                </span>
              ))}
            </div>
          )}
          {title && <h3 className="gc-title">{title}</h3>}
          {tabs && (
            <div className="gc-tabs">
              {tabs.map((t) => (
                <span key={t} className={t === activeTab ? 'is-active' : ''}>
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="gc-content">{children}</div>
        </div>
      </div>
    </div>
  )
}

/** Anillo de atención + cursor: envuelve lo que el paso actual "toca". */
export function Focus({ on, children, label, style }: { on?: boolean; children: ReactNode; label?: string; style?: CSSProperties }) {
  return (
    <span className={`gc-focus${on ? ' is-on' : ''}`} style={style}>
      {children}
      {on && (
        <span className="gc-cursor" aria-hidden>
          <MousePointer2 size={16} />
          {label && <span className="gc-cursor-label">{label}</span>}
        </span>
      )}
    </span>
  )
}

export function ConsoleField({
  label,
  value,
  placeholder,
  hint,
  focus,
  kind = 'text',
  required,
  width,
}: {
  label: ReactNode
  value?: ReactNode
  placeholder?: string
  hint?: ReactNode
  focus?: boolean
  kind?: 'text' | 'select' | 'textarea' | 'code'
  required?: boolean
  width?: number | string
}) {
  return (
    <Focus on={focus} style={{ display: 'block', maxWidth: width }}>
      <label className={`gc-field kind-${kind}`}>
        <span className="gc-field-label">
          {label}
          {required && <span className="gc-req"> *</span>}
        </span>
        <span className={`gc-field-box${value ? '' : ' is-empty'}`}>
          <span>{value ?? placeholder}</span>
          {kind === 'select' && <ChevronDown size={14} />}
        </span>
        {hint && <span className="gc-field-hint">{hint}</span>}
      </label>
    </Focus>
  )
}

export function ConsoleButton({
  children,
  primary,
  focus,
  disabled,
  icon: Icon,
  small,
}: {
  children: ReactNode
  primary?: boolean
  focus?: boolean
  disabled?: boolean
  icon?: LucideIcon
  small?: boolean
}) {
  return (
    <Focus on={focus}>
      <span className={`gc-btn${primary ? ' is-primary' : ''}${disabled ? ' is-disabled' : ''}${small ? ' is-small' : ''}`}>
        {Icon && <Icon size={14} />}
        {children}
      </span>
    </Focus>
  )
}

export function ConsoleCheck({ label, checked, focus, radio }: { label: ReactNode; checked?: boolean; focus?: boolean; radio?: boolean }) {
  return (
    <Focus on={focus}>
      <span className={`gc-check${checked ? ' is-on' : ''}${radio ? ' is-radio' : ''}`}>
        <span className="gc-check-box">{checked && !radio && <Check size={11} />}</span>
        <span>{label}</span>
      </span>
    </Focus>
  )
}

export function ConsoleCard({ title, children, focus, tone, right }: { title?: ReactNode; children: ReactNode; focus?: boolean; tone?: Tone; right?: ReactNode }) {
  return (
    <Focus on={focus} style={{ display: 'block' }}>
      <div className="gc-card" data-tone={tone}>
        {title && (
          <div className="gc-card-title">
            {title}
            {right && <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{right}</span>}
          </div>
        )}
        <div className="gc-card-body">{children}</div>
      </div>
    </Focus>
  )
}

export function ConsoleTable({ cols, rows, hl }: { cols: string[]; rows: ReactNode[][]; hl?: number }) {
  return (
    <div className="gc-table-wrap">
      <table className="gc-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i === hl ? 'is-hl' : ''}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Stepper vertical de un asistente (p. ej. Autorizaciones → Configurar agente). */
export function ConsoleSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="gc-steps">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'is-done' : i === current ? 'is-current' : ''}>
          <span className="gc-step-n">{i < current ? <Check size={12} /> : i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

export function ConsoleBanner({ tone = 'user', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className="gc-banner" data-tone={tone}>
      {children}
    </div>
  )
}

export function ConsoleStatus({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <span className={`gc-status${ok ? ' is-ok' : ''}`}>
      <span className="gc-status-dot" />
      {children}
    </span>
  )
}

/** Nota al pie estándar para labs con consola simulada. */
export function ConsoleDisclaimer() {
  return (
    <span className="small muted">
      Pantalla <strong>simulada</strong>: reproduce la estructura y los nombres de la consola según la documentación de noviembre de 2026. La interfaz real
      cambia con frecuencia; usa esto como mapa, no como captura exacta.
    </span>
  )
}
